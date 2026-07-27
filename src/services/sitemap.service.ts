import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { COLLEGE_TAB_SEGMENTS } from '@/config/constants';
import {
    distinctOfferedCourseIds,
    listCollegeSitemapSlugs,
} from '@/db/repositories/college.repository';
import {
    listArticleSitemapSlugs,
    listNewsSitemapSlugs,
    listResourceSitemapSlugs,
} from '@/db/repositories/content.repository';
import { listCounsellorSitemapSlugs } from '@/db/repositories/counsellor.repository';
import {
    listCourseCategorySitemapSlugs,
    listCourseSitemapSlugs,
    listCourseSlugsByIds,
} from '@/db/repositories/course.repository';
import { listExamSitemapSlugs } from '@/db/repositories/exam.repository';
import {
    listLoanProviderSitemapSlugs,
    listScholarshipSitemapSlugs,
} from '@/db/repositories/finance.repository';
import { listCitySitemapSlugs, listStateSitemapSlugs } from '@/db/repositories/geo.repository';
import { listPredictorSitemapSlugs } from '@/db/repositories/predictor.repository';
import { listStaticPageSitemapSlugs } from '@/db/repositories/site.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';

/** One sitemap entry, mirroring the fields Next.js `MetadataRoute.Sitemap` accepts. */
export interface SitemapEntry {
    url: string;
    lastModified?: Date;
    changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

/**
 * Sitemap shard ids.
 *
 * Each id is served as `/sitemaps/<shard>.xml` by
 * `src/app/sitemaps/[shard]/route.ts`, and `src/app/sitemap.xml/route.ts`
 * publishes the `<sitemapindex>` that links them. Splitting by entity keeps
 * every shard well under the 50,000-URL / 50 MB limit and lets crawlers
 * re-fetch only what changed.
 */
export const SITEMAP_SHARDS = [
    'static',
    'colleges',
    'college-tabs',
    'courses',
    'exams',
    'predictors',
    'articles',
    'news',
    'resources',
    'scholarships',
    'finance',
    'counsellors',
    'locations',
    'pages',
] as const;

export type SitemapShard = (typeof SITEMAP_SHARDS)[number];

/** Hard ceiling per shard. Google rejects sitemaps above 50,000 URLs. */
const SHARD_LIMIT = 45_000;

/**
 * Public routes that are not derived from a database row.
 *
 * Excluded on purpose: authenticated areas (`/dashboard`, `/admin`), the
 * error pages (`/403`), and anything that only exists behind a query string.
 */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: SitemapEntry['changeFrequency'] }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/colleges', priority: 0.9, changeFrequency: 'daily' },
    { path: '/colleges/state', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/courses', priority: 0.9, changeFrequency: 'daily' },
    { path: '/exams', priority: 0.9, changeFrequency: 'daily' },
    { path: '/predictors', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/compare-colleges', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/college-reviews', priority: 0.6, changeFrequency: 'daily' },
    { path: '/counselling', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/career-counselling', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/college-counselling', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/course-counselling', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/book-counselling', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/counsellors', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/education-loans', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/education-loans/eligibility', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/education-loans/calculator', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/education-loans/compare', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/scholarships', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/resources', priority: 0.7, changeFrequency: 'daily' },
    { path: '/articles', priority: 0.8, changeFrequency: 'daily' },
    { path: '/news', priority: 0.8, changeFrequency: 'hourly' },
    { path: '/guides', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/previous-year-papers', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/mock-tests', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/ebooks', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/webinars', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/faqs', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/ai-assistant', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/search', priority: 0.3, changeFrequency: 'monthly' },
];

async function loadShard(shard: SitemapShard): Promise<SitemapEntry[]> {
    await connectToDatabase();
    const now = new Date();

    switch (shard) {
        case 'static':
            return STATIC_ROUTES.map((route) => ({
                url: route.path,
                lastModified: now,
                changeFrequency: route.changeFrequency,
                priority: route.priority,
            }));

        case 'colleges': {
            const rows = await listCollegeSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/colleges/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.8,
            }));
        }

        case 'college-tabs': {
            // Detail sub-pages carry genuinely different content (fees, cut-offs,
            // placements…), so they are indexed. Capped to the most recently
            // updated colleges to keep the shard within the URL limit.
            const perCollege = COLLEGE_TAB_SEGMENTS.length || 1;
            const rows = await listCollegeSitemapSlugs(Math.floor(SHARD_LIMIT / perCollege));

            return rows.flatMap((row) =>
                COLLEGE_TAB_SEGMENTS.map((segment) => ({
                    url: `/colleges/${row.slug}/${segment}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'monthly' as const,
                    priority: 0.5,
                })),
            );
        }

        case 'courses': {
            const [courses, categories] = await Promise.all([
                listCourseSitemapSlugs(SHARD_LIMIT),
                listCourseCategorySitemapSlugs(SHARD_LIMIT),
            ]);

            const detailTabs = ['colleges', 'specializations', 'admission', 'syllabus', 'career', 'fees'];

            return [
                ...courses.flatMap((row) => [
                    {
                        url: `/courses/${row.slug}`,
                        lastModified: row.updatedAt ?? now,
                        changeFrequency: 'weekly' as const,
                        priority: 0.8,
                    },
                    ...detailTabs.map((tab) => ({
                        url: `/courses/${row.slug}/${tab}`,
                        lastModified: row.updatedAt ?? now,
                        changeFrequency: 'monthly' as const,
                        priority: 0.5,
                    })),
                ]),
                ...categories.map((row) => ({
                    url: `/courses/category/${row.slug}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                })),
            ];
        }

        case 'exams': {
            const rows = await listExamSitemapSlugs(SHARD_LIMIT);
            const sections = [
                'dates',
                'eligibility',
                'application',
                'syllabus',
                'pattern',
                'admit-card',
                'result',
                'cutoff',
                'counselling',
                'papers',
            ];
            return rows.flatMap((row) => [
                {
                    url: `/exams/${row.slug}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'daily' as const,
                    priority: 0.8,
                },
                ...sections.map((section) => ({
                    url: `/exams/${row.slug}/${section}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.5,
                })),
            ]);
        }

        case 'predictors': {
            // Predictor uses the *content* status enum, not the entity one.
            const rows = await listPredictorSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/predictors/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.8,
            }));
        }

        case 'articles': {
            const rows = await listArticleSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/articles/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'monthly',
                priority: 0.6,
            }));
        }

        case 'news': {
            const rows = await listNewsSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/news/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'daily',
                priority: 0.6,
            }));
        }

        case 'resources': {
            const rows = await listResourceSitemapSlugs(SHARD_LIMIT);

            // Each resource type has its own listing route.
            const prefixByType: Record<string, string> = {
                guide: '/guides',
                previous_year_paper: '/previous-year-papers',
                mock_test: '/mock-tests',
                ebook: '/ebooks',
                webinar: '/webinars',
            };

            return rows
                .filter((row) => Boolean(row?.slug))
                .map((row) => ({
                    url: `${prefixByType[row.type ?? ''] ?? '/resources'}/${row.slug}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'monthly' as const,
                    priority: 0.5,
                }));
        }

        case 'scholarships': {
            const rows = await listScholarshipSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/scholarships/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.6,
            }));
        }

        case 'finance': {
            // LoanProvider uses the *content* status enum, not the entity one.
            const rows = await listLoanProviderSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/education-loans/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.6,
            }));
        }

        case 'counsellors': {
            const rows = await listCounsellorSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/counsellors/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'monthly',
                priority: 0.5,
            }));
        }

        case 'locations': {
            // SEO landing pages by state / city, and colleges-by-course.
            // Only emitted where the page will actually have content, so we do
            // not publish thin auto-generated URLs.
            const [states, cities, courseSlugs] = await Promise.all([
                listStateSitemapSlugs(SHARD_LIMIT),
                listCitySitemapSlugs(SHARD_LIMIT),
                (async () => {
                    // Only courses that at least one college actually offers, so
                    // `/colleges/course/[slug]` never resolves to an empty page.
                    const courseIds = await distinctOfferedCourseIds();
                    return listCourseSlugsByIds(courseIds, 5_000);
                })(),
            ]);

            return [
                ...states.map((row) => ({
                    url: `/colleges/state/${row.slug}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                })),
                ...cities.map((row) => ({
                    url: `/colleges/city/${row.slug}`,
                    lastModified: row.updatedAt ?? now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                })),
                ...courseSlugs.slice(0, 2000).map((slug) => ({
                    url: `/colleges/course/${slug}`,
                    lastModified: now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                })),
            ];
        }

        case 'pages': {
            const rows = await listStaticPageSitemapSlugs(SHARD_LIMIT);
            return rows.map((row) => ({
                url: `/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'monthly',
                priority: 0.4,
            }));
        }

        default:
            return [];
    }
}

/**
 * Returns the entries for one sitemap shard.
 *
 * A database failure must not turn `/sitemap.xml` into a 500 — crawlers treat
 * repeated errors as a signal to slow down. On failure we degrade to the static
 * routes (for the `static` shard) or an empty shard.
 */
export const getSitemapShard = cached(
    async (shard: SitemapShard): Promise<SitemapEntry[]> => {
        try {
            const entries = await loadShard(shard);
            return entries.slice(0, SHARD_LIMIT);
        } catch (error) {
            logger.error('sitemap.shard_failed', {
                shard,
                error: error instanceof Error ? error.message : String(error),
            });
            if (shard === 'static') {
                return STATIC_ROUTES.map((route) => ({ url: route.path, priority: route.priority }));
            }
            return [];
        }
    },
    ['sitemap-shard'],
    {
        tags: [
            CACHE_TAGS.colleges,
            CACHE_TAGS.courses,
            CACHE_TAGS.exams,
            CACHE_TAGS.predictors,
            CACHE_TAGS.articles,
            CACHE_TAGS.news,
            CACHE_TAGS.resources,
            CACHE_TAGS.scholarships,
            CACHE_TAGS.loanProviders,
            CACHE_TAGS.counsellors,
            CACHE_TAGS.geo,
            CACHE_TAGS.pages,
        ],
        revalidate: CACHE_TTL.long,
    },
);
