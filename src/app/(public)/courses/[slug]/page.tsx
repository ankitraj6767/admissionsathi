import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import {
    CtaBanner,
    DataNotice,
    FaqAccordion,
    KeyValueGrid,
    RichText,
    SectionCard,
} from '@/components/shared/content-blocks';
import { Badge, IconTile } from '@/components/ui/primitives';
import { CourseCard, toCourseCard } from '@/components/courses/course-card';
import { getCourseDetail } from '@/services/course.service';
import { incrementViewCount } from '@/services/analytics.service';
import { formatCompactINR, formatCurrency } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildCourseJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const detail = await getCourseDetail(slug);
    if (!detail || 'redirectTo' in detail) {
        return buildMetadata({ title: 'Course not found', path: `/courses/${slug}`, noIndex: true });
    }
    const { course } = detail;
    return buildMetadata({
        title: course.seo?.title ?? `${course.name} — Eligibility, Fees, Colleges & Career`,
        description:
            course.seo?.description ??
            `${course.name}: eligibility, duration, fees, entrance exams, specialisations, syllabus, top colleges and career options.`,
        path: `/courses/${course.slug}`,
        noIndex: course.seo?.noIndex,
    });
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const detail = await getCourseDetail(slug);
    if (!detail) notFound();
    if ('redirectTo' in detail) redirect(`/courses/${detail.redirectTo}`);

    const { course, specializations, colleges, related, articles } = detail;
    void incrementViewCount('course', String(course._id));

    const exams = (course.entranceExams ?? []) as unknown as {
        _id: string;
        slug: string;
        shortName: string;
        name: string;
    }[];

    const faqJson = buildFaqJsonLd((course.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })));

    const tabs = [
        { label: 'Overview', href: `/courses/${course.slug}` },
        { label: 'Colleges', href: `/courses/${course.slug}/colleges` },
        { label: 'Specialisations', href: `/courses/${course.slug}/specializations` },
        { label: 'Admission', href: `/courses/${course.slug}/admission` },
        { label: 'Syllabus', href: `/courses/${course.slug}/syllabus` },
        { label: 'Fees', href: `/courses/${course.slug}/fees` },
        { label: 'Career', href: `/courses/${course.slug}/career` },
    ];

    return (
        <>
            <JsonLd
                data={[
                    buildCourseJsonLd({
                        name: course.name,
                        slug: course.slug,
                        description: course.overview,
                        durationMonths: course.durationMonths,
                        level: course.level,
                    }),
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Courses', href: '/courses' },
                        { label: course.name, href: `/courses/${course.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow={course.categoryName}
                title={course.name}
                description={course.overview ? undefined : `${course.level} • ${course.durationLabel}`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: course.shortName ?? course.name },
                ]}
                actions={
                    <>
                        <Link
                            href={`/courses/${course.slug}/colleges`}
                            className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                        >
                            {course.collegeCount} colleges
                        </Link>
                        <Link
                            href={`/book-counselling?course=${course.slug}`}
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            Get free guidance
                        </Link>
                    </>
                }
            >
                <nav aria-label="Course sections" className="overflow-x-auto no-scrollbar">
                    <ul className="flex min-w-max gap-1.5">
                        {tabs.map((tab) => (
                            <li key={tab.href}>
                                <Link
                                    href={tab.href}
                                    className="inline-flex h-8 items-center rounded-pill border border-white/20 bg-white/10 px-3 text-[11.5px] font-semibold text-white hover:bg-white/20"
                                >
                                    {tab.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </PageHeader>

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        <SectionCard title="Course overview" icon={course.icon ?? 'GraduationCap'}>
                            <KeyValueGrid
                                columns={4}
                                className="mb-4"
                                items={[
                                    { label: 'Level', value: course.level },
                                    { label: 'Duration', value: course.durationLabel },
                                    { label: 'Study modes', value: course.studyModes?.join(', ') || '—' },
                                    { label: 'Colleges', value: course.collegeCount },
                                ]}
                            />
                            <RichText html={course.overview} />
                        </SectionCard>

                        <SectionCard title="Eligibility" icon="ShieldCheck">
                            <RichText html={course.eligibility} />
                        </SectionCard>

                        <SectionCard title="Admission process" icon="Route">
                            <RichText html={course.admissionProcess} />
                            {exams.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {exams.map((exam) => (
                                        <Link key={String(exam._id)} href={`/exams/${exam.slug}`} className="chip">
                                            {exam.shortName}
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                        </SectionCard>

                        <SectionCard title="Fees" icon="IndianRupee">
                            <KeyValueGrid
                                columns={3}
                                items={[
                                    { label: 'Average fee (from)', value: formatCurrency(course.averageFee?.min) },
                                    { label: 'Average fee (up to)', value: formatCurrency(course.averageFee?.max) },
                                    { label: 'Currency', value: course.averageFee?.currency ?? 'INR' },
                                ]}
                            />
                            <DataNotice className="mt-3" note={course.averageFee?.note} />
                        </SectionCard>

                        {specializations.length > 0 ? (
                            <SectionCard
                                title="Specialisations"
                                icon="ListChecks"
                                description={`${specializations.length} popular specialisations`}
                                actions={
                                    <Link href={`/courses/${course.slug}/specializations`} className="link-more">
                                        View all →
                                    </Link>
                                }
                            >
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {specializations.slice(0, 8).map((spec) => (
                                        <li
                                            key={String(spec._id)}
                                            className="rounded-[10px] border border-line px-3 py-2.5 text-[12.5px]"
                                        >
                                            <p className="font-bold text-ink">{spec.name}</p>
                                            {spec.description ? (
                                                <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-soft">{spec.description}</p>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        <SectionCard title="Syllabus" icon="BookOpenCheck">
                            <RichText html={course.syllabusHtml} />
                        </SectionCard>

                        <SectionCard title="Career & salary" icon="TrendingUp">
                            <KeyValueGrid
                                columns={2}
                                className="mb-3"
                                items={[
                                    {
                                        label: 'Average starting salary',
                                        value: course.averageSalary?.min ? formatCompactINR(course.averageSalary.min) : '—',
                                    },
                                    {
                                        label: 'Experienced salary (up to)',
                                        value: course.averageSalary?.max ? formatCompactINR(course.averageSalary.max) : '—',
                                    },
                                ]}
                            />
                            <RichText html={course.careerHtml} />

                            {course.jobRoles?.length ? (
                                <div className="mt-3">
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Job roles</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {course.jobRoles.map((role) => (
                                            <Badge key={role} tone="navy" size="lg">
                                                {role}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {course.topRecruiters?.length ? (
                                <div className="mt-3">
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                                        Top recruiters
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {course.topRecruiters.map((recruiter) => (
                                            <Badge key={recruiter} tone="neutral" size="lg">
                                                {recruiter}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </SectionCard>

                        {colleges.items.length > 0 ? (
                            <SectionCard
                                title={`Colleges offering ${course.shortName ?? course.name}`}
                                icon="Building2"
                                actions={
                                    <Link href={`/courses/${course.slug}/colleges`} className="link-more">
                                        View all {course.collegeCount} →
                                    </Link>
                                }
                            >
                                <ul className="divide-y divide-line">
                                    {colleges.items.slice(0, 6).map((row) => (
                                        <li key={String(row._id)} className="flex items-center justify-between gap-3 py-2.5">
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/colleges/${row.collegeSlug}`}
                                                    className="block truncate text-[13px] font-bold text-ink hover:text-navy-700"
                                                >
                                                    {row.collegeName}
                                                </Link>
                                                <p className="text-[11px] text-ink-soft">
                                                    {row.durationLabel} • {row.studyMode}
                                                    {row.totalSeats ? ` • ${row.totalSeats} seats` : ''}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[12.5px] font-bold text-ink">
                                                {formatCompactINR(row.annualFee)}/yr
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {course.faqs?.length ? (
                            <SectionCard title="FAQs" icon="CircleHelp">
                                <FaqAccordion faqs={course.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
                            </SectionCard>
                        ) : null}

                        <CtaBanner
                            title={`Is ${course.shortName ?? course.name} right for you?`}
                            description="Get a free counselling session to match this course with your marks, budget and career goal."
                            ctaLabel="Book free counselling"
                            ctaUrl={`/book-counselling?course=${course.slug}`}
                        />
                    </div>

                    <aside className="space-y-4">
                        <SectionCard title="Quick facts" icon="Info">
                            <ul className="space-y-2 text-[12.5px]">
                                <li className="flex items-center justify-between gap-2">
                                    <span className="text-ink-soft">Category</span>
                                    <span className="font-bold text-ink">{course.categoryName}</span>
                                </li>
                                <li className="flex items-center justify-between gap-2">
                                    <span className="text-ink-soft">Level</span>
                                    <span className="font-bold text-ink">{course.level}</span>
                                </li>
                                <li className="flex items-center justify-between gap-2">
                                    <span className="text-ink-soft">Duration</span>
                                    <span className="font-bold text-ink">{course.durationLabel}</span>
                                </li>
                                <li className="flex items-center justify-between gap-2">
                                    <span className="text-ink-soft">Colleges</span>
                                    <span className="font-bold text-ink">{course.collegeCount}</span>
                                </li>
                            </ul>
                        </SectionCard>

                        {course.skills?.length ? (
                            <SectionCard title="Skills you build" icon="Sparkles">
                                <ul className="flex flex-wrap gap-1.5">
                                    {course.skills.map((skill) => (
                                        <li key={skill} className="chip">
                                            {skill}
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {articles.length > 0 ? (
                            <SectionCard title="Related reading" icon="Newspaper">
                                <ul className="space-y-2">
                                    {articles.map((article) => (
                                        <li key={String(article._id)}>
                                            <Link
                                                href={`/articles/${article.slug}`}
                                                className="block text-[12.5px] font-semibold text-ink hover:text-navy-700"
                                            >
                                                {article.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}
                    </aside>
                </div>

                {related.length > 0 ? (
                    <section className="mt-6">
                        <h2 className="section-title mb-3">Related courses</h2>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {related.map((item) => (
                                <CourseCard key={String(item._id)} course={toCourseCard(item)} />
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </>
    );
}
