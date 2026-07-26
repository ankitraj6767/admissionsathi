import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { EmailTemplate, Notification, WhatsAppTemplate } from '@/db/models/system.model';
import { User } from '@/db/models/user.model';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { NotificationChannel } from '@/config/constants';

/* ------------------------------------------------------------------ *
 * Channel adapters
 * Each provider implements the same interface, chosen by env config.
 * `console` is the default so development never sends real messages.
 * ------------------------------------------------------------------ */

export interface OutboundMessage {
    to: string;
    subject?: string;
    body: string;
    html?: string;
    templateKey?: string;
    variables?: Record<string, string>;
}

interface ChannelAdapter {
    id: string;
    send(message: OutboundMessage): Promise<{ ok: boolean; providerId?: string; error?: string }>;
}

const consoleAdapter = (channel: string): ChannelAdapter => ({
    id: `console:${channel}`,
    async send(message) {
        logger.info('notification.console_send', {
            channel,
            to: message.to,
            subject: message.subject,
            preview: message.body.slice(0, 160),
        });
        return { ok: true, providerId: 'console' };
    },
});

const resendAdapter: ChannelAdapter = {
    id: 'resend',
    async send(message) {
        if (!env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY missing' };
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: env.EMAIL_FROM,
                    to: [message.to],
                    subject: message.subject ?? 'Admission Sathi',
                    html: message.html ?? `<p>${message.body}</p>`,
                    text: message.body,
                }),
            });
            if (!res.ok) return { ok: false, error: `Resend responded ${res.status}` };
            const data = (await res.json()) as { id?: string };
            return { ok: true, providerId: data.id };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'send failed' };
        }
    },
};

const metaWhatsappAdapter: ChannelAdapter = {
    id: 'meta-whatsapp',
    async send(message) {
        if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
            return { ok: false, error: 'WhatsApp credentials missing' };
        }
        try {
            const res = await fetch(
                `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: message.to.replace(/\D/g, ''),
                        type: 'text',
                        text: { body: message.body },
                    }),
                },
            );
            if (!res.ok) return { ok: false, error: `WhatsApp responded ${res.status}` };
            return { ok: true };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'send failed' };
        }
    },
};

function adapterFor(channel: NotificationChannel): ChannelAdapter {
    if (channel === 'email') {
        return env.EMAIL_PROVIDER === 'resend' ? resendAdapter : consoleAdapter('email');
    }
    if (channel === 'whatsapp') {
        return env.WHATSAPP_PROVIDER === 'meta' ? metaWhatsappAdapter : consoleAdapter('whatsapp');
    }
    if (channel === 'sms') {
        return consoleAdapter('sms');
    }
    return consoleAdapter('in_app');
}

/* ------------------------------------------------------------------ *
 * Queue + worker
 * User requests only enqueue; delivery happens in the background job
 * (`/api/cron/notifications`) so a slow provider never blocks a form.
 * ------------------------------------------------------------------ */

export interface QueueInput {
    event: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    userId?: string;
    to?: string;
    actionUrl?: string;
    audience?: 'user' | 'staff' | 'broadcast';
    payload?: Record<string, unknown>;
    scheduledFor?: Date;
    dedupeKey?: string;
}

export async function queueNotification(input: QueueInput): Promise<void> {
    try {
        await connectToDatabase();
        await Notification.create({
            user: input.userId,
            audience: input.audience ?? (input.userId ? 'user' : 'broadcast'),
            event: input.event,
            channel: input.channel,
            title: input.title,
            body: input.body,
            actionUrl: input.actionUrl,
            payload: { ...(input.payload ?? {}), to: input.to },
            state: 'queued',
            scheduledFor: input.scheduledFor ?? new Date(),
            dedupeKey: input.dedupeKey,
        });
    } catch (error) {
        const duplicate = (error as { code?: number }).code === 11000;
        if (!duplicate) {
            logger.error('notification.queue_failed', {
                event: input.event,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

export async function queueMany(inputs: QueueInput[]): Promise<void> {
    await Promise.all(inputs.map(queueNotification));
}

/** Renders `{{variable}}` placeholders in a template body. */
export function renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => variables[key] ?? '');
}

export async function getEmailTemplate(key: string) {
    await connectToDatabase();
    return EmailTemplate.findOne({ key, status: 'active' }).lean().exec();
}

export async function getWhatsappTemplate(key: string) {
    await connectToDatabase();
    return WhatsAppTemplate.findOne({ key, status: 'active' }).lean().exec();
}

/** Processes queued notifications. Called by the cron Route Handler. */
export async function processNotificationQueue(limit = 25): Promise<{
    processed: number;
    sent: number;
    failed: number;
}> {
    await connectToDatabase();

    const due = await Notification.find({
        state: 'queued',
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: 4 },
    })
        .sort({ scheduledFor: 1 })
        .limit(limit)
        .exec();

    let sent = 0;
    let failed = 0;

    for (const notification of due) {
        notification.state = 'processing';
        notification.attempts += 1;
        await notification.save();

        try {
            if (notification.channel === 'in_app') {
                notification.state = 'sent';
                notification.sentAt = new Date();
                await notification.save();
                sent += 1;
                continue;
            }

            let to = (notification.payload as { to?: string } | undefined)?.to;
            if (!to && notification.user) {
                const user = await User.findById(notification.user).select('email phone').lean().exec();
                to = notification.channel === 'email' ? user?.email : user?.phone;
            }

            if (!to) throw new Error('No destination address for notification');

            const adapter = adapterFor(notification.channel as NotificationChannel);
            const result = await adapter.send({
                to,
                subject: notification.title,
                body: notification.body,
            });

            if (result.ok) {
                notification.state = 'sent';
                notification.sentAt = new Date();
                sent += 1;
            } else {
                notification.state = notification.attempts >= 4 ? 'failed' : 'queued';
                notification.lastError = result.error;
                // exponential backoff
                notification.scheduledFor = new Date(Date.now() + 2 ** notification.attempts * 60_000);
                failed += 1;
            }
            await notification.save();
        } catch (error) {
            notification.state = notification.attempts >= 4 ? 'failed' : 'queued';
            notification.lastError = error instanceof Error ? error.message : String(error);
            notification.scheduledFor = new Date(Date.now() + 2 ** notification.attempts * 60_000);
            await notification.save();
            failed += 1;
        }
    }

    return { processed: due.length, sent, failed };
}

export async function listUserNotifications(userId: string, limit = 20) {
    await connectToDatabase();
    return Notification.find({ user: userId, channel: 'in_app' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
    await connectToDatabase();
    await Notification.updateOne(
        { _id: notificationId, user: userId },
        { $set: { readAt: new Date() } },
    ).exec();
}
