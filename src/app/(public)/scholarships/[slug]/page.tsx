import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import {
    CtaBanner,
    FaqAccordion,
    KeyValueGrid,
    RichText,
    SectionCard,
} from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getScholarship } from '@/services/finance.service';
import { formatCompactINR, formatCurrency, formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const detail = await getScholarship(slug);
    if (!detail) {
        return buildMetadata({ title: 'Scholarship not found', path: `/scholarships/${slug}`, noIndex: true });
    }
    const { scholarship } = detail;
    return buildMetadata({
        title: scholarship.seo?.title ?? `${scholarship.name} — Eligibility, Amount & Application`,
        description: scholarship.seo?.description ?? scholarship.description,
        path: `/scholarships/${scholarship.slug}`,
    });
}

export default async function ScholarshipDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getScholarship(slug);
    if (!detail) notFound();

    const { scholarship, related } = detail;
    const faqJson = buildFaqJsonLd(
        (scholarship.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
    );
    const isOpen =
        !scholarship.applicationDeadline || new Date(scholarship.applicationDeadline).getTime() > Date.now();

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Scholarships', href: '/scholarships' },
                        { label: scholarship.name, href: `/scholarships/${scholarship.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow={scholarship.providerType}
                title={scholarship.name}
                description={scholarship.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Scholarships', href: '/scholarships' },
                    { label: scholarship.name },
                ]}
                actions={
                    scholarship.applicationUrl ? (
                        <a
                            href={scholarship.applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            Apply on official portal
                        </a>
                    ) : undefined
                }
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        <SectionCard title="Key details" icon="Award">
                            <KeyValueGrid
                                columns={4}
                                items={[
                                    { label: 'Provider', value: scholarship.provider },
                                    { label: 'Benefit type', value: scholarship.benefitType },
                                    {
                                        label: 'Amount',
                                        value: scholarship.amountMax
                                            ? `${formatCurrency(scholarship.amountMin ?? 0)} – ${formatCurrency(scholarship.amountMax)}`
                                            : (scholarship.amountNote ?? '—'),
                                    },
                                    { label: 'Application opens', value: formatDate(scholarship.applicationStart) },
                                    { label: 'Deadline', value: formatDate(scholarship.applicationDeadline) },
                                    {
                                        label: 'Status',
                                        value: isOpen ? <Badge tone="green">Open</Badge> : <Badge tone="neutral">Closed</Badge>,
                                    },
                                    { label: 'Minimum marks', value: scholarship.minPercentage ? `${scholarship.minPercentage}%` : '—' },
                                    {
                                        label: 'Family income cap',
                                        value: scholarship.maxFamilyIncome ? formatCompactINR(scholarship.maxFamilyIncome) : '—',
                                    },
                                ]}
                            />
                        </SectionCard>

                        <SectionCard title="About this scholarship" icon="Info">
                            <RichText html={scholarship.detailsHtml} />
                        </SectionCard>

                        <SectionCard title="Eligibility" icon="ShieldCheck">
                            <RichText html={scholarship.eligibilityHtml} />
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {scholarship.targetLevels.map((level) => (
                                    <Badge key={level} tone="navy" size="lg">
                                        {level}
                                    </Badge>
                                ))}
                                {scholarship.targetCategories.map((category) => (
                                    <Badge key={category} tone="purple" size="lg">
                                        {category}
                                    </Badge>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Documents required" icon="FileCheck">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                {scholarship.documentsRequired.map((document) => (
                                    <li key={document}>{document}</li>
                                ))}
                            </ul>
                        </SectionCard>

                        {scholarship.faqs?.length ? (
                            <SectionCard title="FAQs" icon="CircleHelp">
                                <FaqAccordion
                                    faqs={scholarship.faqs.map((f) => ({ question: f.question, answer: f.answer }))}
                                />
                            </SectionCard>
                        ) : null}

                        <CtaBanner
                            title="Need help with the application?"
                            description="Counsellors check your eligibility and document set before you submit."
                            ctaLabel="Get scholarship help"
                            ctaUrl="/book-counselling?type=loan"
                            tone="teal"
                        />
                    </div>

                    <aside className="space-y-4">
                        {related.length > 0 ? (
                            <SectionCard title="Similar scholarships" icon="Award">
                                <ul className="space-y-2">
                                    {related.map((item) => (
                                        <li key={String(item._id)}>
                                            <Link
                                                href={`/scholarships/${item.slug}`}
                                                className="block rounded-[10px] border border-line px-3 py-2 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                            >
                                                <span className="block truncate text-[12.5px] font-bold text-ink">{item.name}</span>
                                                <span className="mt-0.5 block text-[11px] text-ink-soft">
                                                    {item.amountMax ? `Up to ${formatCompactINR(item.amountMax)}` : item.benefitType}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        <SectionCard title="Reduce your loan" icon="Landmark">
                            <p className="text-[12.5px] text-ink-soft">
                                Every scholarship you win is a loan you do not have to repay. Check your loan eligibility only
                                after applying for scholarships.
                            </p>
                            <Link href="/education-loans/eligibility" className="link-more mt-2 inline-flex">
                                Check loan eligibility →
                            </Link>
                        </SectionCard>
                    </aside>
                </div>
            </div>
        </>
    );
}
