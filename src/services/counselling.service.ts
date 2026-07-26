import 'server-only';
import { cache } from 'react';
import { connectToDatabase } from '@/db/connect';
import { CounsellingBooking, type CounsellorDoc } from '@/db/models/counselling.model';
import {
    bookedSlotsForDay,
    createBooking,
    generateBookingReference,
    getCounsellorBySlug,
    listCounsellors,
    pickCounsellorForAssignment,
    updateBooking,
} from '@/db/repositories/counsellor.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { addLeadActivity } from '@/db/repositories/lead.repository';
import { createLeadFromForm } from '@/services/lead.service';
import { queueNotification } from '@/services/notification.service';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { formatDate } from '@/lib/utils';
import type { BookingFormInput } from '@/schemas/counselling.schema';

export const getCounsellorDirectory = cached(
    async () => toPlain(await listCounsellors({ limit: 24, acceptingOnly: false })),
    ['counsellor-directory'],
    { tags: [CACHE_TAGS.counsellors], revalidate: CACHE_TTL.long },
);

export const getCounsellor = cache(async (slug: string) => {
    const counsellor = await getCounsellorBySlug(slug);
    return counsellor ? toPlain(counsellor) : null;
});

export interface SlotOption {
    iso: string;
    label: string;
    dayLabel: string;
}

/**
 * Builds the next `days` days of open slots for a counsellor (or the pooled
 * default availability when no counsellor is chosen).
 */
export async function getAvailableSlots(
    counsellor: CounsellorDoc | null,
    days = 7,
): Promise<SlotOption[]> {
    const availability = counsellor?.availability?.length
        ? counsellor.availability
        : [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
            ['10:00', '11:30', '15:00', '16:30', '18:00'].map((startTime) => ({
                weekday,
                startTime,
                endTime: startTime,
                isActive: true,
            })),
        );

    const slots: SlotOption[] = [];
    const now = new Date();

    for (let offset = 1; offset <= days; offset += 1) {
        const day = new Date(now);
        day.setDate(day.getDate() + offset);
        const weekday = day.getDay();

        const taken = counsellor
            ? (await bookedSlotsForDay(String(counsellor._id), day)).map((d) => d.getTime())
            : [];

        availability
            .filter((slot) => slot.isActive && slot.weekday === weekday)
            .forEach((slot) => {
                const [hour, minute] = slot.startTime.split(':').map(Number);
                const date = new Date(day);
                date.setHours(hour ?? 10, minute ?? 0, 0, 0);
                if (date.getTime() <= Date.now()) return;
                if (taken.includes(date.getTime())) return;

                slots.push({
                    iso: date.toISOString(),
                    label: date.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Kolkata',
                    }),
                    dayLabel: date.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'Asia/Kolkata',
                    }),
                });
            });
    }

    return slots.slice(0, 60);
}

export interface CreateBookingResult {
    reference: string;
    scheduledAt: Date;
    counsellorName?: string;
    meetingLink?: string;
}

/**
 * Creates a counselling booking together with its CRM lead.
 * Idempotent on `idempotencyKey`, so a double submit returns the first booking.
 */
export async function createBookingFromForm(
    input: BookingFormInput & { userId?: string },
): Promise<CreateBookingResult> {
    await connectToDatabase();

    const existing = await CounsellingBooking.findOne({ idempotencyKey: input.idempotencyKey })
        .lean()
        .exec();
    if (existing) {
        return {
            reference: existing.reference,
            scheduledAt: existing.scheduledAt ?? new Date(),
            counsellorName: existing.counsellorName,
            meetingLink: existing.meetingLink,
        };
    }

    const counsellor = input.counsellorSlug
        ? await getCounsellorBySlug(input.counsellorSlug)
        : await pickCounsellorForAssignment({ stateId: input.stateId || undefined });

    const { lead } = await createLeadFromForm({
        name: input.name,
        phone: input.phone,
        email: input.email || '',
        courseInterest: input.courseInterest || '',
        preferredTime: '',
        stateId: input.stateId || '',
        cityId: input.cityId || '',
        message: input.message || '',
        consent: input.consent,
        source: 'counselling_page',
        sourceDetail: input.type,
        collegeSlug: input.collegeSlug || undefined,
        examSlug: input.examSlug || undefined,
        idempotencyKey: `${input.idempotencyKey}-lead`,
        userId: input.userId,
    });

    const reference = await generateBookingReference();
    const scheduledAt = new Date(input.scheduledAt);

    const booking = await createBooking({
        reference,
        lead: lead._id,
        user: input.userId as never,
        counsellor: counsellor?._id,
        counsellorName: counsellor?.name,
        type: input.type,
        mode: input.mode,
        isPaid: false,
        paymentStatus: 'not_required',
        studentName: input.name,
        phone: input.phone,
        email: input.email || undefined,
        courseInterest: input.courseInterest || undefined,
        scheduledAt,
        durationMinutes: counsellor?.freeSessionMinutes ?? 30,
        status: 'confirmed',
        meetingLink: counsellor?.meetingLinkTemplate ?? 'https://meet.example.org/admission-sathi',
        source: 'website',
        idempotencyKey: input.idempotencyKey,
    });

    await addLeadActivity({
        lead: lead._id,
        type: 'booking',
        title: `Session booked for ${formatDate(scheduledAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
        detail: counsellor ? `Counsellor: ${counsellor.name}` : 'Awaiting counsellor assignment',
        isInternal: false,
    });

    const whenLabel = scheduledAt.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
    });

    if (input.email) {
        await queueNotification({
            event: 'booking.confirmed',
            channel: 'email',
            to: input.email,
            title: `Your counselling session is confirmed for ${whenLabel}`,
            body: `Hi ${input.name}, your ${input.mode.toLowerCase()} session${counsellor ? ` with ${counsellor.name}` : ''} is confirmed for ${whenLabel}. Reference ${reference}. Join link: ${booking.meetingLink}`,
            actionUrl: '/dashboard/bookings',
            dedupeKey: `booking-email-${booking._id}`,
        });
    }

    await queueNotification({
        event: 'booking.confirmed',
        channel: 'whatsapp',
        to: input.phone,
        title: 'Session confirmed',
        body: `Hi ${input.name}, your Admission Sathi counselling session is confirmed for ${whenLabel}. Ref ${reference}.`,
        dedupeKey: `booking-wa-${booking._id}`,
    });

    // Reminder 24h before the session.
    const reminderAt = new Date(scheduledAt.getTime() - 24 * 3600 * 1000);
    if (reminderAt.getTime() > Date.now()) {
        await queueNotification({
            event: 'booking.reminder',
            channel: 'whatsapp',
            to: input.phone,
            title: 'Session reminder',
            body: `Reminder: your Admission Sathi counselling session is on ${whenLabel}.`,
            scheduledFor: reminderAt,
            dedupeKey: `booking-reminder-${booking._id}`,
        });
    }

    await recordAudit({
        action: 'booking.create',
        entity: 'CounsellingBooking',
        entityId: String(booking._id),
        entityLabel: `${reference} — ${input.name}`,
        newValues: { type: input.type, counsellor: counsellor?.name, scheduledAt: scheduledAt.toISOString() },
    });

    logger.info('booking.created', { reference, counsellor: counsellor?.slug, type: input.type });

    return {
        reference,
        scheduledAt,
        counsellorName: counsellor?.name,
        meetingLink: booking.meetingLink,
    };
}

export async function rescheduleBooking(
    bookingId: string,
    scheduledAt: Date,
    reason?: string,
): Promise<void> {
    await connectToDatabase();
    const booking = await CounsellingBooking.findById(bookingId).exec();
    if (!booking) throw new Error('Booking not found');

    const previous = booking.scheduledAt;
    booking.rescheduledFrom = previous;
    booking.scheduledAt = scheduledAt;
    booking.rescheduleCount += 1;
    booking.status = 'rescheduled';
    if (reason) booking.internalNotes = `${booking.internalNotes ?? ''}\nRescheduled: ${reason}`.trim();
    await booking.save();

    await queueNotification({
        event: 'booking.rescheduled',
        channel: 'whatsapp',
        to: booking.phone,
        title: 'Session rescheduled',
        body: `Your Admission Sathi session has been moved to ${scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}.`,
    });
}

export async function cancelBooking(bookingId: string, reason: string): Promise<void> {
    await connectToDatabase();
    await updateBooking(bookingId, { status: 'cancelled', cancellationReason: reason });
}

export async function getBookingsForUser(userId: string) {
    await connectToDatabase();
    const rows = await CounsellingBooking.find({ user: userId })
        .sort({ scheduledAt: -1 })
        .limit(50)
        .lean()
        .exec();
    return toPlain(rows);
}

export async function getBookingByReference(reference: string) {
    await connectToDatabase();
    const booking = await CounsellingBooking.findOne({ reference: reference.toUpperCase() }).lean().exec();
    return booking ? toPlain(booking) : null;
}
