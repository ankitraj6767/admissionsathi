import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { CounsellingBooking } from '@/db/models/counselling.model';
import { Notification } from '@/db/models/system.model';
import { cancelBooking, rescheduleBooking } from '@/services/counselling.service';

/**
 * The booking lifecycle must tell the student what happened to their session.
 * A silently cancelled or moved booking means someone turns up to a dead link.
 */
async function seedBooking(overrides: Record<string, unknown> = {}) {
    return CounsellingBooking.create({
        reference: `BK-${new Types.ObjectId()}`.slice(0, 20),
        studentName: 'Aarav Sharma',
        phone: '9876500001',
        email: 'aarav@example.com',
        type: 'career',
        mode: 'Video Call',
        scheduledAt: new Date(Date.now() + 3 * 86_400_000),
        durationMinutes: 30,
        status: 'confirmed',
        counsellorName: 'Neha Kulkarni',
        ...overrides,
    });
}

describe('cancelBooking', () => {
    it('marks the booking cancelled with its reason', async () => {
        const booking = await seedBooking();

        await cancelBooking(String(booking._id), 'Student found a seat elsewhere');

        const updated = await CounsellingBooking.findById(booking._id).lean();
        expect(updated?.status).toBe('cancelled');
        expect(updated?.cancellationReason).toBe('Student found a seat elsewhere');
    });

    it('notifies the student on WhatsApp and email', async () => {
        const booking = await seedBooking();

        await cancelBooking(String(booking._id), 'Counsellor unavailable');

        const rows = await Notification.find({ event: 'booking.cancelled' }).lean();
        expect(rows.map((r) => r.channel).sort()).toEqual(['email', 'whatsapp']);
    });

    it('skips the email when the booking has no address', async () => {
        const booking = await seedBooking({ email: undefined });

        await cancelBooking(String(booking._id), 'No longer needed');

        const rows = await Notification.find({ event: 'booking.cancelled' }).lean();
        expect(rows.map((r) => r.channel)).toEqual(['whatsapp']);
    });

    it('passes the template variables the cancellation templates expect', async () => {
        const booking = await seedBooking();

        await cancelBooking(String(booking._id), 'Counsellor unavailable');

        const row = await Notification.findOne({ event: 'booking.cancelled', channel: 'whatsapp' }).lean();
        expect((row?.payload as { variables?: Record<string, string> })?.variables).toEqual({
            name: 'Aarav Sharma',
            reference: booking.reference,
            reason: 'Counsellor unavailable',
        });
    });

    it('rejects an unknown booking rather than silently doing nothing', async () => {
        await expect(cancelBooking(String(new Types.ObjectId()), 'x')).rejects.toThrow(/not found/i);
    });
});

describe('rescheduleBooking', () => {
    it('moves the session, records the previous slot and notifies the student', async () => {
        const booking = await seedBooking();
        const next = new Date(Date.now() + 6 * 86_400_000);

        await rescheduleBooking(String(booking._id), next, 'Student requested a later slot');

        const updated = await CounsellingBooking.findById(booking._id).lean();
        expect(updated?.status).toBe('rescheduled');
        expect(updated?.rescheduledFrom).toBeInstanceOf(Date);
        expect(updated?.rescheduleCount).toBe(1);

        const row = await Notification.findOne({ event: 'booking.rescheduled' }).lean();
        const variables = (row?.payload as { variables?: Record<string, string> })?.variables;
        expect(variables?.name).toBe('Aarav Sharma');
        expect(variables?.scheduledAt).toBeTruthy();
    });
});
