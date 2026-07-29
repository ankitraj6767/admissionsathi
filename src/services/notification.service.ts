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
    /** Admin template key that produced this copy, for logging and provider APIs. */
    templateKey?: string;
    /** Provider-registered template name, e.g. an approved WhatsApp template. */
    providerTemplateName?: string;
    /** Positional parameters for the provider template, in `{{1}}`…`{{n}}` order. */
    templateParams?: string[];
    /** BCP-47-ish language code the provider template is registered under. */
    templateLanguage?: string;
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
            // Shows whether an admin template supplied the copy or the inline fallback
            // did — the quickest way to confirm a template edit took effect.
            templateKey: message.templateKey ?? '(inline fallback)',
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

/**
 * Builds the Meta Cloud API request body.
 *
 * Business-initiated WhatsApp messages — which is every message this platform
 * sends, since the student never messages us first — must use a template that Meta
 * has approved. A free-form `type: 'text'` send is only allowed inside the
 * 24-hour customer service window that opens when the user replies, so outside it
 * Meta rejects the call. That is why a template is preferred whenever the admin
 * record carries a `providerTemplateName`.
 *
 * Meta templates use positional placeholders (`{{1}}`, `{{2}}`), while ours are
 * named, so the parameter order comes from the template's `availableVariables`.
 * Keep that list in the same order as the placeholders registered with Meta.
 *
 * The plain-text branch remains for replies inside an open service window, and so
 * a misconfigured template does not mean no message at all.
 */
export function buildMetaPayload(message: OutboundMessage): Record<string, unknown> {
    const to = message.to.replace(/\D/g, '');

    if (message.providerTemplateName && message.templateParams?.length) {
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: message.providerTemplateName,
                language: { code: message.templateLanguage ?? 'en' },
                components: [
                    {
                        type: 'body',
                        parameters: message.templateParams.map((text) => ({ type: 'text', text })),
                    },
                ],
            },
        };
    }

    return {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message.body },
    };
}

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
                    body: JSON.stringify(buildMetaPayload(message)),
                },
            );
            if (!res.ok) return { ok: false, error: `WhatsApp responded ${res.status}` };
            return { ok: true };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'send failed' };
        }
    },
};

/**
 * Providers the env schema accepts but no adapter implements yet.
 *
 * Setting one of these looks like it enabled delivery and silently does not — the
 * worst kind of production failure, because the queue reports every message as
 * sent. Warn loudly instead of failing closed: an operator who has not finished
 * wiring a provider still wants the rest of the platform working.
 */
const UNIMPLEMENTED_PROVIDERS: Record<string, string[]> = {
    email: ['smtp'],
    whatsapp: ['gupshup'],
    sms: ['twilio', 'msg91'],
};

const warnedProviders = new Set<string>();

function warnIfUnimplemented(channel: string, provider: string): void {
    if (!UNIMPLEMENTED_PROVIDERS[channel]?.includes(provider)) return;
    if (warnedProviders.has(`${channel}:${provider}`)) return;

    warnedProviders.add(`${channel}:${provider}`);
    logger.warn('notification.provider_not_implemented', {
        channel,
        provider,
        message: `No adapter exists for ${provider}; ${channel} messages are being logged, not delivered.`,
    });
}

function adapterFor(channel: NotificationChannel): ChannelAdapter {
    if (channel === 'email') {
        warnIfUnimplemented('email', env.EMAIL_PROVIDER);
        return env.EMAIL_PROVIDER === 'resend' ? resendAdapter : consoleAdapter('email');
    }
    if (channel === 'whatsapp') {
        warnIfUnimplemented('whatsapp', env.WHATSAPP_PROVIDER);
        return env.WHATSAPP_PROVIDER === 'meta' ? metaWhatsappAdapter : consoleAdapter('whatsapp');
    }
    if (channel === 'sms') {
        warnIfUnimplemented('sms', env.SMS_PROVIDER);
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
    /** Fallback subject / heading, used when no active template matches `event`. */
    title: string;
    /** Fallback body, used when no active template matches `event`. */
    body: string;
    userId?: string;
    to?: string;
    actionUrl?: string;
    audience?: 'user' | 'staff' | 'broadcast';
    payload?: Record<string, unknown>;
    /**
     * Values for the `{{placeholders}}` in the admin-managed template whose key
     * equals `event`. Supplying these is what lets an editor change the wording of a
     * message without a deploy; the `title` / `body` above stay as the fallback for
     * when the template is missing, inactive or not yet approved.
     */
    variables?: Record<string, string>;
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
            payload: { ...(input.payload ?? {}), to: input.to, variables: input.variables },
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

/**
 * Placeholder keys in a template that the supplied variables cannot fill.
 *
 * A partially-rendered template is worse than no template: `<p>Hi {{name}}</p>`
 * with no `name` becomes "Hi ," which reads like a bug to the recipient. Callers
 * that forget to pass variables therefore fall back to their inline copy rather
 * than sending something half-filled.
 */
export function unresolvedPlaceholders(
    template: string,
    variables: Record<string, string>,
): string[] {
    const keys = Array.from(template.matchAll(/\{\{\s*(\w+)\s*\}\}/g), (m) => m[1]!);
    return Array.from(new Set(keys.filter((key) => !variables[key])));
}

export async function getEmailTemplate(key: string) {
    return findEmailTemplate(key);
}

export async function getWhatsappTemplate(key: string) {
    return findWhatsAppTemplate(key);
}

/** A message is retried up to four times before it is parked as failed. */
const MAX_ATTEMPTS = 4;

/** What the worker will actually send, after the template has had its say. */
interface ResolvedCopy {
    subject: string;
    body: string;
    /** Rendered HTML for email; undefined for text-only channels. */
    html?: string;
    /** Which source won, for the log line. */
    source: 'template' | 'inline';
    /** Provider-side template name, for WhatsApp's approved-template API. */
    providerTemplateName?: string;
    /** Values for the provider template's positional placeholders. */
    templateParams?: string[];
    templateLanguage?: string;
}

/**
 * Resolves the copy for one queued message.
 *
 * The admin-managed template for `event` wins when there is an active one, so an
 * editor can reword a message without a deploy. The queued `title` / `body` remain
 * the fallback — a missing, inactive or unapproved template must never mean a
 * student gets no message at all.
 *
 * A lookup failure is swallowed for the same reason: falling back to copy we
 * already hold is strictly better than failing the send.
 */
async function resolveCopy(notification: NotificationDoc): Promise<ResolvedCopy> {
    const fallback: ResolvedCopy = {
        subject: notification.title,
        body: notification.body,
        source: 'inline',
    };

    const variables =
        ((notification.payload as { variables?: Record<string, string> } | undefined)?.variables) ?? {};

    try {
        /** Refuses a template whose placeholders cannot all be filled. */
        const usable = (source: string): boolean => {
            const missing = unresolvedPlaceholders(source, variables);
            if (missing.length === 0) return true;

            logger.warn('notification.template_missing_variables', {
                event: notification.event,
                channel: notification.channel,
                missing,
            });
            return false;
        };

        if (notification.channel === 'email') {
            const template = await findEmailTemplate(notification.event);
            if (!template) return fallback;
            if (!usable(`${template.subject} ${template.bodyHtml}`)) return fallback;

            return {
                subject: renderTemplate(template.subject, variables) || fallback.subject,
                body:
                    (template.bodyText ? renderTemplate(template.bodyText, variables) : '') ||
                    fallback.body,
                html: renderTemplate(template.bodyHtml, variables) || undefined,
                source: 'template',
            };
        }

        if (notification.channel === 'whatsapp' || notification.channel === 'sms') {
            const template = await findWhatsAppTemplate(notification.event);
            // Only approved templates go out: WhatsApp rejects unapproved ones at the
            // provider, and sending unreviewed marketing copy is a compliance risk.
            if (!template || template.approvalStatus !== 'approved') return fallback;
            if (!usable(template.bodyText)) return fallback;

            return {
                subject: fallback.subject,
                body: renderTemplate(template.bodyText, variables) || fallback.body,
                source: 'template',
                providerTemplateName: template.providerTemplateName,
                // Positional order comes from `availableVariables`, which must mirror
                // the `{{1}}`…`{{n}}` order registered with the provider.
                templateParams: template.availableVariables.map((key) => variables[key] ?? ''),
                templateLanguage: template.language,
            };
        }
    } catch (error) {
        logger.warn('notification.template_lookup_failed', {
            event: notification.event,
            channel: notification.channel,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    return fallback;
}

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

            const copy = await resolveCopy(notification);

            const adapter = adapterFor(notification.channel as NotificationChannel);
            const result = await adapter.send({
                to,
                subject: copy.subject,
                body: copy.body,
                // Email gets the branded shell; SMS and WhatsApp stay plain text. A
                // template's HTML is placed inside the shell rather than replacing it,
                // so editors cannot accidentally ship an email without the footer and
                // unsubscribe link.
                html:
                    notification.channel === 'email'
                        ? renderEmailHtml({
                            title: copy.subject,
                            body: copy.html ?? copy.body,
                            action: notification.actionUrl
                                ? { label: 'Open Admission Sathi', url: notification.actionUrl }
                                : undefined,
                            showPreferencesLink: Boolean(notification.user),
                        })
                        : undefined,
                templateKey: copy.source === 'template' ? notification.event : undefined,
                providerTemplateName: copy.providerTemplateName,
                templateParams: copy.templateParams,
                templateLanguage: copy.templateLanguage,
                variables:
                    ((notification.payload as { variables?: Record<string, string> } | undefined)
                        ?.variables) ?? undefined,
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
