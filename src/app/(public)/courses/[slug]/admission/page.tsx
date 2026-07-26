import type { Metadata } from 'next';
import Link from 'next/link';
import { RichText, SectionCard } from '@/components/shared/content-blocks';
import { CourseSubpage, buildCourseSubpageMetadata } from '@/components/courses/course-subpage';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return buildCourseSubpageMetadata(slug, 'admission');
}

export default async function CourseAdmissionPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <CourseSubpage slug={slug} kind="admission">
            {(detail) => {
                if ('redirectTo' in detail) return null;
                const { course } = detail;
                const exams = (course.entranceExams ?? []) as unknown as {
                    _id: string;
                    slug: string;
                    shortName: string;
                    name: string;
                }[];

                return (
                    <>
                        <SectionCard title="Eligibility" icon="ShieldCheck">
                            <RichText html={course.eligibility} />
                        </SectionCard>

                        <SectionCard title="Step-by-step admission process" icon="Route">
                            <RichText html={course.admissionProcess} />
                        </SectionCard>

                        {exams.length > 0 ? (
                            <SectionCard title="Entrance exams accepted" icon="FileText">
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {exams.map((exam) => (
                                        <li key={String(exam._id)}>
                                            <Link
                                                href={`/exams/${exam.slug}`}
                                                className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/60"
                                            >
                                                <span>
                                                    <span className="block text-[13px] font-bold text-ink">{exam.shortName}</span>
                                                    <span className="block text-[11px] text-ink-soft">{exam.name}</span>
                                                </span>
                                                <span className="text-[11.5px] font-bold text-navy-600">Dates & pattern →</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        <SectionCard title="Documents usually required" icon="FileCheck">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                <li>Class 10 and 12 marksheets and passing certificates</li>
                                <li>Entrance exam scorecard and admit card (where applicable)</li>
                                <li>Transfer / migration certificate</li>
                                <li>Category, domicile and income certificates (if claiming reservation or fee concession)</li>
                                <li>Aadhaar or other government photo ID and passport-size photographs</li>
                            </ul>
                        </SectionCard>
                    </>
                );
            }}
        </CourseSubpage>
    );
}
