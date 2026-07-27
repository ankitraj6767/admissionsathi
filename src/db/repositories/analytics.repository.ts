import 'server-only';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { aggregateAnalytics, aggregateSearchQueries } from './system.repository';

/**
 * Reporting pipelines for the admin analytics screens.
 *
 * They live here rather than in the service so the pipelines stay next to the
 * collections they read, and so every aggregation goes through the shared
 * `aggregateLean` seam (which also short-circuits during a credential-less build).
 */

/** A grouped count row: `_id` is the grouping key. */
export interface CountedRow {
    _id: string;
    count: number;
}

/** A search-term row, with how many of those searches returned nothing. */
export interface SearchTermRow {
    _id: string;
    count: number;
    zero: number;
}

/** Daily event counts in IST, so a "day" matches what an Indian admin expects. */
export async function aggregateEventTrend(eventName: string, since: Date): Promise<CountedRow[]> {
    return aggregateAnalytics<CountedRow>([
        { $match: { name: eventName, createdAt: { $gte: since } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
}

/** Most viewed paths, from page-view events only. */
export async function aggregateTopPages(since: Date, limit: number): Promise<CountedRow[]> {
    return aggregateAnalytics<CountedRow>([
        { $match: { name: ANALYTICS_EVENTS.pageView, createdAt: { $gte: since } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]);
}

/** Event volume by name — the "what are people doing" table. */
export async function aggregateEventCounts(since: Date, limit: number): Promise<CountedRow[]> {
    return aggregateAnalytics<CountedRow>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]);
}

/** Top searched terms with their zero-result share, for the search insights screen. */
export async function aggregateTopSearchTerms(since: Date, limit: number): Promise<SearchTermRow[]> {
    return aggregateSearchQueries<SearchTermRow>([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: '$normalizedTerm',
                count: { $sum: 1 },
                zero: { $sum: { $cond: ['$zeroResults', 1, 0] } },
            },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]);
}

/** Terms that returned nothing — the content-gap report. */
export async function aggregateZeroResultTerms(since: Date, limit: number): Promise<CountedRow[]> {
    return aggregateSearchQueries<CountedRow>([
        { $match: { zeroResults: true, createdAt: { $gte: since } } },
        { $group: { _id: '$normalizedTerm', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]);
}
