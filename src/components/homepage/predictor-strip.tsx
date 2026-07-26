import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { PredictorDoc } from '@/db/models/predictor.model';
import type { ResolvedSection } from '@/services/homepage.service';
import type { CollegePredictorConfig } from '@/schemas/homepage.schema';

const iconTone: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    blue: 'bg-blue-50 text-blue',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green',
    purple: 'bg-purple-50 text-purple',
    pink: 'bg-pink-50 text-pink',
};

/** Navy "Predict Your College" band with admin-controlled predictor cards. */
export function PredictorStrip({
    section,
    predictors,
}: {
    section: ResolvedSection<CollegePredictorConfig>;
    predictors: PredictorDoc[];
}) {
    const config = section.config;

    return (
        <section
            aria-labelledby="predictor-heading"
            className="overflow-hidden rounded-panel bg-navy-800 p-4 text-white shadow-raised md:p-5"
        >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
                <div>
                    <h2 id="predictor-heading" className="font-display text-[17px] font-extrabold leading-tight">
                        {section.heading ?? 'Predict Your College'}
                    </h2>
                    {section.description ? (
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/70">{section.description}</p>
                    ) : null}
                    {section.ctaLabel && section.ctaUrl ? (
                        <Link
                            href={section.ctaUrl}
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-white/10 px-3 text-[11.5px] font-bold text-white transition-colors hover:bg-white/20"
                        >
                            {section.ctaLabel}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                    ) : null}
                </div>

                {/*
                 * This band sits in the homepage's left column, so the card row only
                 * gets ~560px at 1440px wide. The old `xl:grid-cols-7` divided that
                 * by the maximum card count, leaving ~90px per card and truncating
                 * every title to "J…".
                 *
                 * Two changes keep titles legible: at most 4 columns (3 predictors +
                 * the "More" card), and the icon sits above the title so the label
                 * gets the full card width and wraps instead of clipping. Extra cards
                 * from a higher admin limit wrap to a second row rather than shrink.
                 */}
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {predictors.slice(0, config.limit).map((predictor) => (
                        <li key={String(predictor._id)}>
                            <Link
                                href={`/predictors/${predictor.slug}`}
                                className="group flex h-full min-h-[112px] flex-col justify-between gap-2 rounded-[12px] bg-white p-2.5 text-left transition-transform duration-300 hover:-translate-y-0.5"
                            >
                                <span className="block">
                                    <span
                                        className={cn(
                                            'inline-flex h-7 w-7 items-center justify-center rounded-[8px]',
                                            iconTone[predictor.themeColor] ?? iconTone.navy,
                                        )}
                                    >
                                        <Icon name={predictor.icon} className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="mt-1.5 block text-[11.5px] font-extrabold leading-tight text-ink">
                                        {predictor.examShortName ?? predictor.name}
                                    </span>
                                    <span className="block text-[9px] font-medium text-ink-soft">Predictor</span>
                                </span>
                                <span className="mt-2 inline-flex items-center gap-1 self-start rounded-[7px] border border-orange-200 bg-orange-50 px-2 py-1 text-[9.5px] font-bold text-orange-700 transition-colors group-hover:bg-orange group-hover:text-white">
                                    {predictor.ctaLabel ?? 'Check Now'}
                                    <ArrowRight className="h-2.5 w-2.5" aria-hidden />
                                </span>
                            </Link>
                        </li>
                    ))}

                    <li>
                        <Link
                            href={section.ctaUrl ?? '/predictors'}
                            className="flex h-full min-h-[104px] flex-col justify-between rounded-[12px] border border-white/20 bg-white/10 p-2.5 transition-colors hover:bg-white/20"
                        >
                            <span>
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/15">
                                    <Icon name="LayoutGrid" className="h-3.5 w-3.5 text-white" />
                                </span>
                                <span className="mt-1.5 block text-[11.5px] font-extrabold leading-tight text-white">
                                    {config.moreCardLabel}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-orange-200">
                                {config.moreCardCtaLabel}
                                <ArrowRight className="h-2.5 w-2.5" aria-hidden />
                            </span>
                        </Link>
                    </li>
                </ul>
            </div>
        </section>
    );
}
