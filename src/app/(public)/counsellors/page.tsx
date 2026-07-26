import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getCounsellorDirectory } from '@/services/counselling.service';
import { initials } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Our Counsellors — Admission & Career Experts',
    description:
        'Meet the Admission Sathi counselling team: specialisations, languages, experience and student ratings. Book a free session with the counsellor who fits your needs.',
    path: '/counsellors',
});

export default async function CounsellorsPage() {
    const counsellors = await getCounsellorDirectory();

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Counsellors', href: '/counsellors' },
                    ]),
                    buildItemListJsonLd(
                        counsellors.map((c) => ({ name: c.name, url: `/counsellors/${c.slug}` })),
                        'Admission Sathi counsellors',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Counselling team"
                title="Our counsellors"
                description="Every counsellor works on live admissions each season. Pick one by specialisation, language or experience — the first session is always free."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Counsellors' }]}
            />

            <div className="shell py-6">
                <SectionCard title={`${counsellors.length} counsellors available`} icon="Users">
                    {counsellors.length === 0 ? (
                        <EmptyState icon="Users" title="No counsellors published yet" />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {counsellors.map((counsellor) => (
                                <li key={String(counsellor._id)}>
                                    <article className="flex h-full flex-col rounded-panel border border-line p-4 transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card">
                                        <div className="flex items-start gap-3">
                                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">
                                                {initials(counsellor.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <h2 className="text-[13.5px] font-extrabold text-ink">
                                                    <Link href={`/counsellors/${counsellor.slug}`} className="hover:text-navy-700">
                                                        {counsellor.name}
                                                    </Link>
                                                </h2>
                                                <p className="text-[11.5px] text-ink-soft">{counsellor.designation}</p>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                            <Badge tone="green">{counsellor.rating.average.toFixed(1)}★ ({counsellor.rating.count})</Badge>
                                            <Badge tone="navy">{counsellor.experienceYears}+ yrs</Badge>
                                            {counsellor.isFeatured ? <Badge tone="solidOrange">Top rated</Badge> : null}
                                        </div>

                                        <p className="mt-2.5 line-clamp-3 text-[11.5px] leading-relaxed text-ink-soft">
                                            {counsellor.bio}
                                        </p>

                                        <p className="mt-2 text-[11px] text-ink-soft">
                                            Speaks: {counsellor.languages.join(', ')}
                                        </p>

                                        <div className="mt-auto flex gap-2 pt-3">
                                            <Link
                                                href={`/counsellors/${counsellor.slug}`}
                                                className="inline-flex h-9 flex-1 items-center justify-center rounded-[9px] border border-line text-[12px] font-bold text-ink hover:border-navy-200"
                                            >
                                                Profile
                                            </Link>
                                            <Link
                                                href={`/book-counselling?counsellor=${counsellor.slug}`}
                                                className="inline-flex h-9 flex-1 items-center justify-center rounded-[9px] bg-orange text-[12px] font-bold text-white hover:bg-orange-600"
                                            >
                                                Book free
                                            </Link>
                                        </div>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>
        </>
    );
}
