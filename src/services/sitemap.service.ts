import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { College, CollegeCourse } from '@/db/models/college.model';
import { COLLEGE_TAB_SEGMENTS } from '@/config/constants';
import { Article, NewsPost, Resource } from '@/db/models/content.model';
import { Counsellor } from '@/db/models/counselling.model';
import { Course, CourseCategory } from '@/db/models/course.model';
import { Exam } from '@/db/models/exam.model';
import { LoanProvider, Scholarship } from '@/db/models/finance.model';
import { City, State } from '@/db/models/geo.model';
import { Predictor } from '@/db/models/predictor.model';
import { StaticPage } from '@/db/models/site.model';
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

type SlugRow = { slug: string; updatedAt?: Date };

/** Shared lean projection for every slug-addressable published collection. */
async function publishedSlugs(
    model: {
        find: (filter: Record<string, unknown>) => {
            select: (p: Record<string, number>) => {
                sort: (s: Record<string, 1 | -1>) => {
                    limit: (n: number) => { lean: () => { exec: () => Promise<unknown> } };
                };
            };
        };
    },
    filter: Record<string, unknown>,
): Promise<SlugRow[]> {
    const rows = (await model
        .find(filter)
        .select({ slug: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(SHARD_LIMIT)
        .lean()
        .exec()) as SlugRow[];
    return rows.filter((row) => Boolean(row?.slug));
}

const PUBLISHED = { status: 'published', isDeleted: { $ne: true }, 'seo.noIndex': { $ne: true } };
const ACTIVE = { status: 'active', isDeleted: { $ne: true }, 'seo.noIndex': { $ne: true } };

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
            const rows = await publishedSlugs(College, PUBLISHED);
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
            const rows = (await College.find(PUBLISHED)
                .select({ slug: 1, updatedAt: 1 })
                .sort({ updatedAt: -1 })
                .limit(Math.floor(SHARD_LIMIT / perCollege))
                .lean()
                .exec()) as SlugRow[];

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
                publishedSlugs(Course, PUBLISHED),
                publishedSlugs(CourseCategory, ACTIVE),
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
            const rows = await publishedSlugs(Exam, PUBLISHED);
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
            const rows = await publishedSlugs(Predictor, PUBLISHED);
            return rows.map((row) => ({
                url: `/predictors/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.8,
            }));
        }

        case 'articles': {
            const rows = await publishedSlugs(Article, PUBLISHED);
            return rows.map((row) => ({
                url: `/articles/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'monthly',
                priority: 0.6,
            }));
        }

        case 'news': {
            const rows = await publishedSlugs(NewsPost, PUBLISHED);
            return rows.map((row) => ({
                url: `/news/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'daily',
                priority: 0.6,
            }));
        }

        case 'resources': {
            const rows = (await Resource.find(PUBLISHED)
                .select({ slug: 1, updatedAt: 1, type: 1 })
                .sort({ updatedAt: -1 })
                .limit(SHARD_LIMIT)
                .lean()
                .exec()) as (SlugRow & { type?: string })[];

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
            const rows = await publishedSlugs(Scholarship, PUBLISHED);
            return rows.map((row) => ({
                url: `/scholarships/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.6,
            }));
        }

        case 'finance': {
            // LoanProvider uses the *content* status enum, not the entity one.
            const rows = await publishedSlugs(LoanProvider, PUBLISHED);
            return rows.map((row) => ({
                url: `/education-loans/${row.slug}`,
                lastModified: row.updatedAt ?? now,
                changeFrequency: 'weekly',
                priority: 0.6,
            }));
        }

        case 'counsellors': {
            const rows = await publishedSlugs(Counsellor, ACTIVE);
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
                publishedSlugs(State, ACTIVE),
                (async () => {
                    const rows = (await City.find({ ...ACTIVE, collegeCount: { $gt: 0 } })
                        .select({ slug: 1, updatedAt: 1 })
                        .sort({ collegeCount: -1 })
                        .limit(SHARD_LIMIT)
                        .lean()
                        .exec()) as SlugRow[];
                    return rows.filter((row) => Boolean(row?.slug));
                })(),
                (async () => {
                    // Only courses that at least one college actually offers, so
                    // `/colleges/course/[slug]` never resolves to an empty page.
                    const courseIds = (await CollegeCourse.distinct('course', {
                        status: 'active',
                    }).exec()) as unknown[];
                    if (courseIds.length === 0) return [] as string[];

                    const rows = (await Course.find({ _id: { $in: courseIds }, ...PUBLISHED })
                        .select({ slug: 1 })
                        .limit(5_000)
                        .lean()
                        .exec()) as SlugRow[];
                    return rows.map((row) => row.slug).filter(Boolean);
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
            const rows = await publishedSlugs(StaticPage, PUBLISHED);
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
