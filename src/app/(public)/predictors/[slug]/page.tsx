import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { FaqAccordion, SectionCard } from '@/components/shared/content-blocks';
import { PredictorRunner } from '@/components/predictors/predictor-runner';
import { getPredictor, getPredictorList, getPredictorOptions } from '@/services/predictor.service';
import { getSettings, readString } from '@/services/settings.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const predictor = await getPredictor(slug);
    if (!predictor) {
        return buildMetadata({ title: 'Predictor not found', path: `/predictors/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: predictor.seo?.title ?? `${predictor.name} — Estimate Your Chances`,
        description: predictor.seo?.description ?? predictor.description,
        path: `/predictors/${predictor.slug}`,
    });
}

export default async function PredictorPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const predictor = await getPredictor(slug);
    if (!predictor) notFound();

    const [options, settings, others] = await Promise.all([
        getPredictorOptions(String(predictor._id)),
        getSettings(),
        getPredictorList(),
    ]);

    const faqJson = buildFaqJsonLd(
        (predictor.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
    );

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Predictors', href: '/predictors' },
                        { label: predictor.name, href: `/predictors/${predictor.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow={predictor.examShortName ? `${predictor.examShortName} tool` : 'Admission tool'}
                title={predictor.name}
                description={predictor.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Predictors', href: '/predictors' },
                    { label: predictor.examShortName ?? predictor.name },
                ]}
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-4">
                        <PredictorRunner
                            predictorSlug={predictor.slug}
                            predictorName={predictor.name}
                            metric={predictor.metric}
                            disclaimer={predictor.disclaimer}
                            options={options}
                            consentText={readString(settings, 'legal.consentText', 'I agree to be contacted.')}
                        />

                        {predictor.faqs?.length ? (
                            <SectionCard title="FAQs" icon="CircleHelp">
                                <FaqAccordion faqs={predictor.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
                            </SectionCard>
                        ) : null}
                    </div>

                    <aside className="space-y-4">
                        <SectionCard title="What you need" icon="ListChecks">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                <li>
                                    Your {predictor.metric === 'rank' ? 'All India Rank' : predictor.metric} from the scorecard
                                </li>
                                <li>Reservation category exactly as claimed in the application</li>
                                <li>Home state, if you are applying under a state quota</li>
                                <li>The counselling round you are planning for</li>
                            </ul>
                        </SectionCard>

                        <SectionCard title="Other predictors" icon="LayoutGrid">
                            <ul className="space-y-1.5">
                                {others
                                    .filter((p) => p.slug !== predictor.slug)
                                    .slice(0, 6)
                                    .map((p) => (
                                        <li key={String(p._id)}>
                                            <Link
                                                href={`/predictors/${p.slug}`}
                                                className="block truncate rounded-[9px] px-2 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-muted hover:text-navy-700"
                                            >
                                                {p.name}
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                        </SectionCard>

                        {predictor.examShortName ? (
                            <SectionCard title="Exam information" icon="FileText">
                                <p className="text-[12.5px] text-ink-soft">
                                    Check dates, eligibility, pattern and counselling details for{' '}
                                    <span className="font-semibold text-ink">{predictor.examShortName}</span>.
                                </p>
                                <Link href="/exams" className="link-more mt-2 inline-flex">
                                    Open exam pages →
                                </Link>
                            </SectionCard>
                        ) : null}
                    </aside>
                </div>
            </div>
        </>
    );
}
