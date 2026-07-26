import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EligibilityChecker } from '@/components/finance/eligibility-checker';
import { LOAN_DOCUMENT_CHECKLIST } from '@/config/finance';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Education Loan Eligibility Check — How Much Can You Borrow?',
    description:
        'Estimate your education loan eligibility from co-applicant income, existing EMIs, collateral and credit band. Free, instant and indicative.',
    path: '/education-loans/eligibility',
});

export default function LoanEligibilityPage() {
    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Education loans', href: '/education-loans' },
                    { label: 'Eligibility', href: '/education-loans/eligibility' },
                ])}
            />

            <PageHeader
                eyebrow="Loan tools"
                title="Check your loan eligibility"
                description="Lenders look at co-applicant income, existing obligations, collateral and credit history. This estimator applies those same rules conservatively."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Education loans', href: '/education-loans' },
                    { label: 'Eligibility' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <EligibilityChecker />

                <SectionCard title="What lenders actually check" icon="ShieldCheck">
                    <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                        <li>Co-applicant income stability and total existing obligations</li>
                        <li>Institute and course category (premier institutes get higher collateral-free limits)</li>
                        <li>Credit history of the co-applicant, and of the student where applicable</li>
                        <li>Collateral type, ownership clarity and assessed value</li>
                        <li>Expected employability and salary range after the course</li>
                    </ul>
                </SectionCard>

                <SectionCard title="Documents to prepare" icon="FileCheck">
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
                    title="Improve your chances before applying"
                    description="A finance counsellor reviews your profile and suggests the lenders most likely to approve."
                    ctaLabel="Talk to a finance counsellor"
                    ctaUrl="/book-counselling?type=loan"
                    tone="teal"
                />
            </div>
        </>
    );
}
