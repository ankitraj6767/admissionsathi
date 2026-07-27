import 'server-only';
import type { FilterQuery } from 'mongoose';
import {
    claimDueNotifications,
    createNotification,
    findEmailTemplate,
    findWhatsAppTemplate,
    listNotificationsForUser,
    markNotificationFailed,
    markNotificationReadForUser,
    markNotificationSent,
    notificationStateCounts,
    paginateNotifications,
} from '@/db/repositories/system.repository';
import { findUserContact } from '@/db/repositories/user.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { renderEmailHtml } from '@/emails/layout';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { NotificationChannel } from '@/config/constants';
import type { NotificationDoc } from '@/db/models/system.model';
import type { Paginated } from '@/types/common';

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
        await createNotification({
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
    return findEmailTemplate(key);
}

export async function getWhatsappTemplate(key: string) {
    return findWhatsAppTemplate(key);
}

/** A message is retried up to four times before it is parked as failed. */
const MAX_ATTEMPTS = 4;

/** Processes queued notifications. Called by the cron Route Handler. */
export async function processNotificationQueue(limit = 25): Promise<{
    processed: number;
    sent: number;
    failed: number;
}> {
    // Claiming marks the batch as processing and increments its attempt counter,
    // so a second worker run cannot pick the same rows up again.
    const due = await claimDueNotifications(limit, MAX_ATTEMPTS);

    let sent = 0;
    let failed = 0;

    for (const notification of due) {
        const retry = notification.attempts < MAX_ATTEMPTS;
        // exponential backoff
        const retryAt = new Date(Date.now() + 2 ** notification.attempts * 60_000);

        try {
            if (notification.channel === 'in_app') {
                await markNotificationSent(notification._id);
                sent += 1;
                continue;
            }

            let to = (notification.payload as { to?: string } | undefined)?.to;
            if (!to && notification.user) {
                const user = await findUserContact(notification.user);
                to = notification.channel === 'email' ? user?.email : user?.phone;
            }

            if (!to) throw new Error('No destination address for notification');

            const adapter = adapterFor(notification.channel as NotificationChannel);
            const result = await adapter.send({
                to,
                subject: notification.title,
                body: notification.body,
                // Email gets the branded shell; SMS and WhatsApp stay plain text.
                html:
                    notification.channel === 'email'
                        ? renderEmailHtml({
                            title: notification.title,
                            body: notification.body,
                            action: notification.actionUrl
                                ? { label: 'Open Admission Sathi', url: notification.actionUrl }
                                : undefined,
                            showPreferencesLink: Boolean(notification.user),
                        })
                        : undefined,
            });

            if (result.ok) {
                await markNotificationSent(notification._id);
                sent += 1;
            } else {
                await markNotificationFailed(notification._id, result.error, retry, retryAt);
                failed += 1;
            }
        } catch (error) {
            await markNotificationFailed(
                notification._id,
                error instanceof Error ? error.message : String(error),
                retry,
                retryAt,
            );
            failed += 1;
        }
    }

    return { processed: due.length, sent, failed };
}

/* ------------------------------------------------------------------ *
 * Admin queue screen
 * ------------------------------------------------------------------ */

export interface NotificationQueueQuery {
    state?: string;
    channel?: string;
    page?: string;
}

export interface NotificationQueueData {
    result: Paginated<NotificationDoc>;
    counts: { _id: string; count: number }[];
}

/**
 * Filtered queue page plus the per-state totals rendered as filter chips.
 * Counts are unfiltered on purpose so the chips keep showing every state
 * even while one of them is selected.
 */
export async function getNotificationQueue(
    query: NotificationQueueQuery,
): Promise<NotificationQueueData> {
    const filter: FilterQuery<NotificationDoc> = {};
    if (query.state) filter.state = query.state;
    if (query.channel) filter.channel = query.channel;

    const [result, counts] = await Promise.all([
        paginateNotifications({ filter, page: Number(query.page) || 1, pageSize: 25 }),
        notificationStateCounts(),
    ]);

    return { result: toPlain(result), counts };
}

export async function listUserNotifications(userId: string, limit = 20) {
    return listNotificationsForUser(userId, limit);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
    await markNotificationReadForUser(userId, notificationId);
}
