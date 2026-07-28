import 'server-only';
import { Types } from 'mongoose';
import {
    aggregateEventCounts,
    aggregateEventTrend,
    aggregateTopPages,
    aggregateTopSearchTerms,
    aggregateZeroResultTerms,
} from '@/db/repositories/analytics.repository';
import { countSearchQueries, createAnalyticsEvent } from '@/db/repositories/system.repository';
import {
    countPublishedColleges,
    incrementCollegeViewCount,
} from '@/db/repositories/college.repository';
import {
    countPublishedCourses,
    incrementCourseViewCount,
} from '@/db/repositories/course.repository';
import { countPublishedExams, incrementExamViewCount } from '@/db/repositories/exam.repository';
import {
    countDraftArticles,
    countPendingReviews,
    countPublishedArticles,
    incrementArticleViewCount,
} from '@/db/repositories/content.repository';
import { countUsers } from '@/db/repositories/user.repository';
import { countLeads } from '@/db/repositories/lead.repository';
import { countBookings, countCounsellors } from '@/db/repositories/counsellor.repository';
import { countPredictorSessions } from '@/db/repositories/predictor.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
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
        await createAnalyticsEvent({
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
        if (entity === 'college') await incrementCollegeViewCount(id);
        else if (entity === 'course') await incrementCourseViewCount(id);
        else if (entity === 'exam') await incrementExamViewCount(id);
        else await incrementArticleViewCount(id);
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

async function computeDashboardOverview(): Promise<DashboardOverview> {
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
        countUsers({ isDeleted: { $ne: true } }),
        countPublishedColleges(),
        countPublishedCourses(),
        countPublishedExams(),
        countPublishedArticles(),
        countCounsellors({ status: 'active' }),
        countLeads({}),
        countLeads({ createdAt: { $gte: startOfToday() } }),
        countLeads({ createdAt: { $gte: daysAgo(7) } }),
        countLeads({ status: 'new' }),
        countLeads({ status: 'converted' }),
        countBookings({}),
        countBookings({
            scheduledAt: { $gte: new Date() },
            status: { $in: ['requested', 'confirmed', 'rescheduled'] },
        }),
        countBookings({ status: 'completed' }),
        countPredictorSessions({}),
        countPredictorSessions({ createdAt: { $gte: daysAgo(7) } }),
        countSearchQueries({}),
        countSearchQueries({ zeroResults: true }),
        countSearchQueries({ createdAt: { $gte: daysAgo(7) } }),
        countPendingReviews(),
        countDraftArticles(),
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

/**
 * Dashboard tiles, cached for a minute.
 *
 * The uncached version is 22 counts and aggregations in one wave, and it is loaded
 * by both `/admin` and `/admin/analytics` — the two pages a staff user lands on
 * most. A 60s TTL keeps the numbers current enough to be useful while taking the
 * whole wave off the critical path of a navigation. The payload is entirely
 * numeric, so nothing is lost to the cache's JSON serialisation.
 */
export const getDashboardOverview = cached(computeDashboardOverview, ['admin-dashboard-overview'], {
    tags: [CACHE_TAGS.adminCounts],
    revalidate: CACHE_TTL.short,
});

export async function getEventTrend(
    eventName: string,
    days = 14,
): Promise<{ date: string; count: number }[]> {
    const rows = await aggregateEventTrend(eventName, daysAgo(days));
    return rows.map((r) => ({ date: r._id, count: r.count }));
}

export async function getTopPages(days = 30, limit = 10) {
    return aggregateTopPages(daysAgo(days), limit);
}

export async function getTopSearchTerms(days = 30, limit = 10) {
    return aggregateTopSearchTerms(daysAgo(days), limit);
}

export async function getZeroResultTerms(days = 30, limit = 10) {
    return aggregateZeroResultTerms(daysAgo(days), limit);
}

export async function getEventCounts(days = 30): Promise<{ name: string; count: number }[]> {
    const rows = await aggregateEventCounts(daysAgo(days), 25);
    return rows.map((r) => ({ name: r._id, count: r.count }));
}
