import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { connectToDatabase } from '@/db/connect';
import { College } from '@/db/models/college.model';
import { Course } from '@/db/models/course.model';
import { Exam } from '@/db/models/exam.model';
import { Article } from '@/db/models/content.model';
import { Redirect } from '@/db/models/site.model';
import { requirePermissionPage } from '@/lib/auth/session';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'SEO' };

export default async function AdminSeoPage() {
    await requirePermissionPage('seo.manage');
    await connectToDatabase();

    const [colleges, courses, exams, articles, redirects, missingCollegeSeo, missingArticleSeo, noIndexed] =
        await Promise.all([
            College.countDocuments({ status: 'published' }).exec(),
            Course.countDocuments({ status: 'published' }).exec(),
            Exam.countDocuments({ status: 'published' }).exec(),
            Article.countDocuments({ status: 'published' }).exec(),
            Redirect.countDocuments({ status: 'active' }).exec(),
            College.countDocuments({ status: 'published', 'seo.description': { $in: [null, ''] } }).exec(),
            Article.countDocuments({ status: 'published', 'seo.description': { $in: [null, ''] } }).exec(),
            College.countDocuments({ 'seo.noIndex': true }).exec(),
        ]);

    const sitemaps = [
        { label: 'Sitemap index', href: '/sitemap.xml' },
        { label: 'robots.txt', href: '/robots.txt' },
    ];

    const schemas = [
        'Organization (EducationalOrganization)',
        'WebSite + SearchAction',
        'BreadcrumbList on every page',
        'CollegeOrUniversity on college pages (rating only when reviews exist)',
        'Course on course pages',
        'EducationEvent on exam pages with a scheduled date',
        'Article on articles and news',
        'FAQPage where FAQs are present',
        'ItemList on listing pages',
    ];

    return (
        <>
            <AdminPageHeader
                title="SEO"
                description="Indexable inventory, structured data coverage and the redirect manager. Metadata itself is edited on each record."
                icon="Globe"
                breadcrumbs={[{ label: 'SEO' }]}
                actions={
                    <Link
                        href="/admin/redirects"
                        className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13px] font-bold text-ink"
                    >
                        Manage redirects ({redirects})
                    </Link>
                }
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Indexable inventory" icon="LayoutGrid">
                    <ul className="divide-y divide-line text-[12.5px]">
                        {[
                            { label: 'Colleges', count: colleges, href: '/admin/colleges' },
                            { label: 'Courses', count: courses, href: '/admin/courses' },
                            { label: 'Exams', count: exams, href: '/admin/exams' },
                            { label: 'Articles', count: articles, href: '/admin/articles' },
                        ].map((row) => (
                            <li key={row.label} className="flex items-center justify-between gap-2 py-2">
                                <Link href={row.href} className="font-semibold text-ink hover:text-navy-700">
                                    {row.label}
                                </Link>
                                <span className="font-bold text-navy-700">{row.count.toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                    </ul>
                </SectionCard>

                <SectionCard title="Metadata health" icon="ShieldCheck">
                    <ul className="space-y-2 text-[12.5px]">
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Colleges missing a meta description</span>
                            <Badge tone={missingCollegeSeo > 0 ? 'amber' : 'green'}>{missingCollegeSeo}</Badge>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Articles missing a meta description</span>
                            <Badge tone={missingArticleSeo > 0 ? 'amber' : 'green'}>{missingArticleSeo}</Badge>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Records marked no-index</span>
                            <Badge tone="neutral">{noIndexed}</Badge>
                        </li>
                    </ul>
                    <p className="mt-3 text-[11.5px] text-ink-soft">
                        When a record has no SEO title or description the platform generates one from its content, so pages are
                        never left without metadata.
                    </p>
                </SectionCard>

                <SectionCard title="Sitemaps & robots" icon="Share2">
                    <ul className="space-y-2 text-[12.5px]">
                        {sitemaps.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    target="_blank"
                                    className="font-semibold text-navy-600 hover:text-orange"
                                >
                                    {siteConfig.url}
                                    {item.href} →
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-[11.5px] text-ink-soft">
                        The sitemap index splits into colleges, courses, exams, predictors, articles, news, scholarships,
                        resources and location landing pages. Each is generated from published records only.
                    </p>
                </SectionCard>

                <SectionCard title="Structured data emitted" icon="Database">
                    <ul className="list-disc space-y-1 pl-5 text-[12px] text-ink-soft">
                        {schemas.map((schema) => (
                            <li key={schema}>{schema}</li>
                        ))}
                    </ul>
                </SectionCard>
            </div>
        </>
    );
}
