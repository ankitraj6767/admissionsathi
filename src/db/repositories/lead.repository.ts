import 'server-only';
import type { FilterQuery } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import { Lead, LeadActivity, type LeadActivityDoc, type LeadDoc } from '@/db/models/lead.model';
import { escapeRegex } from '@/lib/utils';
import { findLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10);
}

export async function generateLeadReference(): Promise<string> {
    await connectToDatabase();
    const now = new Date();
    const prefix = `AS${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await Lead.countDocuments({
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    }).exec();
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

export async function findLeadByIdempotencyKey(key: string): Promise<LeadDoc | null> {
    await connectToDatabase();
    return Lead.findOne({ idempotencyKey: key }).lean<LeadDoc>().exec();
}

/** Duplicate detection: same phone + same source within the window. */
export async function findRecentDuplicate(
    phoneNormalized: string,
    windowHours = 24,
): Promise<LeadDoc | null> {
    await connectToDatabase();
    const since = new Date(Date.now() - windowHours * 3600 * 1000);
    return Lead.findOne({ phoneNormalized, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .lean<LeadDoc>()
        .exec();
}

export async function createLead(data: Partial<LeadDoc>): Promise<LeadDoc> {
    await connectToDatabase();
    const created = await Lead.create(data);
    return created.toObject() as LeadDoc;
}

export async function addLeadActivity(data: Partial<LeadActivityDoc>): Promise<void> {
    await connectToDatabase();
    await LeadActivity.create(data);
}

export async function listLeadActivities(leadId: string, limit = 50): Promise<LeadActivityDoc[]> {
    return findLean<LeadActivityDoc>(
        LeadActivity,
        { lead: leadId },
        { sort: { createdAt: -1 }, limit },
    );
}

export interface LeadQuery {
    q?: string;
    status?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}

export function buildLeadFilter(query: LeadQuery): FilterQuery<LeadDoc> {
    const filter: FilterQuery<LeadDoc> = {};
    if (query.q) {
        const rx = new RegExp(escapeRegex(query.q), 'i');
        filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { reference: rx }];
    }
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.source) filter.source = query.source;
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.from || query.to) {
        filter.createdAt = {
            ...(query.from ? { $gte: new Date(query.from) } : {}),
            ...(query.to ? { $lte: new Date(`${query.to}T23:59:59`) } : {}),
        };
    }
    return filter;
}

export async function listLeads(query: LeadQuery): Promise<Paginated<LeadDoc>> {
    return paginate<LeadDoc>(Lead, {
        filter: buildLeadFilter(query),
        page: query.page,
        pageSize: query.pageSize ?? 20,
        sort: { createdAt: -1 },
    });
}

export async function getLeadById(id: string): Promise<LeadDoc | null> {
    await connectToDatabase();
    return Lead.findById(id).lean<LeadDoc>().exec();
}

export async function updateLead(id: string, update: Partial<LeadDoc>): Promise<LeadDoc | null> {
    await connectToDatabase();
    return Lead.findByIdAndUpdate(id, { $set: update }, { new: true }).lean<LeadDoc>().exec();
}

export async function bulkUpdateLeads(ids: string[], update: Partial<LeadDoc>): Promise<number> {
    await connectToDatabase();
    const res = await Lead.updateMany({ _id: { $in: ids } }, { $set: update }).exec();
    return res.modifiedCount;
}

export async function leadCountsByStatus(): Promise<Record<string, number>> {
    await connectToDatabase();
    const rows = await Lead.aggregate<{ _id: string; count: number }>([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

export async function leadCountsBySource(days = 30): Promise<{ source: string; count: number }[]> {
    await connectToDatabase();
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await Lead.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]).exec();
    return rows.map((r) => ({ source: r._id, count: r.count }));
}

export async function leadTrend(days = 14): Promise<{ date: string; count: number }[]> {
    await connectToDatabase();
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await Lead.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]).exec();
    return rows.map((r) => ({ date: r._id, count: r.count }));
}

export async function countLeads(filter: FilterQuery<LeadDoc> = {}): Promise<number> {
    await connectToDatabase();
    return Lead.countDocuments(filter).exec();
}
