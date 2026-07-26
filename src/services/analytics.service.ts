import 'server-only';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import { AnalyticsEvent, SearchQuery } from '@/db/models/system.model';
import { Lead } from '@/db/models/lead.model';
import { College } from '@/db/models/college.model';
import { Course } from '@/db/models/course.model';
import { Exam } from '@/db/models/exam.model';
import { User } from '@/db/models/user.model';
import { PredictionSession } from '@/db/models/predictor.model';
import { CounsellingBooking } from '@/db/models/counselling.model';
import { Article } from '@/db/models/content.model';
import { Review } from '@/db/models/content.model';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { logger } from '@/lib/logger';

export interface RecordEventInput {
    name: string;
    path?: string;
    entityType?: string;
    entityId?: string;
    entitySlug?: string;
    referrer?: string;
    anonymousId?: string;
    sessionId?: string;
    device?: 'mobile' | 'tablet' | 'desktop';
    properties?: Record<string, unknown>;
    userId?: string;
}

export async function recordAnalyticsEvent(input: RecordEventInput): Promise<void> {
    try {
        await connectToDatabase();
        await AnalyticsEvent.create({
            name: input.name,
            path: input.path,
            entityType: input.entityType,
            entityId:
                input.entityId && Types.ObjectId.isValid(input.entityId)
                    ? new Types.ObjectId(input.entityId)
                    : undefined,
            entitySlug: input.entitySlug,
            referrer: input.referrer,
            user: input.userId && Types.ObjectId.isValid(input.userId) ? input.userId : undefined,
            anonymousId: input.anonymousId,
            sessionId: input.sessionId,
            device: input.device,
            properties: input.properties,
        });
    } catch (error) {
        logger.warn('analytics.record_failed', {
            name: input.name,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/** Increments a view counter without blocking the render. */
export async function incrementViewCount(
    entity: 'college' | 'course' | 'exam' | 'article',
    id: string,
): Promise<void> {
    try {
        await connectToDatabase();
        const filter = { _id: id };
        const update = { $inc: { viewCount: 1 } };
        if (entity === 'college') await College.updateOne(filter, update).exec();
        else if (entity === 'course') await Course.updateOne(filter, update).exec();
        else if (entity === 'exam') await Exam.updateOne(filter, update).exec();
        else await Article.updateOne(filter, update).exec();
    } catch {
        /* counters are best-effort */
    }
}

/* ------------------------------------------------------------------ *
 * Admin dashboard aggregations
 * ------------------------------------------------------------------ */

export interface DashboardOverview {
    totals: {
        users: number;
        colleges: number;
        courses: number;
        exams: number;
        articles: number;
        counsellors: number;
    };
    leads: {
        total: number;
        today: number;
        thisWeek: number;
        new: number;
        converted: number;
        conversionRate: number;
    };
    bookings: { total: number; upcoming: number; completed: number };
    predictor: { sessions: number; last7Days: number };
    search: { total: number; zeroResults: number; last7Days: number };
    pendingApprovals: { reviews: number; draftContent: number };
}

const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export async function getDashboardOverview(): Promise<DashboardOverview> {
    await connectToDatabase();
    const { Counsellor } = await import('@/db/models/counselling.model');

    const [
        users,
        colleges,
        courses,
        exams,
        articles,
        counsellors,
        leadsTotal,
        leadsToday,
        leadsWeek,
        leadsNew,
        leadsConverted,
        bookingsTotal,
        bookingsUpcoming,
        bookingsCompleted,
        predictorSessions,
        predictorRecent,
        searchTotal,
        searchZero,
        searchRecent,
        pendingReviews,
        draftArticles,
    ] = await Promise.all([
        User.countDocuments({ isDeleted: { $ne: true } }).exec(),
        College.countDocuments({ status: 'published' }).exec(),
        Course.countDocuments({ status: 'published' }).exec(),
        Exam.countDocuments({ status: 'published' }).exec(),
        Article.countDocuments({ status: 'published' }).exec(),
        Counsellor.countDocuments({ status: 'active' }).exec(),
        Lead.countDocuments({}).exec(),
        Lead.countDocuments({ createdAt: { $gte: startOfToday() } }).exec(),
        Lead.countDocuments({ createdAt: { $gte: daysAgo(7) } }).exec(),
        Lead.countDocuments({ status: 'new' }).exec(),
        Lead.countDocuments({ status: 'converted' }).exec(),
        CounsellingBooking.countDocuments({}).exec(),
        CounsellingBooking.countDocuments({
            scheduledAt: { $gte: new Date() },
            status: { $in: ['requested', 'confirmed', 'rescheduled'] },
        }).exec(),
        CounsellingBooking.countDocuments({ status: 'completed' }).exec(),
        PredictionSession.countDocuments({}).exec(),
        PredictionSession.countDocuments({ createdAt: { $gte: daysAgo(7) } }).exec(),
        SearchQuery.countDocuments({}).exec(),
        SearchQuery.countDocuments({ zeroResults: true }).exec(),
        SearchQuery.countDocuments({ createdAt: { $gte: daysAgo(7) } }).exec(),
        Review.countDocuments({ moderationStatus: 'pending' }).exec(),
        Article.countDocuments({ status: { $in: ['draft', 'in_review'] } }).exec(),
    ]);

    return {
        totals: { users, colleges, courses, exams, articles, counsellors },
        leads: {
            total: leadsTotal,
            today: leadsToday,
            thisWeek: leadsWeek,
            new: leadsNew,
            converted: leadsConverted,
            conversionRate: leadsTotal ? Number(((leadsConverted / leadsTotal) * 100).toFixed(1)) : 0,
        },
        bookings: { total: bookingsTotal, upcoming: bookingsUpcoming, completed: bookingsCompleted },
        predictor: { sessions: predictorSessions, last7Days: predictorRecent },
        search: { total: searchTotal, zeroResults: searchZero, last7Days: searchRecent },
        pendingApprovals: { reviews: pendingReviews, draftContent: draftArticles },
    };
}

export async function getEventTrend(
    eventName: string,
    days = 14,
): Promise<{ date: string; count: number }[]> {
    await connectToDatabase();
    const rows = await AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: { name: eventName, createdAt: { $gte: daysAgo(days) } } },
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

export async function getTopPages(days = 30, limit = 10) {
    await connectToDatabase();
    return AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: { name: ANALYTICS_EVENTS.pageView, createdAt: { $gte: daysAgo(days) } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]).exec();
}

export async function getTopSearchTerms(days = 30, limit = 10) {
    await connectToDatabase();
    return SearchQuery.aggregate<{ _id: string; count: number; zero: number }>([
        { $match: { createdAt: { $gte: daysAgo(days) } } },
        {
            $group: {
                _id: '$normalizedTerm',
                count: { $sum: 1 },
                zero: { $sum: { $cond: ['$zeroResults', 1, 0] } },
            },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]).exec();
}

export async function getZeroResultTerms(days = 30, limit = 10) {
    await connectToDatabase();
    return SearchQuery.aggregate<{ _id: string; count: number }>([
        { $match: { zeroResults: true, createdAt: { $gte: daysAgo(days) } } },
        { $group: { _id: '$normalizedTerm', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]).exec();
}

export async function getEventCounts(days = 30): Promise<{ name: string; count: number }[]> {
    await connectToDatabase();
    const rows = await AnalyticsEvent.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: daysAgo(days) } } },
        { $group: { _id: '$name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
    ]).exec();
    return rows.map((r) => ({ name: r._id, count: r.count }));
}
