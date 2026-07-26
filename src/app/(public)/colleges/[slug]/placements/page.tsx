import { notFound } from 'next/navigation';
import { CtaBanner, DataNotice, KeyValueGrid, RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getCollegeDetail } from '@/services/college.service';
import { formatCompactINR } from '@/lib/utils';

export default async function CollegePlacementsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();

    const { college } = detail;
    const placement = college.placement;

    return (
        <div className="space-y-4">
            <SectionCard
                title="Placement highlights"
                icon="TrendingUp"
                description={placement?.year ? `Reported for the ${placement.year} cycle` : undefined}
            >
                <KeyValueGrid
                    columns={4}
                    items={[
                        { label: 'Highest package', value: formatCompactINR(placement?.highestPackage) },
                        { label: 'Average package', value: formatCompactINR(placement?.averagePackage) },
                        { label: 'Median package', value: formatCompactINR(placement?.medianPackage) },
                        {
                            label: 'Students placed',
                            value: placement?.placementPercentage ? `${placement.placementPercentage}%` : '—',
                        },
                    ]}
                />
                <RichText className="mt-4" html={placement?.summaryHtml} />
                <DataNotice className="mt-4" note={college.dataSourceNote} />
            </SectionCard>

            {placement?.topRecruiters?.length ? (
                <SectionCard title="Recruiters" icon="Briefcase">
                    <div className="flex flex-wrap gap-1.5">
                        {placement.topRecruiters.map((recruiter) => (
                            <Badge key={recruiter} tone="neutral" size="lg">
                                {recruiter}
                            </Badge>
                        ))}
                    </div>
                </SectionCard>
            ) : null}

            <SectionCard title="How to read a placement report" icon="Info">
                <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                    <li>Check how many students were eligible and how many actually participated.</li>
                    <li>Median matters more than the highest package — one outlier lifts the average.</li>
                    <li>Look at branch-wise splits, not just the institute-level number.</li>
                    <li>Ask whether internships and stipend-only offers are counted.</li>
                </ul>
            </SectionCard>

            <CtaBanner
                title="Want a realistic placement expectation for your branch?"
                description="Counsellors share branch-level trends and help you build a backup plan."
                ctaLabel="Book free counselling"
                ctaUrl={`/book-counselling?college=${college.slug}`}
                tone="teal"
            />
        </div>
    );
}
