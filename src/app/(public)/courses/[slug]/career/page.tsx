import type { Metadata } from 'next';
import { KeyValueGrid, RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { CourseSubpage, buildCourseSubpageMetadata } from '@/components/courses/course-subpage';
import { formatCompactINR } from '@/lib/utils';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return buildCourseSubpageMetadata(slug, 'career');
}

export default async function CourseCareerPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return (
        <CourseSubpage slug={slug} kind="career">
            {(detail) => {
                if ('redirectTo' in detail) return null;
                const { course } = detail;

                return (
                    <>
                        <SectionCard title="Salary expectations" icon="TrendingUp">
                            <KeyValueGrid
                                columns={2}
                                items={[
                                    {
                                        label: 'Typical starting salary',
                                        value: course.averageSalary?.min ? formatCompactINR(course.averageSalary.min) : '—',
                                    },
                                    {
                                        label: 'With experience (up to)',
                                        value: course.averageSalary?.max ? formatCompactINR(course.averageSalary.max) : '—',
                                    },
                                ]}
                            />
                            {course.averageSalary?.note ? (
                                <p className="mt-2 text-[11.5px] text-ink-soft">{course.averageSalary.note}</p>
                            ) : null}
                        </SectionCard>

                        <SectionCard title="Career scope" icon="Compass">
                            <RichText html={course.careerHtml} />
                        </SectionCard>

                        {course.jobRoles?.length ? (
                            <SectionCard title="Common job roles" icon="Briefcase">
                                <div className="flex flex-wrap gap-1.5">
                                    {course.jobRoles.map((role) => (
                                        <Badge key={role} tone="navy" size="lg">
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </SectionCard>
                        ) : null}

                        {course.topRecruiters?.length ? (
                            <SectionCard title="Recruiters" icon="Building2">
                                <div className="flex flex-wrap gap-1.5">
                                    {course.topRecruiters.map((recruiter) => (
                                        <Badge key={recruiter} tone="neutral" size="lg">
                                            {recruiter}
                                        </Badge>
                                    ))}
                                </div>
                            </SectionCard>
                        ) : null}

                        <SectionCard title="Higher study options" icon="GraduationCap">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                <li>Postgraduate specialisation in the same discipline</li>
                                <li>Management education after a few years of work experience</li>
                                <li>Competitive examinations for public sector and civil services</li>
                                <li>Research pathways leading to a doctorate</li>
                            </ul>
                        </SectionCard>
                    </>
                );
            }}
        </CourseSubpage>
    );
}
