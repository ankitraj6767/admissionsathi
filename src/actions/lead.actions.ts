'use server';

import { leadFormSchema, newsletterSchema } from '@/schemas/lead.schema';
import { createLeadFromForm } from '@/services/lead.service';
import { getCurrentActor } from '@/lib/auth/session';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { fail, runAction, succeed } from '@/lib/action-helpers';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/types/common';

export interface LeadSubmitData {
    reference: string;
    counsellorName?: string;
    message: string;
}

/**
 * Public counselling / enquiry form submission.
 * Validation, spam checks, rate limiting and duplicate protection all run here —
 * the client form is never trusted.
 */
export async function submitLeadAction(input: unknown): Promise<ActionResult<LeadSubmitData>> {
    return runAction({ action: 'lead.submit' }, async () => {
        const data = leadFormSchema.parse(input);

        // Honeypot + time-trap: silent success so bots do not learn the rule.
        if (data.website) {
            logger.warn('lead.honeypot_triggered', { source: data.source });
            return succeed({
                reference: 'AS000000',
                message: 'Thanks! Our team will contact you shortly.',
            });
        }
        if (data.elapsedMs !== undefined && data.elapsedMs < 1200) {
            return fail('Please take a moment to review the form and submit again.', 'VALIDATION');
        }

        const limited = await rateLimit({ ...RATE_LIMITS.leadCreate, identifier: data.phone });
        if (!limited.success) {
            return fail(
                `Too many requests from this number. Please try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s).`,
                'RATE_LIMITED',
            );
        }

        const actor = await getCurrentActor();
        const result = await createLeadFromForm({ ...data, userId: actor?.id });

        return succeed(
            {
                reference: result.lead.reference,
                counsellorName: result.assignedCounsellorName,
                message: result.assignedCounsellorName
                    ? `Request confirmed. ${result.assignedCounsellorName} will call you shortly.`
                    : 'Request confirmed. A counsellor will call you shortly.',
            },
            'Counselling request submitted',
        );
    });
}

export async function subscribeNewsletterAction(
    input: unknown,
): Promise<ActionResult<{ email: string }>> {
    return runAction({ action: 'newsletter.subscribe' }, async () => {
        const data = newsletterSchema.parse(input);

        const limited = await rateLimit({ ...RATE_LIMITS.newsletter, identifier: data.email });
        if (!limited.success) {
            return fail('Too many attempts. Please try again later.', 'RATE_LIMITED');
        }

        const { createLead, findNewsletterSubscription, generateLeadReference, normalizePhone } =
            await import('@/db/repositories/lead.repository');

        // Subscribing twice is not an error — report success without a second row.
        const existing = await findNewsletterSubscription(data.email);
        if (existing) {
            return succeed({ email: data.email }, 'You are already subscribed.');
        }

        await createLead({
            reference: await generateLeadReference(),
            name: data.name || data.email.split('@')[0],
            phone: '0000000000',
            phoneNormalized: normalizePhone('0000000000'),
            email: data.email,
            source: 'newsletter',
            status: 'new',
            priority: 'low',
            consent: { given: true, givenAt: new Date() },
        });

        return succeed({ email: data.email }, 'Subscribed. Watch your inbox for admission alerts.');
    });
}
