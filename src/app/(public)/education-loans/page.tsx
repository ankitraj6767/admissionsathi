import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState, IconTile } from '@/components/ui/primitives';
import { listLoanProviders } from '@/services/finance.service';
import { LOAN_DOCUMENT_CHECKLIST } from '@/config/finance';
import { formatCompactINR } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Education Loans — Compare Rates, Eligibility & EMI',
    description:
        'Compare education loans from banks and NBFCs on interest rate, collateral limits, moratorium and processing fee. Check eligibility and calculate your EMI.',
    path: '/education-loans',
});

const TOOLS = [
    { title: 'Check eligibility', detail: 'Estimate how much you can borrow', icon: 'ShieldCheck', url: '/education-loans/eligibility' },
    { title: 'EMI calculator', detail: 'Monthly EMI and full schedule', icon: 'Calculator', url: '/education-loans/calculator' },
    { title: 'Compare lenders', detail: 'Rates and limits side by side', icon: 'GitCompare', url: '/education-loans/compare' },
    { title: 'Scholarships', detail: 'Reduce the loan you need', icon: 'Award', url: '/scholarships' },
];

export default async function EducationLoansPage() {
    const providers = await listLoanProviders();

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Education loans', href: '/education-loans' },
                    ]),
                    buildItemListJsonLd(
                        providers.map((p) => ({ name: p.name, url: `/education-loans/${p.slug}` })),
                        'Education loan providers',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Loan & finance"
                title="Education loans"
                description="Compare lenders on what actually matters: interest rate band, collateral-free limit, moratorium, processing fee and turnaround time."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Education loans' }]}
                actions={
                    <Link
                        href="/education-loans/calculator"
                        className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                    >
                        Calculate EMI
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {TOOLS.map((tool) => (
                        <li key={tool.url}>
                            <Link
                                href={tool.url}
                                className="flex h-full items-start gap-3 rounded-panel border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised"
                            >
                                <IconTile icon={tool.icon} tone="green" />
                                <span>
                                    <span className="block text-[13px] font-extrabold text-ink">{tool.title}</span>
                                    <span className="mt-0.5 block text-[11.5px] text-ink-soft">{tool.detail}</span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <SectionCard
                    title={`${providers.length} lenders tracked`}
                    icon="Landmark"
                    actions={
                        <Link href="/education-loans/compare" className="link-more">
                            Compare all →
                        </Link>
                    }
                >
                    {providers.length === 0 ? (
                        <EmptyState icon="Landmark" title="No lenders published yet" />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {providers.map((provider) => (
                                <li key={String(provider._id)}>
                                    <article className="flex h-full flex-col rounded-panel border border-line p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-[13.5px] font-extrabold text-ink">
                                                    <Link href={`/education-loans/${provider.slug}`} className="hover:text-navy-700">
                                                        {provider.name}
                                                    </Link>
                                                </h3>
                                                <p className="text-[11px] text-ink-soft">{provider.providerType}</p>
                                            </div>
                                            {provider.isFeatured ? <Badge tone="solidOrange">Popular</Badge> : null}
                                        </div>

                                        <p className="mt-2 line-clamp-2 text-[11.5px] text-ink-soft">{provider.summary}</p>

                                        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                                            <div>
                                                <dt className="text-ink-soft">Interest</dt>
                                                <dd className="font-bold text-ink">
                                                    {provider.interestRateMin}% – {provider.interestRateMax}%
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-ink-soft">Max amount</dt>
                                                <dd className="font-bold text-ink">{formatCompactINR(provider.maxLoanAmount)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-ink-soft">Collateral-free up to</dt>
                                                <dd className="font-bold text-ink">
                                                    {formatCompactINR(provider.maxLoanAmountWithoutCollateral)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-ink-soft">Moratorium</dt>
                                                <dd className="font-bold text-ink">{provider.moratoriumMonths ?? 0} months</dd>
                                            </div>
                                        </dl>

                                        <div className="mt-auto flex gap-2 pt-3">
                                            <Link
                                                href={`/education-loans/${provider.slug}`}
                                                className="inline-flex h-9 flex-1 items-center justify-center rounded-[9px] border border-line text-[12px] font-bold text-ink hover:border-navy-200"
                                            >
                                                Details
                                            </Link>
                                            <Link
                                                href={`/education-loans/calculator?rate=${provider.interestRateMin}`}
                                                className="inline-flex h-9 flex-1 items-center justify-center rounded-[9px] bg-navy text-[12px] font-bold text-white hover:bg-navy-800"
                                            >
                                                Calculate EMI
                                            </Link>
                                        </div>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard id="documents" title="Documents required" icon="FileCheck">
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {LOAN_DOCUMENT_CHECKLIST.map((document) => (
                            <li
                                key={document}
                                className="rounded-[10px] border border-line bg-muted/40 px-3 py-2 text-[12px] text-ink"
                            >
                                {document}
                            </li>
                        ))}
                    </ul>
                </SectionCard>

                <CtaBanner
                    title="Need help choosing a lender?"
                    description="A finance counsellor compares your options and reviews your documents — free."
                    ctaLabel="Talk to a finance counsellor"
                    ctaUrl="/book-counselling?type=loan"
                    tone="teal"
                />
            </div>
        </>
    );
}
