import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import {
    CtaBanner,
    DataNotice,
    FaqAccordion,
    KeyValueGrid,
    RichText,
    SectionCard,
} from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getLoanProvider } from '@/services/finance.service';
import { formatCompactINR } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ providerSlug: string }>;
}): Promise<Metadata> {
    const { providerSlug } = await params;
    const detail = await getLoanProvider(providerSlug);
    if (!detail) {
        return buildMetadata({ title: 'Lender not found', path: `/education-loans/${providerSlug}`, noIndex: true });
    }
    const { provider } = detail;
    return buildMetadata({
        title: provider.seo?.title ?? `${provider.name} Education Loan — Rate, Eligibility & Documents`,
        description: provider.seo?.description ?? provider.summary,
        path: `/education-loans/${provider.slug}`,
    });
}

export default async function LoanProviderPage({
    params,
}: {
    params: Promise<{ providerSlug: string }>;
}) {
    const { providerSlug } = await params;
    const detail = await getLoanProvider(providerSlug);
    if (!detail) notFound();

    const { provider, products } = detail;
    const faqJson = buildFaqJsonLd(
        (provider.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
    );

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Education loans', href: '/education-loans' },
                        { label: provider.name, href: `/education-loans/${provider.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow={provider.providerType}
                title={provider.name}
                description={provider.summary}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Education loans', href: '/education-loans' },
                    { label: provider.name },
                ]}
                actions={
                    <>
                        <Link
                            href={`/education-loans/calculator?rate=${provider.interestRateMin}`}
                            className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                        >
                            Calculate EMI
                        </Link>
                        <Link
                            href="/book-counselling?type=loan"
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            Apply with help
                        </Link>
                    </>
                }
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        <SectionCard title="Loan terms at a glance" icon="Landmark">
                            <KeyValueGrid
                                columns={4}
                                items={[
                                    {
                                        label: 'Interest rate',
                                        value: `${provider.interestRateMin}% – ${provider.interestRateMax}%`,
                                    },
                                    { label: 'Maximum sanction', value: formatCompactINR(provider.maxLoanAmount) },
                                    {
                                        label: 'Collateral-free up to',
                                        value: formatCompactINR(provider.maxLoanAmountWithoutCollateral),
                                    },
                                    { label: 'Moratorium', value: `${provider.moratoriumMonths ?? 0} months` },
                                    { label: 'Maximum tenure', value: `${provider.maxTenureYears ?? '—'} years` },
                                    {
                                        label: 'Processing fee',
                                        value: provider.processingFeePercent === 0 ? 'Nil' : `${provider.processingFeePercent}%`,
                                    },
                                    { label: 'Processing time', value: provider.processingTimeDays ?? '—' },
                                    { label: 'Study abroad', value: provider.coversAbroad ? 'Covered' : 'Not covered' },
                                ]}
                            />
                            <DataNotice
                                className="mt-3"
                                note="Terms shown are demonstration values maintained in the admin dashboard. Confirm current rates and charges with the lender."
                            />
                        </SectionCard>

                        <SectionCard title="About this lender" icon="Info">
                            <RichText html={provider.detailsHtml} />
                        </SectionCard>

                        <SectionCard title="Eligibility" icon="ShieldCheck">
                            <RichText html={provider.eligibilityHtml} />
                        </SectionCard>

                        {products.length > 0 ? (
                            <SectionCard title="Loan products" icon="Wallet">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[12.5px]">
                                        <thead>
                                            <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                                <th className="py-2 pr-3">Product</th>
                                                <th className="py-2 pr-3">Purpose</th>
                                                <th className="py-2 pr-3">Rate</th>
                                                <th className="py-2 pr-3">Amount</th>
                                                <th className="py-2">Collateral-free</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((product) => (
                                                <tr key={String(product._id)} className="border-b border-line/70 last:border-0">
                                                    <td className="py-2.5 pr-3 font-semibold text-ink">{product.name}</td>
                                                    <td className="py-2.5 pr-3 text-ink-soft">{product.purpose}</td>
                                                    <td className="py-2.5 pr-3 text-ink">
                                                        {product.interestRateMin}% – {product.interestRateMax}%
                                                    </td>
                                                    <td className="py-2.5 pr-3 text-ink-soft">
                                                        {formatCompactINR(product.minAmount)} – {formatCompactINR(product.maxAmount)}
                                                    </td>
                                                    <td className="py-2.5">
                                                        {product.collateralFree ? (
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
                            </SectionCard>
                        ) : null}

                        {provider.faqs?.length ? (
                            <SectionCard title="FAQs" icon="CircleHelp">
                                <FaqAccordion faqs={provider.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
                            </SectionCard>
                        ) : null}

                        <CtaBanner
                            title={`Applying to ${provider.name}?`}
                            description="Get your document set reviewed before you submit — it avoids most rejections."
                            ctaLabel="Get free help"
                            ctaUrl="/book-counselling?type=loan"
                        />
                    </div>

                    <aside className="space-y-4">
                        <SectionCard title="Documents required" icon="FileCheck">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12px] text-ink-soft">
                                {provider.documentsRequired.map((document) => (
                                    <li key={document}>{document}</li>
                                ))}
                            </ul>
                        </SectionCard>

                        <SectionCard title="Next steps" icon="Route">
                            <ul className="space-y-2 text-[12.5px]">
                                <li>
                                    <Link href="/education-loans/eligibility" className="font-semibold text-navy-600 hover:text-orange">
                                        Check your eligibility →
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/education-loans/calculator" className="font-semibold text-navy-600 hover:text-orange">
                                        Calculate your EMI →
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/education-loans/compare" className="font-semibold text-navy-600 hover:text-orange">
                                        Compare with other lenders →
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/scholarships" className="font-semibold text-navy-600 hover:text-orange">
                                        Reduce the loan with a scholarship →
                                    </Link>
                                </li>
                            </ul>
                        </SectionCard>
                    </aside>
                </div>
            </div>
        </>
    );
}
