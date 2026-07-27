import 'server-only';
import {
    countColleges,
    countPublishedColleges,
    listRecentlyUpdatedColleges,
} from '@/db/repositories/college.repository';
import {
    countArticles,
    countDraftArticles,
    countPendingReviews,
    countPublishedArticles,
    listRecentlyUpdatedArticles,
} from '@/db/repositories/content.repository';
import { countPublishedCourses } from '@/db/repositories/course.repository';
import { countPublishedExams } from '@/db/repositories/exam.repository';
import { countLeads } from '@/db/repositories/lead.repository';
import { countActiveRedirects } from '@/db/repositories/site.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { logger } from '@/lib/logger';

/** Counts rendered as badges in the admin sidebar. A failure must not break the shell. */
export interface AdminBadgeCounts {
    newLeads: number;
    pendingReviews: number;
    draftContent: number;
}

async function safeCount(label: string, run: () => Promise<number>): Promise<number> {
    try {
        return await run();
    } catch (error) {
        logger.error('admin.count_failed', {
            label,
            error: error instanceof Error ? error.message : String(error),
        });
        return 0;
    }
}

export async function getAdminBadgeCounts(): Promise<AdminBadgeCounts> {
    const [newLeads, pendingReviews, draftContent] = await Promise.all([
        safeCount('leads.new', () => countLeads({ status: 'new' })),
        safeCount('reviews.pending', () => countPendingReviews()),
        safeCount('articles.draft', () => countDraftArticles()),
    ]);

    return { newLeads, pendingReviews, draftContent };
}

export interface RecentContentEntry {
    id: string;
    label: string;
    href: string;
    status: string;
    updatedAt: string;
}

/** Most recently edited colleges and articles, merged and sorted by edit time. */
export async function getRecentlyUpdatedContent(limit = 7): Promise<RecentContentEntry[]> {
    const [colleges, articles] = await Promise.all([
        listRecentlyUpdatedColleges(5).then(toPlain),
        listRecentlyUpdatedArticles(5).then(toPlain),
    ]);

    return [
        ...colleges.map((doc) => ({
            id: String(doc._id),
            label: doc.name,
            href: `/admin/colleges/${String(doc._id)}`,
            status: doc.status,
            updatedAt: new Date(doc.updatedAt).toISOString(),
        })),
        ...articles.map((doc) => ({
            id: String(doc._id),
            label: doc.title,
            href: `/admin/articles/${String(doc._id)}`,
            status: doc.status,
            updatedAt: new Date(doc.updatedAt).toISOString(),
        })),
    ]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit);
}

export interface SeoInventory {
    published: { colleges: number; courses: number; exams: number; articles: number };
    redirects: number;
    health: { missingCollegeSeo: number; missingArticleSeo: number; noIndexed: number };
}

/** Indexable inventory and metadata-health counters for the admin SEO screen. */
export async function getSeoInventory(): Promise<SeoInventory> {
    const missingDescription = { 'seo.description': { $in: [null, ''] } };

    const [colleges, courses, exams, articles, redirects, missingCollegeSeo, missingArticleSeo, noIndexed] =
        await Promise.all([
            countPublishedColleges(),
            countPublishedCourses(),
            countPublishedExams(),
            countPublishedArticles(),
            countActiveRedirects(),
            countColleges({ status: 'published', ...missingDescription }),
            countArticles({ status: 'published', ...missingDescription }),
            countColleges({ 'seo.noIndex': true }),
        ]);

    return {
        published: { colleges, courses, exams, articles },
        redirects,
        health: { missingCollegeSeo, missingArticleSeo, noIndexed },
    };
}
