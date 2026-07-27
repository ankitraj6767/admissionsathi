import 'server-only';
import { User } from '@/db/models/user.model';
import { aggregateLean } from './base.repository';

/**
 * Account totals per role key. Lives apart from `user.repository` so the
 * analytics-style aggregations stay separate from account CRUD.
 */
export async function aggregateUserCountsByRole(): Promise<{ _id: string; count: number }[]> {
    return aggregateLean<{ _id: string; count: number }>(User, [
        { $match: { isDeleted: { $ne: true } } },
        { $unwind: '$roles' },
        { $group: { _id: '$roles', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
}

/** New-account trend for the analytics dashboard. */
export async function aggregateUserSignupTrend(days: number): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await aggregateLean<{ _id: string; count: number }>(User, [
        { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return rows.map((row) => ({ date: row._id, count: row.count }));
}
