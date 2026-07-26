import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { BookingForm } from '@/components/counselling/booking-form';
import { Badge } from '@/components/ui/primitives';
import { getAvailableSlots, getCounsellor, getCounsellorDirectory } from '@/services/counselling.service';
import { getSettings, readString } from '@/services/settings.service';
import { listCourses } from '@/db/repositories/course.repository';
import { listStates } from '@/db/repositories/geo.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import type { CounsellorDoc } from '@/db/models/counselling.model';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
    title: 'Book Free Counselling — Talk to an Admission Expert',
    description:
        'Book a free 30-minute counselling session with an Admission Sathi expert. Get help with course selection, college shortlisting, entrance exams, counselling rounds and education loans.',
    path: '/book-counselling',
});

export default async function BookCounsellingPage({
    searchParams,
}: {
    searchParams: Promise<{
        counsellor?: string;
        type?: string;
        college?: string;
        exam?: string;
        course?: string;
    }>;
}) {
    const query = await searchParams;

    const [settings, counsellors, courses, states] = await Promise.all([
        getSettings(),
        getCounsellorDirectory(),
        listCourses({ pageSize: 40, sort: 'popular' }).then((r) => r.items),
        listStates({ limit: 40 }),
    ]);

    const counsellor = query.counsellor ? await getCounsellor(query.counsellor) : null;
    const slots = await getAvailableSlots((counsellor as CounsellorDoc | null) ?? null, 7);

    const allowedTypes = ['career', 'college', 'course', 'loan', 'general'] as const;
    const defaultType = allowedTypes.includes(query.type as (typeof allowedTypes)[number])
        ? (query.type as (typeof allowedTypes)[number])
        : 'general';

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: 'Book free counselling', href: '/book-counselling' },
                ])}
            />

            <PageHeader
                eyebrow="100% free"
                title="Book your free counselling session"
                description="One-to-one guidance from counsellors who work on admissions every day. No charge, no obligation."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: 'Book free counselling' },
                ]}
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <BookingForm
                        slots={slots}
                        courses={courses.map((c) => ({ label: c.name, value: c.slug }))}
                        states={states.map((s) => ({ label: s.name, value: String(s._id) }))}
                        consentText={readString(settings, 'legal.consentText', 'I agree to be contacted.')}
                        counsellorSlug={counsellor?.slug}
                        counsellorName={counsellor?.name}
                        defaultType={defaultType}
                        collegeSlug={query.college}
                        examSlug={query.exam}
                        courseSlug={query.course}
                    />

                    <aside className="space-y-4">
                        <SectionCard title="What you get" icon="BadgeCheck">
                            <ul className="space-y-2 text-[12.5px] text-ink-soft">
                                <li className="flex gap-2">
                                    <span className="text-green">✓</span> A shortlist matched to your score and budget
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-green">✓</span> Clarity on eligibility and documents
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-green">✓</span> Counselling round strategy and backup options
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-green">✓</span> Education loan and scholarship guidance
                                </li>
                            </ul>
                        </SectionCard>

                        <SectionCard title="Our counsellors" icon="Users">
                            <ul className="space-y-2">
                                {counsellors.slice(0, 5).map((item) => (
                                    <li key={String(item._id)}>
                                        <Link
                                            href={`/counsellors/${item.slug}`}
                                            className="block rounded-[10px] border border-line px-3 py-2 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-[12.5px] font-bold text-ink">{item.name}</span>
                                                <Badge tone="green">{item.rating.average.toFixed(1)}★</Badge>
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                                                {item.designation} • {item.experienceYears}+ yrs
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/counsellors" className="link-more mt-3 inline-flex">
                                View all counsellors →
                            </Link>
                        </SectionCard>

                        <SectionCard title="Prefer to talk now?" icon="Phone">
                            <a
                                href={`tel:${readString(settings, 'contact.phone', '').replace(/\s/g, '')}`}
                                className="block text-[15px] font-extrabold text-navy-700"
                            >
                                {readString(settings, 'contact.phone', '')}
                            </a>
                            <p className="mt-1 text-[11.5px] text-ink-soft">
                                {readString(settings, 'contact.workingHours', '')}
                            </p>
                        </SectionCard>
                    </aside>
                </div>
            </div>
        </>
    );
}
