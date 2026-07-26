import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CtaBanner, RichText, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getCollegeDetail } from '@/services/college.service';
import { Scholarship, type ScholarshipDoc } from '@/db/models/finance.model';
import { findLean, toPlain } from '@/db/repositories/base.repository';
import { formatCompactINR, formatDate } from '@/lib/utils';

export default async function CollegeScholarshipsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();
    const { college } = detail;

    const scholarships = toPlain(
        await findLean<ScholarshipDoc>(
            Scholarship,
            { status: 'published' },
            { limit: 8, sort: { isFeatured: -1 } },
        ),
    );

    return (
        <div className="space-y-4">
            <SectionCard title="Scholarships & fee waivers" icon="Award">
                <RichText html={college.scholarshipsHtml} />
            </SectionCard>

            <SectionCard
                title="Scholarships you can apply for"
                icon="Wallet"
                description="Government, private and institute schemes tracked on Admission Sathi"
                actions={
                    <Link href="/scholarships" className="link-more">
                        All scholarships →
                    </Link>
                }
            >
                {scholarships.length === 0 ? (
                    <EmptyState icon="Award" title="No scholarships listed yet" />
                ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {scholarships.map((item) => (
                            <li key={String(item._id)}>
                                <Link
                                    href={`/scholarships/${item.slug}`}
                                    className="block h-full rounded-[12px] border border-line p-3 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                >
                                    <p className="text-[12.5px] font-bold text-ink">{item.name}</p>
                                    <p className="mt-0.5 text-[11px] text-ink-soft">{item.provider}</p>
                                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-soft">
                                        <span className="font-semibold text-green">
                                            {item.amountMax ? `Up to ${formatCompactINR(item.amountMax)}` : item.benefitType}
                                        </span>
                                        {item.applicationDeadline ? (
                                            <span>• Apply by {formatDate(item.applicationDeadline)}</span>
                                        ) : null}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <CtaBanner
                title="Need help with scholarship applications?"
                description="Counsellors review your eligibility and document checklist at no cost."
                ctaLabel="Get scholarship help"
                ctaUrl={`/book-counselling?college=${college.slug}`}
                tone="teal"
            />
        </div>
    );
}
