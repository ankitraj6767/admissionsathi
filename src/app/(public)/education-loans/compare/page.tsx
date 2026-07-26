import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { listLoanProviders } from '@/services/finance.service';
import { formatCompactINR } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Compare Education Loans — Rates, Limits & Processing Fees',
    description:
        'Side-by-side comparison of education loan providers: interest rate range, maximum sanction, collateral-free limit, moratorium, processing fee and turnaround time.',
    path: '/education-loans/compare',
});

export default async function CompareLoansPage() {
    const providers = await listLoanProviders();

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Education loans', href: '/education-loans' },
                    { label: 'Compare', href: '/education-loans/compare' },
                ])}
            />

            <PageHeader
                eyebrow="Loan tools"
                title="Compare education loans"
                description="The full comparison, in one table. Sorted by the lowest starting interest rate."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Education loans', href: '/education-loans' },
                    { label: 'Compare' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title={`${providers.length} lenders compared`} icon="GitCompare">
                    {providers.length === 0 ? (
                        <EmptyState icon="Landmark" title="No lenders published yet" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-[12px]">
                                <thead>
                                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft">
                                        <th className="py-2.5 pr-3">Lender</th>
                                        <th className="py-2.5 pr-3">Type</th>
                                        <th className="py-2.5 pr-3">Interest rate</th>
                                        <th className="py-2.5 pr-3">Max amount</th>
                                        <th className="py-2.5 pr-3">Collateral-free up to</th>
                                        <th className="py-2.5 pr-3">Moratorium</th>
                                        <th className="py-2.5 pr-3">Tenure</th>
                                        <th className="py-2.5 pr-3">Processing fee</th>
                                        <th className="py-2.5 pr-3">Turnaround</th>
                                        <th className="py-2.5">Abroad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...providers]
                                        .sort((a, b) => (a.interestRateMin ?? 99) - (b.interestRateMin ?? 99))
                                        .map((provider) => (
                                            <tr key={String(provider._id)} className="border-b border-line/70 last:border-0">
                                                <td className="py-2.5 pr-3">
                                                    <Link
                                                        href={`/education-loans/${provider.slug}`}
                                                        className="font-bold text-ink hover:text-navy-700"
                                                    >
                                                        {provider.name}
                                                    </Link>
                                                    {provider.isFeatured ? (
                                                        <Badge tone="orange" className="ml-1.5">
                                                            Popular
                                                        </Badge>
                                                    ) : null}
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{provider.providerType}</td>
                                                <td className="py-2.5 pr-3 font-bold text-ink">
                                                    {provider.interestRateMin}% – {provider.interestRateMax}%
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{formatCompactINR(provider.maxLoanAmount)}</td>
                                                <td className="py-2.5 pr-3 text-ink-soft">
                                                    {formatCompactINR(provider.maxLoanAmountWithoutCollateral)}
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{provider.moratoriumMonths ?? 0} mo</td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{provider.maxTenureYears ?? '—'} yrs</td>
                                                <td className="py-2.5 pr-3 text-ink-soft">
                                                    {provider.processingFeePercent === 0 ? 'Nil' : `${provider.processingFeePercent}%`}
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{provider.processingTimeDays ?? '—'}</td>
                                                <td className="py-2.5">
                                                    {provider.coversAbroad ? (
                                                        <Badge tone="green">Yes</Badge>
                                                    ) : (
                                                        <Badge tone="neutral">No</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="mt-3 rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] text-orange-700">
                        Rates and limits shown are demonstration values maintained in the admin dashboard. Confirm current
                        terms directly with the lender before applying.
                    </p>
                </SectionCard>

                <CtaBanner
                    title="Not sure which lender fits your profile?"
                    description="Share your details and a finance counsellor will shortlist lenders for you — free."
                    ctaLabel="Get lender recommendations"
                    ctaUrl="/book-counselling?type=loan"
                />
            </div>
        </>
    );
}
