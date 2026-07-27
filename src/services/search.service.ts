import 'server-only';
import { connectToDatabase } from '@/db/connect';
import type { SearchQueryDoc, SearchSynonymDoc } from '@/db/models/system.model';
import { toPlain } from '@/db/repositories/base.repository';
import {
    createSearchQuery,
    findSynonymsForTerm,
    listAllSynonyms,
    listRecentSearchQueries,
    listTrendingSearchTerms,
} from '@/db/repositories/system.repository';
import { getTopSearchTerms, getZeroResultTerms } from '@/services/analytics.service';
import { collegeAutocomplete } from '@/db/repositories/college.repository';
import { courseAutocomplete } from '@/db/repositories/course.repository';
import { examAutocomplete } from '@/db/repositories/exam.repository';
import { articleAutocomplete } from '@/db/repositories/content.repository';
import { cityAutocomplete, stateAutocomplete } from '@/db/repositories/geo.repository';
import { listPredictors } from '@/db/repositories/predictor.repository';
import { scholarshipAutocomplete } from '@/db/repositories/finance.repository';
import { formatCompactINR } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { SearchEntityType } from '@/config/constants';

export interface SearchHit {
    type: SearchEntityType;
    id: string;
    label: string;
    sublabel?: string;
    url: string;
    meta?: string;
    badge?: string;
    promoted?: boolean;
}

export interface SearchGroup {
    type: SearchEntityType;
    label: string;
    hits: SearchHit[];
}

export interface SearchResponse {
    term: string;
    groups: SearchGroup[];
    total: number;
    tookMs: number;
}

const GROUP_LABELS: Record<SearchEntityType, string> = {
    college: 'Colleges',
    course: 'Courses',
    exam: 'Exams',
    article: 'Articles',
    scholarship: 'Scholarships',
    predictor: 'Predictors',
    city: 'Cities',
    state: 'States',
};

/**
 * Expands the query with admin-managed synonyms and returns promoted results.
 * This is the seam that lets us swap the MongoDB implementation for Atlas Search
 * later without touching callers.
 */
async function resolveSynonyms(term: string): Promise<{ terms: string[]; promoted: SearchHit[] }> {
    const normalized = term.trim().toLowerCase();
    const rows = await findSynonymsForTerm(normalized, 5).catch(() => [] as SearchSynonymDoc[]);

    const terms = new Set<string>([normalized]);
    const promoted: SearchHit[] = [];

    rows.forEach((row) => {
        terms.add(row.term);
        row.synonyms.forEach((s) => terms.add(s.toLowerCase()));
        if (row.promotedUrl && row.promotedLabel && row.promotedEntityType) {
            promoted.push({
                type: row.promotedEntityType as SearchEntityType,
                id: String(row._id),
                label: row.promotedLabel,
                url: row.promotedUrl,
                promoted: true,
                badge: 'Suggested',
            });
        }
    });

    return { terms: Array.from(terms), promoted };
}

async function searchScholarships(term: string, limit = 3): Promise<SearchHit[]> {
    const rows = await scholarshipAutocomplete(term, limit);
    return rows.map((s) => ({
        type: 'scholarship' as const,
        id: String(s._id),
        label: s.name,
        sublabel: s.provider,
        url: `/scholarships/${s.slug}`,
        meta: s.amountMax ? `Up to ${formatCompactINR(s.amountMax)}` : undefined,
    }));
}

/** Global search used by the header dialog, hero search card and /search page. */
export async function globalSearch(
    rawTerm: string,
    options: { limitPerGroup?: number; types?: SearchEntityType[] } = {},
): Promise<SearchResponse> {
    const started = Date.now();
    const term = rawTerm.trim().slice(0, 80);

    if (term.length < 2) {
        return { term, groups: [], total: 0, tookMs: 0 };
    }

    await connectToDatabase();
    const limit = options.limitPerGroup ?? 5;
    const types = options.types;
    const want = (t: SearchEntityType) => !types || types.includes(t);

    const { terms, promoted } = await resolveSynonyms(term);
    const primary = terms[0] ?? term;

    const [colleges, courses, exams, articles, scholarships, cities, states, predictors] =
        await Promise.all([
            want('college') ? collegeAutocomplete(primary, limit) : Promise.resolve([]),
            want('course') ? courseAutocomplete(primary, limit) : Promise.resolve([]),
            want('exam') ? examAutocomplete(primary, limit) : Promise.resolve([]),
            want('article') ? articleAutocomplete(primary, 3) : Promise.resolve([]),
            want('scholarship') ? searchScholarships(primary, 3) : Promise.resolve([]),
            want('city') ? cityAutocomplete(primary, 3) : Promise.resolve([]),
            want('state') ? stateAutocomplete(primary, 2) : Promise.resolve([]),
            want('predictor') ? listPredictors({ limit: 24 }) : Promise.resolve([]),
        ]);

    const groups: SearchGroup[] = [];

    if (colleges.length) {
        groups.push({
            type: 'college',
            label: GROUP_LABELS.college,
            hits: colleges.map((c) => ({
                type: 'college' as const,
                id: String(c._id),
                label: c.name,
                sublabel: [c.cityName, c.stateName].filter(Boolean).join(', '),
                url: `/colleges/${c.slug}`,
                meta: c.rating?.overall ? `★ ${c.rating.overall.toFixed(1)}` : c.ownership,
            })),
        });
    }

    if (courses.length) {
        groups.push({
            type: 'course',
            label: GROUP_LABELS.course,
            hits: courses.map((c) => ({
                type: 'course' as const,
                id: String(c._id),
                label: c.name,
                sublabel: c.categoryName,
                url: `/courses/${c.slug}`,
                meta: c.level,
            })),
        });
    }

    if (exams.length) {
        groups.push({
            type: 'exam',
            label: GROUP_LABELS.exam,
            hits: exams.map((e) => ({
                type: 'exam' as const,
                id: String(e._id),
                label: `${e.shortName} — ${e.name}`,
                sublabel: e.category,
                url: `/exams/${e.slug}`,
                meta: e.examYear ? String(e.examYear) : undefined,
            })),
        });
    }

    const matchedPredictors = predictors
        .filter((p) => p.name.toLowerCase().includes(primary) || (p.examShortName ?? '').toLowerCase().includes(primary))
        .slice(0, 3);

    if (matchedPredictors.length) {
        groups.push({
            type: 'predictor',
            label: GROUP_LABELS.predictor,
            hits: matchedPredictors.map((p) => ({
                type: 'predictor' as const,
                id: String(p._id),
                label: p.name,
                sublabel: p.subtitle,
                url: `/predictors/${p.slug}`,
            })),
        });
    }

    if (scholarships.length) {
        groups.push({ type: 'scholarship', label: GROUP_LABELS.scholarship, hits: scholarships });
    }

    if (articles.length) {
        groups.push({
            type: 'article',
            label: GROUP_LABELS.article,
            hits: articles.map((a) => ({
                type: 'article' as const,
                id: String(a._id),
                label: a.title,
                sublabel: a.category,
                url: `/articles/${a.slug}`,
            })),
        });
    }

    if (cities.length) {
        groups.push({
            type: 'city',
            label: GROUP_LABELS.city,
            hits: cities.map((c) => ({
                type: 'city' as const,
                id: String(c._id),
                label: `Colleges in ${c.name}`,
                sublabel: c.stateName,
                url: `/colleges/city/${c.slug}`,
            })),
        });
    }

    if (states.length) {
        groups.push({
            type: 'state',
            label: GROUP_LABELS.state,
            hits: states.map((s) => ({
                type: 'state' as const,
                id: String(s._id),
                label: `Colleges in ${s.name}`,
                url: `/colleges/state/${s.slug}`,
            })),
        });
    }

    if (promoted.length) {
        groups.unshift({ type: promoted[0]!.type, label: 'Suggested', hits: promoted });
    }

    const total = groups.reduce((sum, g) => sum + g.hits.length, 0);

    return { term, groups, total, tookMs: Date.now() - started };
}

/** Fire-and-forget analytics write; zero-result terms are flagged for the admin report. */
export async function logSearchQuery(input: {
    term: string;
    resultCount: number;
    userId?: string;
    anonymousId?: string;
    scope?: string;
}): Promise<void> {
    try {
        await createSearchQuery({
            term: input.term.slice(0, 200),
            normalizedTerm: input.term.trim().toLowerCase().slice(0, 200),
            resultCount: input.resultCount,
            zeroResults: input.resultCount === 0,
            user: input.userId,
            anonymousId: input.anonymousId,
            scope: input.scope,
        });
    } catch (error) {
        logger.warn('search.log_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export interface SearchInsights {
    topTerms: { _id: string; count: number; zero: number }[];
    zeroTerms: { _id: string; count: number }[];
    recent: SearchQueryDoc[];
    synonyms: SearchSynonymDoc[];
}

/**
 * Everything the admin search screen needs in one call. Synonyms are read
 * unfiltered (not just active ones) so drafted rules stay visible to admins.
 */
export async function getSearchInsights(): Promise<SearchInsights> {
    const [topTerms, zeroTerms, recent, synonyms] = await Promise.all([
        getTopSearchTerms(30, 15),
        getZeroResultTerms(30, 15),
        listRecentSearchQueries(20),
        listAllSynonyms(50),
    ]);

    return { topTerms, zeroTerms, recent: toPlain(recent), synonyms: toPlain(synonyms) };
}

/** Trending searches for the empty state of the search box. */
export async function getTrendingSearches(limit = 6): Promise<string[]> {
    try {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const rows = await listTrendingSearchTerms(since, limit);
        return rows.map((r) => r._id).filter(Boolean);
    } catch {
        return [];
    }
}
