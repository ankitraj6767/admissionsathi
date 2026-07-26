import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, FaqAccordion, SectionCard } from '@/components/shared/content-blocks';
import { Badge, IconTile } from '@/components/ui/primitives';
import { getCounsellorDirectory } from '@/services/counselling.service';
import { listFaqs } from '@/db/repositories/content.repository';
import { COUNSELLING_TYPES } from '@/schemas/counselling.schema';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Admission & Career Counselling — Free Expert Guidance',
    description:
        'Free one-to-one counselling for course selection, college shortlisting, entrance exam planning, counselling rounds and education loans.',
    path: '/counselling',
});

const LIFECYCLE = [
    { step: 'New enquiry', detail: 'You submit a request; we capture your profile.' },
    { step: 'Counsellor call', detail: 'A counsellor contacts you to understand your goals.' },
    { step: 'Profile review', detail: 'We qualify eligibility, budget and location preferences.' },
    { step: 'Session scheduled', detail: 'A 30-minute one-to-one session is confirmed.' },
    { step: 'Shortlist & plan', detail: 'You receive a shortlist and a step-by-step admission plan.' },
    { step: 'Follow-up', detail: 'We track deadlines with you until admission is confirmed.' },
];

const TYPE_LINKS: Record<string, string> = {
    career: '/career-counselling',
    college: '/college-counselling',
    course: '/course-counselling',
    loan: '/education-loans',
    general: '/book-counselling',
};

export default async function CounsellingPage() {
    const [counsellors, faqs] = await Promise.all([
        getCounsellorDirectory(),
        listFaqs('global', undefined, 8),
    ]);

    const faqJson = buildFaqJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answerHtml })));

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Counselling', href: '/counselling' },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow="Counselling"
                title="Expert admission counselling — free"
                description="Our counsellors work on admissions every single season. They help you shortlist realistically, avoid expensive mistakes and stay on top of every deadline."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Counselling' }]}
                actions={
                    <Link
                        href="/book-counselling"
                        className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                    >
                        Book free counselling
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Choose the type of counselling" icon="Compass">
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {COUNSELLING_TYPES.map((type) => (
                            <li key={type.value}>
                                <Link
                                    href={TYPE_LINKS[type.value] ?? '/book-counselling'}
                                    className="flex h-full flex-col rounded-panel border border-line p-4 transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card"
                                >
                                    <IconTile
                                        icon={
                                            type.value === 'career'
                                                ? 'Compass'
                                                : type.value === 'college'
                                                    ? 'Building2'
                                                    : type.value === 'course'
                                                        ? 'BookOpen'
                                                        : type.value === 'loan'
                                                            ? 'Landmark'
                                                            : 'Headphones'
                                        }
                                        tone={type.value === 'loan' ? 'green' : 'navy'}
                                    />
                                    <p className="mt-2.5 text-[13.5px] font-extrabold text-ink">{type.label}</p>
                                    <p className="mt-0.5 text-[12px] text-ink-soft">{type.description}</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </SectionCard>

                <SectionCard title="How counselling works" icon="Route">
                    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {LIFECYCLE.map((item, index) => (
                            <li key={item.step} className="rounded-[12px] border border-line p-3.5">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11.5px] font-bold text-white">
                                    {index + 1}
                                </span>
                                <p className="mt-2 text-[13px] font-bold text-ink">{item.step}</p>
                                <p className="mt-0.5 text-[11.5px] text-ink-soft">{item.detail}</p>
                            </li>
                        ))}
                    </ol>
                </SectionCard>

                <SectionCard
                    title="Meet our counsellors"
                    icon="Users"
                    actions={
                        <Link href="/counsellors" className="link-more">
                            View directory →
                        </Link>
                    }
                >
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {counsellors.slice(0, 6).map((counsellor) => (
                            <li key={String(counsellor._id)}>
                                <Link
                                    href={`/counsellors/${counsellor.slug}`}
                                    className="flex h-full flex-col rounded-panel border border-line p-4 transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[13.5px] font-extrabold text-ink">{counsellor.name}</p>
                                        <Badge tone="green">{counsellor.rating.average.toFixed(1)}★</Badge>
                                    </div>
                                    <p className="mt-0.5 text-[11.5px] text-ink-soft">{counsellor.designation}</p>
                                    <p className="mt-2 line-clamp-2 text-[11.5px] text-ink-soft">
                                        {counsellor.specializations.join(' • ')}
                                    </p>
                                    <p className="mt-auto pt-2 text-[11px] font-semibold text-navy-600">
                                        {counsellor.experienceYears}+ years • {counsellor.languages.join(', ')}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </SectionCard>

                {faqs.length > 0 ? (
                    <SectionCard title="Counselling FAQs" icon="CircleHelp">
                        <FaqAccordion faqs={faqs.map((f) => ({ question: f.question, answer: f.answerHtml }))} />
                    </SectionCard>
                ) : null}

                <CtaBanner
                    title="Ready when you are"
                    description="Pick a slot that suits you — most students get a call back within a few hours."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling"
                />
            </div>
        </>
    );
}
