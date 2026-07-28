import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState, IconTile } from '@/components/ui/primitives';
import { getPredictorList } from '@/services/predictor.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'College Predictors — Estimate Your Admission Chances',
    description:
        'Rule-based college predictors for JEE Main, JEE Advanced, NEET UG, NEET PG, CUET, CAT, CLAT and more. Enter your rank or percentile to see probability bands built from previous-year closing data.',
    path: '/predictors',
});

export default async function PredictorsPage() {
    const predictors = await getPredictorList();

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Predictors', href: '/predictors' },
                    ]),
                    buildItemListJsonLd(
                        predictors.map((p) => ({ name: p.name, url: `/predictors/${p.slug}` })),
                        'College predictors',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Admission tools"
                title="College predictors"
                description="Enter your score, category and quota to see where your chances are estimated as high, moderate or low. Every prediction is built from imported previous-year closing data and configurable rules — not guesswork."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Predictors' }]}
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title={`${predictors.length} predictors available`} icon="Target">
                    {predictors.length === 0 ? (
                        <EmptyState
                            icon="Target"
                            title="No predictors published yet"
                            description="Predictors are configured from the admin dashboard with imported cut-off datasets."
                        />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {predictors.map((predictor) => (
                                <li key={String(predictor._id)}>
                                    <Link
                                        href={`/predictors/${predictor.slug}`}
                                        className="flex h-full flex-col rounded-panel border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised"
                                    >
                                        <div className="flex items-start gap-3">
                                            <IconTile icon={predictor.icon} tone={predictor.themeColor} />
                                            <div className="min-w-0">
                                                <p className="text-[13.5px] font-extrabold text-ink">{predictor.name}</p>
                                                <p className="text-[11px] text-ink-soft">{predictor.subtitle}</p>
                                            </div>
                                        </div>
                                        <p className="mt-2.5 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
                                            {predictor.description}
                                        </p>
                                        <span className="mt-3 inline-flex h-8 items-center self-start rounded-[8px] bg-orange-50 px-3 text-[11.5px] font-bold text-orange-700">
                                            {predictor.ctaLabel ?? 'Check Now'} →
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard title="How our predictors work" icon="Info">
                    <ol className="list-decimal space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                        <li>Admins import verified previous-year closing data (rank, percentile or score) per exam.</li>
                        <li>Datasets are validated, previewed and versioned before publishing.</li>
                        <li>Your input is compared against the closing values for your category, quota and round.</li>
                        <li>The ratio is mapped to a probability band using rules that admins can retune.</li>
                        <li>Results are estimates. They are never presented as guaranteed admission.</li>
                    </ol>
                </SectionCard>

                <CtaBanner
                    title="Prefer a human review of your options?"
                    description="Book a free counselling session and a counsellor will build your preference list with you."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling"
                />
            </div>
        </>
    );
}
