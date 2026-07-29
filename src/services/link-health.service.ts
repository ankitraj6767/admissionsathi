import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { Article, NewsPost, Resource } from '@/db/models/content.model';
import { NavigationItem, Redirect, StaticPage } from '@/db/models/site.model';
import { College } from '@/db/models/college.model';
import { Course, CourseCategory } from '@/db/models/course.model';
import { Exam } from '@/db/models/exam.model';
import { Predictor } from '@/db/models/predictor.model';
import { LoanProvider, Scholarship } from '@/db/models/finance.model';
import { Counsellor } from '@/db/models/counselling.model';
import { City, State } from '@/db/models/geo.model';
import {
    classifyHref,
    extractHrefs,
    normalizePath,
    resolvesInternally,
    type SlugSets,
} from '@/lib/seo/link-resolver';
import { CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * Internal link health.
 *
 * This is a monitoring structure, not a crawler: instead of issuing HTTP requests
 * it resolves every internal href we store against the routes the app serves and
 * the slugs that actually exist. That keeps a scan cheap enough to run on demand
 * from the admin console, and it catches the failure that matters most — an editor
 * linking to a page that was renamed, unpublished or never existed.
 *
 * External links are counted but not verified. Checking them needs outbound
 * requests, which belongs in a scheduled job rather than a page render.
 */

interface SlugModel {
    find: (filter: Record<string, unknown>) => {
        select: (fields: string) => {
            limit: (n: number) => { lean: () => { exec: () => Promise<unknown> } };
        };
    };
}

async function readSlugs(model: SlugModel, filter: Record<string, unknown>): Promise<Set<string>> {
    const rows = (await model.find(filter).select('slug').limit(20_000).lean().exec()) as {
        slug?: string;
    }[];
    return new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));
}

async function loadSlugSets(): Promise<SlugSets> {
    await connectToDatabase();

    const published = { status: 'published', isDeleted: { $ne: true } };
    const active = { status: 'active', isDeleted: { $ne: true } };

    const [
        college,
        course,
        courseCategory,
        exam,
        predictor,
        article,
        news,
        resource,
        scholarship,
        loanProvider,
        counsellor,
        state,
        city,
        page,
    ] = await Promise.all([
        readSlugs(College as unknown as SlugModel, published),
        readSlugs(Course as unknown as SlugModel, published),
        readSlugs(CourseCategory as unknown as SlugModel, { status: 'active' }),
        readSlugs(Exam as unknown as SlugModel, published),
        readSlugs(Predictor as unknown as SlugModel, published),
        readSlugs(Article as unknown as SlugModel, published),
        readSlugs(NewsPost as unknown as SlugModel, published),
        readSlugs(Resource as unknown as SlugModel, published),
        readSlugs(Scholarship as unknown as SlugModel, published),
        readSlugs(LoanProvider as unknown as SlugModel, published),
        readSlugs(Counsellor as unknown as SlugModel, active),
        readSlugs(State as unknown as SlugModel, { status: 'active' }),
        readSlugs(City as unknown as SlugModel, { status: 'active' }),
        readSlugs(StaticPage as unknown as SlugModel, { status: 'published' }),
    ]);

    return {
        college,
        course,
        courseCategory,
        exam,
        predictor,
        article,
        news,
        resource,
        scholarship,
        loanProvider,
        counsellor,
        state,
        city,
        page,
    };
}

export interface BrokenLink {
    href: string;
    sourceType: 'article' | 'news' | 'navigation' | 'redirect' | 'page';
    sourceLabel: string;
    /** Admin URL where the link can be fixed. */
    editHref: string;
}

export interface LinkHealthReport {
    scannedAt: string;
    internalChecked: number;
    externalSkipped: number;
    brokenCount: number;
    broken: BrokenLink[];
    /** True when the scan hit its per-collection cap and may have missed rows. */
    truncated: boolean;
}

const SCAN_LIMIT = 500;
const REPORT_LIMIT = 200;

async function runScan(): Promise<LinkHealthReport> {
    const slugs = await loadSlugSets();

    const broken: BrokenLink[] = [];
    let internalChecked = 0;
    let externalSkipped = 0;

    const check = (href: string, source: Omit<BrokenLink, 'href'>) => {
        const kind = classifyHref(href);
        if (kind === 'empty' || kind === 'anchor') return;

        if (kind === 'external') {
            externalSkipped += 1;
            return;
        }
        if (kind === 'relative') {
            broken.push({ href: href.trim(), ...source });
            return;
        }

        internalChecked += 1;
        if (!resolvesInternally(normalizePath(href.trim()), slugs)) {
            broken.push({ href: href.trim(), ...source });
        }
    };

    const [articles, news, navItems, redirects, pages] = await Promise.all([
        Article.find({ status: 'published', isDeleted: { $ne: true } })
            .select('title slug contentHtml')
            .sort({ updatedAt: -1 })
            .limit(SCAN_LIMIT)
            .lean<{ _id: unknown; title: string; contentHtml?: string }[]>()
            .exec(),
        NewsPost.find({ status: 'published', isDeleted: { $ne: true } })
            .select('title slug contentHtml externalUrl')
            .sort({ updatedAt: -1 })
            .limit(SCAN_LIMIT)
            .lean<{ _id: unknown; title: string; contentHtml?: string; externalUrl?: string }[]>()
            .exec(),
        NavigationItem.find({ status: 'active' })
            .select('label url menuKey')
            .limit(SCAN_LIMIT)
            .lean<{ _id: unknown; label: string; url: string; menuKey: string }[]>()
            .exec(),
        Redirect.find({ status: 'active', isRegex: { $ne: true } })
            .select('source destination')
            .limit(SCAN_LIMIT)
            .lean<{ _id: unknown; source: string; destination: string }[]>()
            .exec(),
        StaticPage.find({ status: 'published' })
            .select('title slug contentHtml')
            .limit(SCAN_LIMIT)
            .lean<{ _id: unknown; title: string; contentHtml?: string }[]>()
            .exec(),
    ]);

    for (const article of articles) {
        for (const href of extractHrefs(article.contentHtml)) {
            check(href, {
                sourceType: 'article',
                sourceLabel: article.title,
                editHref: `/admin/articles/${String(article._id)}`,
            });
        }
    }

    for (const post of news) {
        const hrefs = [...extractHrefs(post.contentHtml), ...(post.externalUrl ? [post.externalUrl] : [])];
        for (const href of hrefs) {
            check(href, {
                sourceType: 'news',
                sourceLabel: post.title,
                editHref: `/admin/news/${String(post._id)}`,
            });
        }
    }

    for (const item of navItems) {
        check(item.url, {
            sourceType: 'navigation',
            sourceLabel: `${item.menuKey}: ${item.label}`,
            editHref: '/admin/navigation',
        });
    }

    for (const redirect of redirects) {
        check(redirect.destination, {
            sourceType: 'redirect',
            sourceLabel: `${redirect.source} → ${redirect.destination}`,
            editHref: `/admin/redirects/${String(redirect._id)}`,
        });
    }

    for (const page of pages) {
        for (const href of extractHrefs(page.contentHtml)) {
            check(href, {
                sourceType: 'page',
                sourceLabel: page.title,
                editHref: `/admin/pages/${String(page._id)}`,
            });
        }
    }

    const truncated = [articles, news, navItems, redirects, pages].some(
        (rows) => rows.length >= SCAN_LIMIT,
    );

    if (broken.length > 0) {
        logger.warn('link_health.broken_links_found', { count: broken.length });
    }

    return {
        scannedAt: new Date().toISOString(),
        internalChecked,
        externalSkipped,
        brokenCount: broken.length,
        // The rendered list is capped; `brokenCount` still reflects the full scan.
        broken: broken.slice(0, REPORT_LIMIT),
        truncated,
    };
}

/**
 * Cached so re-opening the SEO screen does not re-scan. The report is advisory, so
 * an hour-stale view is fine — and the screen offers a forced rescan.
 */
export const getLinkHealthReport = cached(runScan, ['link-health'], {
    revalidate: CACHE_TTL.long,
    tags: ['link-health'],
});

export async function scanLinkHealthNow(): Promise<LinkHealthReport> {
    return runScan();
}
