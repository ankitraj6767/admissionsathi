import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner } from '@/components/shared/content-blocks';
import { getCourseDetail } from '@/services/course.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import type { Metadata } from 'next';

export type CourseSubpageKind = 'specializations' | 'admission' | 'syllabus' | 'career' | 'fees';

const LABELS: Record<CourseSubpageKind, { title: string; description: string }> = {
    specializations: {
        title: 'Specialisations',
        description: 'Popular specialisations, focus areas and expected salary ranges.',
    },
    admission: {
        title: 'Admission process',
        description: 'Eligibility, accepted entrance exams and the step-by-step admission route.',
    },
    syllabus: {
        title: 'Syllabus',
        description: 'Semester-wise curriculum outline, core papers and practical work.',
    },
    career: {
        title: 'Career & scope',
        description: 'Job roles, top recruiters, salary progression and higher-study options.',
    },
    fees: {
        title: 'Fees',
        description: 'Indicative fee ranges, additional costs and financing options.',
    },
};

export async function buildCourseSubpageMetadata(
    slug: string,
    kind: CourseSubpageKind,
): Promise<Metadata> {
    const detail = await getCourseDetail(slug);
    if (!detail || 'redirectTo' in detail) {
        return buildMetadata({ title: 'Not found', path: `/courses/${slug}/${kind}`, noIndex: true });
    }
    const { course } = detail;
    return buildMetadata({
        title: `${course.name} ${LABELS[kind].title}`,
        description: `${course.name}: ${LABELS[kind].description}`,
        path: `/courses/${course.slug}/${kind}`,
    });
}

/** Shared shell for the course detail sub-routes. */
export async function CourseSubpage({
    slug,
    kind,
    children,
}: {
    slug: string;
    kind: CourseSubpageKind;
    children: (detail: NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>) => React.ReactNode;
}) {
    const detail = await getCourseDetail(slug);
    if (!detail) notFound();
    if ('redirectTo' in detail) redirect(`/courses/${detail.redirectTo}/${kind}`);

    const { course } = detail;
    const meta = LABELS[kind];

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: course.name, href: `/courses/${course.slug}` },
                    { label: meta.title, href: `/courses/${course.slug}/${kind}` },
                ])}
            />

            <PageHeader
                eyebrow={course.categoryName}
                title={`${course.name} — ${meta.title}`}
                description={meta.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: course.shortName ?? course.name, href: `/courses/${course.slug}` },
                    { label: meta.title },
                ]}
                actions={
                    <Link
                        href={`/courses/${course.slug}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Full course overview
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {children(detail)}

                <CtaBanner
                    title="Still deciding?"
                    description="Talk to a counsellor for a free shortlist based on your marks, budget and location."
                    ctaLabel="Book free counselling"
                    ctaUrl={`/book-counselling?course=${course.slug}`}
                />
            </div>
        </>
    );
}
