import 'server-only';
import { Types } from 'mongoose';
import { findCollegeNameBySlug } from '@/db/repositories/college.repository';
import { findCourseBySlugOrId } from '@/db/repositories/course.repository';
import { findExamNameBySlug } from '@/db/repositories/exam.repository';
import { findCityNameById, findStateNameById } from '@/db/repositories/geo.repository';
import {
    addLeadActivity,
    createLead,
    findLeadByIdempotencyKey,
    findRecentDuplicate,
    generateLeadReference,
    normalizePhone,
} from '@/db/repositories/lead.repository';
import {
    incrementCounsellorLoad,
    pickCounsellorForAssignment,
} from '@/db/repositories/counsellor.repository';
import { getSettings, readBool, readString } from '@/services/settings.service';
import { queueNotification } from '@/services/notification.service';
import { recordAudit } from '@/services/audit.service';
import { clientFingerprint } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { LeadFormInput } from '@/schemas/lead.schema';
import type { LeadDoc } from '@/db/models/lead.model';

/** Safely converts an id string coming from a form into an ObjectId. */
function toObjectId(value?: string): Types.ObjectId | undefined {
    if (!value || !Types.ObjectId.isValid(value)) return undefined;
    return new Types.ObjectId(value);
}

export interface CreateLeadResult {
    lead: LeadDoc;
    isDuplicate: boolean;
    assignedCounsellorName?: string;
}

/** Simple, explainable lead score used to prioritise follow-ups. */
function scoreLead(input: {
    hasEmail: boolean;
    hasCourse: boolean;
    hasState: boolean;
    source: string;
    preferredTime?: string;
}): number {
    let score = 40;
    if (input.hasEmail) score += 15;
    if (input.hasCourse) score += 15;
    if (input.hasState) score += 10;
    if (input.preferredTime && input.preferredTime !== 'anytime') score += 5;
    if (['predictor_submission', 'brochure_download', 'college_enquiry'].includes(input.source)) {
        score += 15;
    }
    return Math.min(100, score);
}

/**
 * Creates a lead from any public form.
 * Handles idempotency, duplicate detection, counsellor assignment, activity
 * timeline and acknowledgement notifications.
 */
export async function createLeadFromForm(
    input: LeadFormInput & { userId?: string },
): Promise<CreateLeadResult> {
    // 1. Idempotency — a resubmitted form returns the original lead.
    const existing = await findLeadByIdempotencyKey(input.idempotencyKey);
    if (existing) {
        return { lead: existing, isDuplicate: false };
    }

    const settings = await getSettings();
    const { ipHash, userAgent } = await clientFingerprint();
    const phoneNormalized = normalizePhone(input.phone);

    // 2. Resolve human-readable denormalised names for the CRM.
    const [state, city, course, college, exam] = await Promise.all([
        input.stateId ? findStateNameById(input.stateId) : null,
        input.cityId ? findCityNameById(input.cityId) : null,
        // The course field may carry a slug or an id; an unparsable id casts to a
        // Mongo error, which is not worth failing the whole submission for.
        input.courseInterest
            ? findCourseBySlugOrId(input.courseInterest).catch(() => null)
            : null,
        input.collegeSlug ? findCollegeNameBySlug(input.collegeSlug) : null,
        input.examSlug ? findExamNameBySlug(input.examSlug) : null,
    ]);

    // 3. Duplicate detection (same phone in the last 24h).
    const duplicate = await findRecentDuplicate(phoneNormalized, 24);

    // 4. Counsellor assignment.
    const autoAssign = readBool(settings, 'features.leadAutoAssign', true);
    const counsellor = autoAssign
        ? await pickCounsellorForAssignment({ stateId: input.stateId || undefined })
        : null;

    const reference = await generateLeadReference();

    const lead = await createLead({
        reference,
        name: input.name,
        phone: input.phone,
        phoneNormalized,
        email: input.email || undefined,
        state: toObjectId(input.stateId),
        stateName: state?.name,
        city: toObjectId(input.cityId),
        cityName: city?.name,
        courseInterest: course?._id,
        courseInterestName: course?.name ?? (input.courseInterest || undefined),
        collegeInterest: college?._id,
        collegeInterestName: college?.name,
        examInterest: exam?._id,
        examInterestName: exam?.name,
        message: input.message || undefined,
        preferredTimeLabel: input.preferredTime || undefined,
        source: input.source,
        sourceDetail: input.sourceDetail,
        campaign: input.utm?.campaign,
        utm: input.utm,
        assignedTo: counsellor?._id,
        assignedToName: counsellor?.name,
        assignedAt: counsellor ? new Date() : undefined,
        status: 'new',
        priority: duplicate ? 'high' : 'medium',
        score: scoreLead({
            hasEmail: Boolean(input.email),
            hasCourse: Boolean(input.courseInterest),
            hasState: Boolean(input.stateId),
            source: input.source,
            preferredTime: input.preferredTime,
        }),
        consent: {
            given: input.consent,
            givenAt: new Date(),
            ipHash,
            textVersion: readString(settings, 'legal.consentVersion', 'v1'),
        },
        duplicateOf: duplicate?._id,
        isDuplicate: Boolean(duplicate),
        idempotencyKey: input.idempotencyKey,
        userAgent: userAgent.slice(0, 400),
    });

    if (counsellor) {
        await incrementCounsellorLoad(String(counsellor._id), 1);
    }

    await addLeadActivity({
        lead: lead._id,
        type: 'created',
        title: `Lead captured from ${input.source.replace(/_/g, ' ')}`,
        detail: input.message,
        isInternal: true,
    });

    if (counsellor) {
        await addLeadActivity({
            lead: lead._id,
            type: 'assignment',
            title: `Assigned to ${counsellor.name}`,
            toValue: counsellor.name,
            isInternal: true,
        });
    }

    // 5. Acknowledgements (queued, never blocking the response).
    const supportPhone = readString(settings, 'contact.phone', '');

    // Variables for the admin-managed `lead.acknowledgement` templates. The inline
    // title/body below stay as the fallback for when no active template exists.
    const ackVariables = {
        name: input.name,
        reference,
        counsellorName: counsellor?.name ?? 'A counsellor',
        supportPhone,
    };

    if (input.email) {
        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: input.email,
            title: 'We received your counselling request',
            body: `Hi ${input.name}, thanks for reaching out to Admission Sathi. Your reference number is ${reference}. ${counsellor ? `${counsellor.name} will contact you shortly.` : 'A counsellor will contact you shortly.'
                } Need help sooner? Call ${supportPhone}.`,
            actionUrl: '/counselling',
            variables: ackVariables,
            dedupeKey: `lead-ack-email-${lead._id}`,
        });
    }

    await queueNotification({
        event: 'lead.acknowledgement',
        channel: 'whatsapp',
        to: input.phone,
        title: 'Admission Sathi',
        body: `Hi ${input.name}, your free counselling request (${reference}) is confirmed. Our counsellor will call you soon. — Admission Sathi`,
        variables: ackVariables,
        dedupeKey: `lead-ack-wa-${lead._id}`,
    });

    await queueNotification({
        event: 'lead.new_internal',
        channel: 'in_app',
        audience: 'staff',
        title: `New lead: ${input.name}`,
        body: `${input.phone} • ${input.courseInterest || 'No course selected'} • ${input.source}`,
        actionUrl: `/admin/leads/${lead._id}`,
        dedupeKey: `lead-internal-${lead._id}`,
    });

    await recordAudit({
        action: 'lead.create',
        entity: 'Lead',
        entityId: String(lead._id),
        entityLabel: `${reference} — ${input.name}`,
        newValues: { source: input.source, assignedTo: counsellor?.name, isDuplicate: Boolean(duplicate) },
    });

    logger.info('lead.created', {
        leadId: String(lead._id),
        reference,
        source: input.source,
        duplicate: Boolean(duplicate),
    });

    return {
        lead,
        isDuplicate: Boolean(duplicate),
        assignedCounsellorName: counsellor?.name,
    };
}
