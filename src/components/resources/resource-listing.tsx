import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge, Chip, EmptyState, IconTile } from '@/components/ui/primitives';
import { listResources } from '@/db/repositories/content.repository';
import { listFeaturedExams } from '@/db/repositories/exam.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { RESOURCE_TYPES, type ResourceType } from '@/config/constants';
import { formatDate } from '@/lib/utils';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

/**
 * Per-type routing metadata.
 *
 * `path` is the **detail** prefix and must always be a clean path, because card
 * links are built as `${path}/${slug}`. Types without a dedicated index route
 * fall back to `/resources` for detail and carry their filtered listing URL in
 * `listingPath` — mixing the two produced hrefs like
 * `/resources?type=guide/some-slug`.
 */
export const RESOURCE_TYPE_META: Record<
    ResourceType,
    { label: string; plural: string; icon: string; path: string; listingPath?: string; description: string }
> = {
    article: { label: 'Article', plural: 'Articles', icon: 'Newspaper', path: '/articles', description: 'Editorial guidance' },
    news: { label: 'Update', plural: 'News', icon: 'Megaphone', path: '/news', description: 'Live admission updates' },
    guide: { label: 'Guide', plural: 'Guides', icon: 'BookMarked', path: '/guides', description: 'Step-by-step guides' },
    previous_year_paper: {
        label: 'Question paper',
        plural: 'Previous Year Papers',
        icon: 'FileStack',
        path: '/previous-year-papers',
        description: 'Solved and unsolved past papers',
    },
    mock_test: {
        label: 'Mock test',
        plural: 'Mock Tests',
        icon: 'ClipboardList',
        path: '/mock-tests',
        description: 'Full-length timed tests',
    },
    ebook: { label: 'E-book', plural: 'E-Books', icon: 'Book', path: '/ebooks', description: 'Downloadable study material' },
    webinar: { label: 'Webinar', plural: 'Webinars', icon: 'Video', path: '/webinars', description: 'Live and recorded sessions' },
    video: {
        label: 'Video',
        plural: 'Videos',
        icon: 'Play',
        path: '/resources',
        listingPath: '/resources?type=video',
        description: 'Short explainer videos',
    },
    admission_calendar: {
        label: 'Calendar',
        plural: 'Admission Calendars',
        icon: 'CalendarDays',
        path: '/resources',
        listingPath: '/resources?type=admission_calendar',
        description: 'Cycle-wise important dates',
    },
    state_counselling_guide: {
        label: 'State guide',
        plural: 'State Counselling Guides',
        icon: 'Map',
        path: '/resources',
        listingPath: '/resources?type=state_counselling_guide',
        description: 'State-wise counselling processes',
    },
};

/** Listing URL for a type: its own index route when it has one, else a filter. */
export function resourceListingPath(type: ResourceType): string {
    const meta = RESOURCE_TYPE_META[type];
    return meta.listingPath ?? meta.path;
}

export interface ResourceListingProps {
    type?: ResourceType;
    basePath: string;
    title: string;
    description: string;
    eyebrow?: string;
    searchParams: { q?: string; exam?: string; year?: string; page?: string; type?: string };
}

/** Shared listing for every resource type (papers, mocks, e-books, webinars, guides). */
export async function ResourceListing({
    type,
    basePath,
    title,
    description,
    eyebrow = 'Resources',
    searchParams,
}: ResourceListingProps) {
    const activeType = type ?? (searchParams.type as ResourceType | undefined);

    const [result, exams] = await Promise.all([
        listResources({
            q: searchParams.q,
            type: activeType,
            year: Number(searchParams.year) || undefined,
            page: Number(searchParams.page) || 1,
            pageSize: 15,
        }).then(toPlain),
        listFeaturedExams(10).then(toPlain),
    ]);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: title, href: basePath },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((r) => ({ name: r.title, url: `${basePath}/${r.slug}` })),
                        title,
                    ),
                ]}
            />

            <PageHeader
                eyebrow={eyebrow}
                title={title}
                description={description}
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: title }]}
            />

            <div className="shell py-6">
                {!type ? (
                    <div className="mb-5 flex flex-wrap gap-1.5">
                        <Chip href="/resources" active={!activeType}>
                            All resources
                        </Chip>
                        {RESOURCE_TYPES.filter((t) => t !== 'article' && t !== 'news').map((t) => (
                            <Chip key={t} href={`/resources?type=${t}`} active={activeType === t}>
                                {RESOURCE_TYPE_META[t].plural}
                            </Chip>
                        ))}
                    </div>
                ) : (
                    <div className="mb-5 flex flex-wrap gap-1.5">
                        <Chip href={basePath} active={!searchParams.exam}>
                            All exams
                        </Chip>
                        {exams.map((exam) => (
                            <Chip key={String(exam._id)} href={`${basePath}?q=${encodeURIComponent(exam.shortName)}`}>
                                {exam.shortName}
                            </Chip>
                        ))}
                    </div>
                )}

                {result.items.length === 0 ? (
                    <EmptyState
                        icon={type ? RESOURCE_TYPE_META[type].icon : 'FileStack'}
                        title="Nothing published here yet"
                        description="Our content team adds resources through the admin dashboard as each exam cycle progresses."
                    />
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {result.items.map((resource) => {
                            const meta = RESOURCE_TYPE_META[resource.type as ResourceType];
                            return (
                                <li key={String(resource._id)}>
                                    <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised">
                                        <div className="flex items-start gap-3">
                                            <IconTile icon={meta?.icon ?? 'FileText'} tone="navy" />
                                            <div className="min-w-0">
                                                <h2 className="text-[13.5px] font-extrabold leading-snug text-ink">
                                                    <Link href={`${meta?.path ?? '/resources'}/${resource.slug}`} className="hover:text-navy-700">
                                                        {resource.title}
                                                    </Link>
                                                </h2>
                                                <p className="mt-0.5 text-[11px] text-ink-soft">
                                                    {meta?.label}
                                                    {resource.relatedExamName ? ` • ${resource.relatedExamName}` : ''}
                                                    {resource.year ? ` • ${resource.year}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {resource.description ? (
                                            <p className="mt-2 line-clamp-2 text-[12px] text-ink-soft">{resource.description}</p>
                                        ) : null}

                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                            {resource.isFree ? <Badge tone="green">Free</Badge> : <Badge tone="orange">Paid</Badge>}
                                            {resource.requiresLogin ? <Badge tone="neutral">Login required</Badge> : null}
                                            {resource.durationMinutes ? (
                                                <Badge tone="neutral">{resource.durationMinutes} min</Badge>
                                            ) : null}
                                            {resource.questionCount ? (
                                                <Badge tone="neutral">{resource.questionCount} Qs</Badge>
                                            ) : null}
                                        </div>

                                        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-ink-soft">
                                            <span>{formatDate(resource.publishedAt)}</span>
                                            <Link
                                                href={`${meta?.path ?? '/resources'}/${resource.slug}`}
                                                className="font-bold text-navy-600 hover:text-orange"
                                            >
                                                Open →
                                            </Link>
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <Pagination
                    className="mt-6"
                    basePath={basePath}
                    params={searchParams as Record<string, string | undefined>}
                    page={result.page}
                    totalPages={result.totalPages}
                    total={result.total}
                    pageSize={result.pageSize}
                />
            </div>
        </>
    );
}
