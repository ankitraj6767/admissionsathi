import type { Metadata } from 'next';
import { RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { CourseSubpage, buildCourseSubpageMetadata } from '@/components/courses/course-subpage';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return buildCourseSubpageMetadata(slug, 'syllabus');
}

export default async function CourseSyllabusPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return (
        <CourseSubpage slug={slug} kind="syllabus">
            {(detail) => {
                if ('redirectTo' in detail) return null;
                const { course } = detail;

                return (
                    <>
                        <SectionCard title="Curriculum outline" icon="BookOpenCheck">
                            <RichText html={course.syllabusHtml} />
                        </SectionCard>

                        {course.skills?.length ? (
                            <SectionCard title="Skills developed" icon="Sparkles">
                                <div className="flex flex-wrap gap-1.5">
                                    {course.skills.map((skill) => (
                                        <Badge key={skill} tone="navy" size="lg">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </SectionCard>
                        ) : null}

                        <SectionCard title="Assessment pattern" icon="ClipboardList">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                <li>Internal assessment through assignments, quizzes and mid-term tests</li>
                                <li>End-semester theory and practical examinations</li>
                                <li>Laboratory / clinical work evaluated continuously, where applicable</li>
                                <li>Final-year project, dissertation or internship report</li>
                            </ul>
                        </SectionCard>
                    </>
                );
            }}
        </CourseSubpage>
    );
}
