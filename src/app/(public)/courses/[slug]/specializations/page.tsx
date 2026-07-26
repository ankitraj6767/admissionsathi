import type { Metadata } from 'next';
import { KeyValueGrid, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { CourseSubpage, buildCourseSubpageMetadata } from '@/components/courses/course-subpage';
import { formatCompactINR } from '@/lib/utils';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return buildCourseSubpageMetadata(slug, 'specializations');
}

export default async function CourseSpecializationsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <CourseSubpage slug={slug} kind="specializations">
            {(detail) => {
                if ('redirectTo' in detail) return null;
                const { specializations } = detail;

                return (
                    <SectionCard title="Available specialisations" icon="ListChecks">
                        {specializations.length === 0 ? (
                            <EmptyState icon="ListChecks" title="Specialisations are being added" />
                        ) : (
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {specializations.map((spec) => (
                                    <li key={String(spec._id)} className="rounded-[12px] border border-line p-3.5">
                                        <h3 className="text-[13.5px] font-extrabold text-ink">{spec.name}</h3>
                                        {spec.description ? (
                                            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{spec.description}</p>
                                        ) : null}
                                        <KeyValueGrid
                                            className="mt-3"
                                            columns={2}
                                            items={[
                                                {
                                                    label: 'Duration',
                                                    value: spec.durationMonths ? `${spec.durationMonths} months` : '—',
                                                },
                                                {
                                                    label: 'Salary range',
                                                    value: spec.averageSalary?.min
                                                        ? `${formatCompactINR(spec.averageSalary.min)} – ${formatCompactINR(spec.averageSalary.max)}`
                                                        : '—',
                                                },
                                            ]}
                                        />
                                        {spec.careerScope ? (
                                            <p className="mt-2 text-[11.5px] text-ink-soft">{spec.careerScope}</p>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>
                );
            }}
        </CourseSubpage>
    );
}
