'use server';

import { connectToDatabase } from '@/db/connect';
import { ContactSubmission } from '@/db/models/lead.model';
import { contactFormSchema, contactSubjectLabel } from '@/schemas/contact.schema';
import { getCurrentActor } from '@/lib/auth/session';
import { RATE_LIMITS, clientFingerprint, rateLimit } from '@/lib/rate-limit';
import { fail, runAction, succeed } from '@/lib/action-helpers';
import { logger } from '@/lib/logger';
import { recordAudit } from '@/services/audit.service';
import { queueNotification } from '@/services/notification.service';
import { getSettings, readString } from '@/services/settings.service';
import type { ActionResult } from '@/types/common';

/**
 * Public contact form submission.
 * Everything that protects the support inbox — Zod validation, honeypot,
 * time-trap and rate limiting — runs here; the client form is never trusted.
 */
export async function submitContactAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'contact.submit' }, async () => {
        const data = contactFormSchema.parse(input);

        // Honeypot: silent success so bots do not learn the rule.
        if (data.website) {
            logger.warn('contact.honeypot_triggered', { subject: data.subject });
            return succeed({ id: 'ignored' }, 'Thanks! Our team will reply shortly.');
        }
        if (data.elapsedMs !== undefined && data.elapsedMs < 1200) {
            return fail('Please take a moment to review the form and submit again.', 'VALIDATION');
        }

        const limited = await rateLimit({ ...RATE_LIMITS.contactForm, identifier: data.email });
        if (!limited.success) {
            return fail(
                `Too many messages from this email. Please try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s).`,
                'RATE_LIMITED',
            );
        }

        const [settings, actor, fingerprint] = await Promise.all([
            getSettings(),
            getCurrentActor(),
            clientFingerprint(),
        ]);

        const subjectLabel = contactSubjectLabel(data.subject);

        await connectToDatabase();
        const submission = await ContactSubmission.create({
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            subject: subjectLabel,
            message: data.message,
            handled: false,
        });

        const id = String(submission._id);
        const supportPhone = readString(settings, 'contact.phone', '');

        // Acknowledgement to the submitter — queued, never blocking the response.
        await queueNotification({
            event: 'contact.acknowledgement',
            channel: 'email',
            to: data.email,
            title: 'We received your message',
            body: `Hi ${data.name}, thanks for writing to Admission Sathi about "${subjectLabel}". Our team replies within one working day.${supportPhone ? ` Need help sooner? Call ${supportPhone}.` : ''}`,
            actionUrl: '/contact',
            dedupeKey: `contact-ack-${id}`,
        });

        await queueNotification({
            event: 'contact.new_internal',
            channel: 'in_app',
            audience: 'staff',
            title: `New contact message: ${subjectLabel}`,
            body: `${data.name} • ${data.email}${data.phone ? ` • ${data.phone}` : ''}`,
            actionUrl: `/admin/contact-submissions/${id}`,
            dedupeKey: `contact-internal-${id}`,
        });

        await recordAudit({
            actor,
            action: 'contact.create',
            entity: 'ContactSubmission',
            entityId: id,
            entityLabel: `${subjectLabel} — ${data.name}`,
            newValues: { subject: subjectLabel, hasPhone: Boolean(data.phone), ipHash: fingerprint.ipHash },
        });

        return succeed({ id }, 'Message sent. Our team will reply within one working day.');
    });
}
