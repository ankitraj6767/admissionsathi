import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { RichText } from '@/components/shared/content-blocks';
import { getPublishedPage, listPublishedPageLinks } from '@/services/page.service';
import { recordRedirectHit, resolveRedirect } from '@/services/redirect.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { formatDate, truncate } from '@/lib/utils';

/**
 * Rendered per request, not prerendered.
 *
 * The shared public layout reads the session (`getCurrentActor()` → cookies), so
 * this route cannot be statically generated: combining `revalidate` with
 * `generateStaticParams()` here made every slug that was not prerendered fail
 * with `DYNAMIC_SERVER_USAGE` instead of resolving. Page content is still cached
 * — `getPublishedPage()` is wrapped in `cached()` under the `pages` tag, which
 * the admin invalidates on publish — so the database is not hit per request.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ pageSlug: string }>;
}): Promise<Metadata> {
    const { pageSlug } = await params;
    const page = await getPublishedPage(pageSlug);

    if (!page) {
        return { title: 'Page not found', robots: { index: false, follow: false } };
    }

    return buildMetadata({
        title: page.seo?.title || page.title,
        description: page.seo?.description || page.excerpt,
        path: `/${page.slug}`,
        keywords: page.seo?.keywords,
        ogImage: page.seo?.ogImage,
        noIndex: page.seo?.noIndex,
        noFollow: page.seo?.noFollow,
    });
}

/**
 * Editor-managed standalone page (about, contact-adjacent, careers, legal…).
 *
 * This single-segment dynamic route matches before `[...unmatched]`, so it also
 * owns the redirect fallback for unknown one-segment URLs — otherwise renaming a
 * top-level page would 404 instead of following its redirect rule.
 */
export default async function StaticContentPage({
    params,
}: {
    params: Promise<{ pageSlug: string }>;
}) {
    const { pageSlug } = await params;
    const page = await getPublishedPage(pageSlug);

    if (!page) {
        const rule = await resolveRedirect(`/${pageSlug}`);
        if (rule) {
            recordRedirectHit(`/${pageSlug}`);
            if (rule.permanent) permanentRedirect(rule.destination);
            redirect(rule.destination);
        }
        notFound();
    }

    // An editor renamed the page: serve the canonical URL instead of the old one.
    if (page.slug !== pageSlug) permanentRedirect(`/${page.slug}`);

    const related = (await listPublishedPageLinks()).filter(
        (link) => link.group === page.group && link.slug !== page.slug,
    );

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: page.title, href: `/${page.slug}` },
                ])}
            />

            <PageHeader
                eyebrow={page.heroEyebrow}
                title={page.title}
                description={page.excerpt}
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: page.title }]}
            />

            <div className="shell py-6">
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <article className="min-w-0 rounded-panel border border-line bg-white p-4 shadow-card md:p-6">
                        {page.showLastUpdated ? (
                            <p className="mb-4 border-b border-line pb-3 text-[11.5px] font-semibold text-ink-soft">
                                Last updated {formatDate(page.updatedAt)}
                            </p>
                        ) : null}

                        <RichText html={page.contentHtml} />
                    </article>

                    {related.length > 0 ? (
                        <aside className="rounded-panel border border-line bg-white p-4 shadow-card lg:sticky lg:top-24">
                            <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-navy-600">
                                {page.group === 'legal' ? 'Legal & policies' : 'More about us'}
                            </h2>
                            <ul className="space-y-1">
                                {related.map((link) => (
                                    <li key={link.slug}>
                                        <Link
                                            href={`/${link.slug}`}
                                            className="flex min-h-11 items-center rounded-[10px] px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-muted/70 hover:text-navy-700"
                                        >
                                            {truncate(link.title, 40)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    ) : null}
                </div>
            </div>
        </>
    );
}
