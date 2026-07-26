import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { KeyValueGrid, SectionCard } from '@/components/shared/content-blocks';
import { BookingForm } from '@/components/counselling/booking-form';
import { Badge } from '@/components/ui/primitives';
import { getAvailableSlots, getCounsellor } from '@/services/counselling.service';
import { getSettings, readString } from '@/services/settings.service';
import { listCourses } from '@/db/repositories/course.repository';
import { listStates } from '@/db/repositories/geo.repository';
import { getCounsellorBySlug } from '@/db/repositories/counsellor.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const counsellor = await getCounsellor(slug);
    if (!counsellor) {
        return buildMetadata({ title: 'Counsellor not found', path: `/counsellors/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: counsellor.seo?.title ?? `${counsellor.name} — ${counsellor.designation ?? 'Counsellor'}`,
        description:
            counsellor.seo?.description ??
            `Book a free counselling session with ${counsellor.name}, specialising in ${counsellor.specializations.join(', ')}.`,
        path: `/counsellors/${counsellor.slug}`,
    });
}

export default async function CounsellorProfilePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const counsellor = await getCounsellor(slug);
    if (!counsellor) notFound();

    const doc = await getCounsellorBySlug(slug);
    const [slots, settings, courses, states] = await Promise.all([
        getAvailableSlots(doc, 7),
        getSettings(),
        listCourses({ pageSize: 40, sort: 'popular' }).then((r) => r.items),
        listStates({ limit: 40 }),
    ]);

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Counsellors', href: '/counsellors' },
                    { label: counsellor.name, href: `/counsellors/${counsellor.slug}` },
                ])}
            />

            <PageHeader
                eyebrow={counsellor.designation}
                title={counsellor.name}
                description={counsellor.bio}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Counsellors', href: '/counsellors' },
                    { label: counsellor.name },
                ]}
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-4">
                        <SectionCard title="Profile" icon="UserCheck">
                            <KeyValueGrid
                                columns={4}
                                items={[
                                    { label: 'Experience', value: `${counsellor.experienceYears ?? 0}+ years` },
                                    { label: 'Rating', value: `${counsellor.rating.average.toFixed(1)}★ (${counsellor.rating.count})` },
                                    { label: 'Sessions completed', value: counsellor.completedSessions },
                                    { label: 'Free session', value: `${counsellor.freeSessionMinutes} minutes` },
                                ]}
                            />
                        </SectionCard>

                        <SectionCard title="Specialisations" icon="ListChecks">
                            <div className="flex flex-wrap gap-1.5">
                                {counsellor.specializations.map((item) => (
                                    <Badge key={item} tone="navy" size="lg">
                                        {item}
                                    </Badge>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Languages & qualifications" icon="Globe">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Languages</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {counsellor.languages.map((language) => (
                                            <Badge key={language} tone="neutral" size="lg">
                                                {language}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                                        Qualifications
                                    </p>
                                    <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-soft">
                                        {counsellor.qualifications.map((qualification) => (
                                            <li key={qualification}>{qualification}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Session modes" icon="Video">
                            <div className="flex flex-wrap gap-1.5">
                                {counsellor.sessionModes.map((mode) => (
                                    <Badge key={mode} tone="teal" size="lg">
                                        {mode}
                                    </Badge>
                                ))}
                            </div>
                            {counsellor.paidSessionFee ? (
                                <p className="mt-3 text-[12px] text-ink-soft">
                                    Extended {counsellor.paidSessionMinutes}-minute sessions are available at ₹
                                    {counsellor.paidSessionFee.toLocaleString('en-IN')}. The first session is always free.
                                </p>
                            ) : null}
                        </SectionCard>
                    </div>

                    <div>
                        <BookingForm
                            slots={slots}
                            courses={courses.map((c) => ({ label: c.name, value: c.slug }))}
                            states={states.map((s) => ({ label: s.name, value: String(s._id) }))}
                            consentText={readString(settings, 'legal.consentText', 'I agree to be contacted.')}
                            counsellorSlug={counsellor.slug}
                            counsellorName={counsellor.name}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
