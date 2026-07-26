import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, FaqAccordion, SectionCard } from '@/components/shared/content-blocks';
import { LoanCalculator } from '@/components/finance/loan-calculator';
import { listLoanProviders } from '@/services/finance.service';
import { LOAN_FAQS } from '@/config/finance';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Education Loan EMI Calculator — Monthly EMI & Full Schedule',
    description:
        'Calculate your education loan EMI with moratorium interest, processing fee, total interest and a downloadable month-by-month amortisation schedule.',
    path: '/education-loans/calculator',
});

export default async function LoanCalculatorPage() {
    const providers = await listLoanProviders();
    const faqJson = buildFaqJsonLd(LOAN_FAQS);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Education loans', href: '/education-loans' },
                        { label: 'EMI calculator', href: '/education-loans/calculator' },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow="Loan tools"
                title="Education loan EMI calculator"
                description="Model the real cost of your loan: moratorium interest, processing fee, total interest and the full repayment schedule."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Education loans', href: '/education-loans' },
                    { label: 'EMI calculator' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <LoanCalculator
                    providers={providers.map((p) => ({
                        label: `${p.name} (${p.interestRateMin}%+)`,
                        value: p.slug,
                        rate: p.interestRateMin,
                    }))}
                />

                <SectionCard title="How to read these numbers" icon="Info">
                    <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                        <li>
                            <strong className="text-ink">Moratorium interest</strong> accrues while you study. If you do not
                            service it monthly, it is added to the principal and you pay interest on interest.
                        </li>
                        <li>
                            <strong className="text-ink">Total repayment</strong> is what leaves your account over the tenure —
                            compare this, not just the EMI.
                        </li>
                        <li>
                            A longer tenure lowers the EMI but raises total interest. Prepayment (where allowed without penalty)
                            is the cheapest way to cut cost.
                        </li>
                    </ul>
                </SectionCard>

                <SectionCard title="Education loan FAQs" icon="CircleHelp">
                    <FaqAccordion faqs={LOAN_FAQS} />
                </SectionCard>

                <CtaBanner
                    title="Want help getting the loan sanctioned?"
                    description="A finance counsellor reviews your documents and lender options — free."
                    ctaLabel="Talk to a finance counsellor"
                    ctaUrl="/book-counselling?type=loan"
                />
            </div>
        </>
    );
}
