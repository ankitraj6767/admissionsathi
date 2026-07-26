'use server';

import { revalidatePath } from 'next/cache';
import {
    bookingFeedbackSchema,
    bookingFormSchema,
    cancelBookingSchema,
    rescheduleBookingSchema,
} from '@/schemas/counselling.schema';
import {
    cancelBooking,
    createBookingFromForm,
    rescheduleBooking,
} from '@/services/counselling.service';
import { connectToDatabase } from '@/db/connect';
import { CounsellingBooking, Counsellor } from '@/db/models/counselling.model';
import { getCurrentActor } from '@/lib/auth/session';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import { AuthorizationError } from '@/lib/auth/rbac';
import type { ActionResult } from '@/types/common';

export interface BookingSuccess {
    reference: string;
    scheduledAt: string;
    counsellorName?: string;
    meetingLink?: string;
}

export async function createBookingAction(input: unknown): Promise<ActionResult<BookingSuccess>> {
    return runAction({ action: 'booking.create' }, async () => {
        const data = bookingFormSchema.parse(input);
        if (data.website) {
            return succeed({ reference: 'IGNORED', scheduledAt: new Date().toISOString() });
        }

        const limited = await rateLimit({ ...RATE_LIMITS.bookingCreate, identifier: data.phone });
        if (!limited.success) {
            return fail('Too many booking attempts. Please try again later.', 'RATE_LIMITED');
        }

        const scheduled = new Date(data.scheduledAt);
        if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
            return fail('Choose a slot in the future.', 'VALIDATION', { scheduledAt: ['Pick a valid slot'] });
        }

        const actor = await getCurrentActor();
        const result = await createBookingFromForm({ ...data, userId: actor?.id });

        revalidatePath('/dashboard/bookings');

        return succeed(
            {
                reference: result.reference,
                scheduledAt: result.scheduledAt.toISOString(),
                counsellorName: result.counsellorName,
                meetingLink: result.meetingLink,
            },
            'Session confirmed. Check your WhatsApp and email for details.',
        );
    });
}

export async function rescheduleBookingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'booking.reschedule' }, async () => {
        const data = rescheduleBookingSchema.parse(input);
        const actor = await getCurrentActor();

        await connectToDatabase();
        const booking = await CounsellingBooking.findById(data.bookingId).select('user').lean().exec();
        if (!booking) throw new NotFoundError('Booking not found.');

        const isOwner = actor && booking.user && String(booking.user) === actor.id;
        const isStaff = actor?.permissions.includes('counselling.manage');
        if (!isOwner && !isStaff) throw new AuthorizationError('You cannot modify this booking.');

        if (booking && (booking as { rescheduleCount?: number }).rescheduleCount !== undefined) {
            // guarded below by service
        }

        await rescheduleBooking(data.bookingId, new Date(data.scheduledAt), data.reason);
        revalidatePath('/dashboard/bookings');
        revalidatePath('/admin/counselling');
        return succeed({ id: data.bookingId }, 'Session rescheduled.');
    });
}

export async function cancelBookingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'booking.cancel' }, async () => {
        const data = cancelBookingSchema.parse(input);
        const actor = await getCurrentActor();

        await connectToDatabase();
        const booking = await CounsellingBooking.findById(data.bookingId).select('user').lean().exec();
        if (!booking) throw new NotFoundError('Booking not found.');

        const isOwner = actor && booking.user && String(booking.user) === actor.id;
        const isStaff = actor?.permissions.includes('counselling.manage');
        if (!isOwner && !isStaff) throw new AuthorizationError('You cannot cancel this booking.');

        await cancelBooking(data.bookingId, data.reason);
        revalidatePath('/dashboard/bookings');
        revalidatePath('/admin/counselling');
        return succeed({ id: data.bookingId }, 'Session cancelled.');
    });
}

export async function submitBookingFeedbackAction(
    input: unknown,
): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'booking.feedback' }, async () => {
        const data = bookingFeedbackSchema.parse(input);

        await connectToDatabase();
        const booking = await CounsellingBooking.findById(data.bookingId).exec();
        if (!booking) throw new NotFoundError('Booking not found.');

        booking.feedback = { rating: data.rating, comment: data.comment, submittedAt: new Date() };
        await booking.save();

        if (booking.counsellor) {
            const counsellor = await Counsellor.findById(booking.counsellor).exec();
            if (counsellor) {
                const count = counsellor.rating.count + 1;
                const average = (counsellor.rating.average * counsellor.rating.count + data.rating) / count;
                counsellor.rating = { average: Number(average.toFixed(2)), count };
                await counsellor.save();
            }
        }

        revalidatePath('/dashboard/bookings');
        return succeed({ id: data.bookingId }, 'Thanks for the feedback.');
    });
}
