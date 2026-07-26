import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { BookingForm } from '@/components/counselling/booking-form';
import { IconTile } from '@/components/ui/primitives';
import { getAvailableSlots } from '@/services/counselling.service';
import { getSettings, readString } from '@/services/settings.service';
import { listCourses } from '@/db/repositories/course.repository';
import { listStates } from '@/db/repositories/geo.repository';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import type { BookingFormValues } from '@/schemas/counselling.schema';

export interface CounsellingLandingProps {
    type: NonNullable<BookingFormValues['type']>;
    path: string;
    title: string;
    eyebrow: string;
    description: string;
    benefits: { icon: string; title: string; detail: string }[];
    agenda: string[];
}

/** Shared layout for the three counselling landing pages. */
export async function CounsellingLanding({
    type,
    path,
    title,
    eyebrow,
    description,
    benefits,
    agenda,
}: CounsellingLandingProps) {
    const [settings, slots, courses, states] = await Promise.all([
        getSettings(),
        getAvailableSlots(null, 7),
        listCourses({ pageSize: 40, sort: 'popular' }).then((r) => r.items),
        listStates({ limit: 40 }),
    ]);

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: title, href: path },
                ])}
            />

            <PageHeader
                eyebrow={eyebrow}
                title={title}
                description={description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: title },
                ]}
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-4">
                        <SectionCard title="What this session covers" icon="ListChecks">
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {benefits.map((benefit) => (
                                    <li key={benefit.title} className="flex gap-3 rounded-[12px] border border-line p-3">
                                        <IconTile icon={benefit.icon} tone="navy" size="sm" />
                                        <span>
                                            <span className="block text-[12.5px] font-bold text-ink">{benefit.title}</span>
                                            <span className="mt-0.5 block text-[11.5px] text-ink-soft">{benefit.detail}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </SectionCard>

                        <SectionCard title="Session agenda" icon="CalendarCheck">
                            <ol className="list-decimal space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                {agenda.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ol>
                        </SectionCard>

                        <SectionCard title="Before the session" icon="FileCheck">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                <li>Keep your latest marksheet or scorecard handy</li>
                                <li>Note a realistic annual budget range for fees</li>
                                <li>List two or three preferred cities or states</li>
                                <li>Write down the questions you most want answered</li>
                            </ul>
                        </SectionCard>

                        <CtaBanner
                            title="Explore on your own first?"
                            description="Use the predictors and comparison tools, then bring your shortlist to the session."
                            ctaLabel="Open predictors"
                            ctaUrl="/predictors"
                            tone="teal"
                        />
                    </div>

                    <div id="book">
                        <BookingForm
                            slots={slots}
                            courses={courses.map((c) => ({ label: c.name, value: c.slug }))}
                            states={states.map((s) => ({ label: s.name, value: String(s._id) }))}
                            consentText={readString(settings, 'legal.consentText', 'I agree to be contacted.')}
                            defaultType={type}
                        />
                        <p className="mt-3 text-center text-[11.5px] text-ink-soft">
                            Prefer a call?{' '}
                            <Link
                                href={`tel:${readString(settings, 'contact.phone', '').replace(/\s/g, '')}`}
                                className="font-bold text-navy-600 hover:text-orange"
                            >
                                {readString(settings, 'contact.phone', '')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
