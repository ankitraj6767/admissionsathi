import 'server-only';
import { connectToDatabase } from '@/db/connect';
import {
    CounsellingBooking,
    Counsellor,
    type CounsellingBookingDoc,
    type CounsellorDoc,
} from '@/db/models/counselling.model';
import { findLean, findOneLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

export async function listCounsellors(options?: {
    limit?: number;
    featuredOnly?: boolean;
    acceptingOnly?: boolean;
}): Promise<CounsellorDoc[]> {
    return findLean<CounsellorDoc>(
        Counsellor,
        {
            status: 'active',
            ...(options?.featuredOnly ? { isFeatured: true } : {}),
            ...(options?.acceptingOnly ? { isAcceptingLeads: true } : {}),
        },
        { sort: { displayOrder: 1, 'rating.average': -1 }, limit: options?.limit ?? 24 },
    );
}

export async function getCounsellorBySlug(slug: string): Promise<CounsellorDoc | null> {
    return findOneLean<CounsellorDoc>(Counsellor, { slug, status: 'active' });
}

export async function getCounsellorById(id: string): Promise<CounsellorDoc | null> {
    return findOneLean<CounsellorDoc>(Counsellor, { _id: id });
}

/**
 * Round-robin-ish assignment: picks the accepting counsellor with the fewest
 * active leads, preferring a category/state match when provided.
 */
export async function pickCounsellorForAssignment(hint?: {
    categoryId?: string;
    stateId?: string;
}): Promise<CounsellorDoc | null> {
    await connectToDatabase();

    if (hint?.categoryId || hint?.stateId) {
        const preferred = await Counsellor.findOne({
            status: 'active',
            isAcceptingLeads: true,
            $or: [
                ...(hint.categoryId ? [{ focusCategories: hint.categoryId }] : []),
                ...(hint.stateId ? [{ focusStates: hint.stateId }] : []),
            ],
        })
            .sort({ activeLeadCount: 1 })
            .lean<CounsellorDoc>()
            .exec();
        if (preferred) return preferred;
    }

    return Counsellor.findOne({ status: 'active', isAcceptingLeads: true })
        .sort({ activeLeadCount: 1 })
        .lean<CounsellorDoc>()
        .exec();
}

export async function incrementCounsellorLoad(id: string, delta = 1): Promise<void> {
    await connectToDatabase();
    await Counsellor.updateOne({ _id: id }, { $inc: { activeLeadCount: delta } }).exec();
}

/* ------------------------------- bookings -------------------------------- */

export async function generateBookingReference(): Promise<string> {
    await connectToDatabase();
    const now = new Date();
    const prefix = `BK${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await CounsellingBooking.countDocuments({
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    }).exec();
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

export async function createBooking(
    data: Partial<CounsellingBookingDoc>,
): Promise<CounsellingBookingDoc> {
    await connectToDatabase();
    const created = await CounsellingBooking.create(data);
    return created.toObject() as CounsellingBookingDoc;
}

export async function listBookings(query: {
    status?: string;
    counsellorId?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}): Promise<Paginated<CounsellingBookingDoc>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.counsellorId) filter.counsellor = query.counsellorId;
    if (query.userId) filter.user = query.userId;
    if (query.from || query.to) {
        filter.scheduledAt = {
            ...(query.from ? { $gte: new Date(query.from) } : {}),
            ...(query.to ? { $lte: new Date(`${query.to}T23:59:59`) } : {}),
        };
    }

    return paginate<CounsellingBookingDoc>(CounsellingBooking, {
        filter,
        page: query.page,
        pageSize: query.pageSize ?? 20,
        sort: { createdAt: -1 },
    });
}

export async function getBookingById(id: string): Promise<CounsellingBookingDoc | null> {
    return findOneLean<CounsellingBookingDoc>(CounsellingBooking, { _id: id });
}

export async function updateBooking(
    id: string,
    update: Partial<CounsellingBookingDoc>,
): Promise<CounsellingBookingDoc | null> {
    await connectToDatabase();
    return CounsellingBooking.findByIdAndUpdate(id, { $set: update }, { new: true })
        .lean<CounsellingBookingDoc>()
        .exec();
}

export async function countBookings(filter: Record<string, unknown> = {}): Promise<number> {
    await connectToDatabase();
    return CounsellingBooking.countDocuments(filter).exec();
}

/** Slots already taken for a counsellor on a given day. */
export async function bookedSlotsForDay(counsellorId: string, day: Date): Promise<Date[]> {
    await connectToDatabase();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const rows = await CounsellingBooking.find({
        counsellor: counsellorId,
        scheduledAt: { $gte: start, $lte: end },
        status: { $in: ['requested', 'confirmed', 'rescheduled'] },
    })
        .select('scheduledAt')
        .lean<{ scheduledAt: Date }[]>()
        .exec();

    return rows.map((r) => r.scheduledAt);
}
