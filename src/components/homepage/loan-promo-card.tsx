import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { LoanPromoConfig } from '@/schemas/homepage.schema';

/**
 * Compact promo card for the homepage right rail.
 *
 * Sits beneath the AI and WhatsApp panels, where the column was previously running
 * short of the taller trending feed and leaving dead space. Deliberately a solid
 * tinted block rather than another white card, so the rail reads as three distinct
 * calls to action instead of one long list.
 */
const TONE_CLASSES: Record<string, string> = {
    teal: 'from-teal to-teal-600',
    green: 'from-green to-teal-600',
    navy: 'from-navy-700 to-navy-900',
    purple: 'from-purple to-navy-800',
    orange: 'from-orange to-orange-700',
    pink: 'from-pink to-purple',
    blue: 'from-blue to-navy-700',
};

export function LoanPromoCard({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    config,
}: {
    heading: string;
    description?: string;
    ctaLabel: string;
    ctaUrl: string;
    config: LoanPromoConfig;
}) {
    return (
        <section
            aria-labelledby="loan-promo-heading"
            className={cn(
                'relative overflow-hidden rounded-panel bg-gradient-to-br p-4 text-white shadow-card',
                TONE_CLASSES[config.tone] ?? TONE_CLASSES.teal,
            )}
        >
            {/* Decorative bloom; aria-hidden so it never reaches assistive tech. */}
            <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10"
            />

            <div className="relative flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-white/20">
                    <Icon name={config.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h2 id="loan-promo-heading" className="text-[15px] font-extrabold leading-tight">
                        {heading}
                    </h2>
                    {description ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-white/85">{description}</p>
                    ) : null}
                </div>
            </div>

            {config.highlights.length > 0 ? (
                <dl className="relative mt-3 grid gap-2 sm:grid-cols-2">
                    {config.highlights.map((item) => (
                        <div key={item.label} className="rounded-[10px] bg-white/12 px-2.5 py-1.5">
                            <dt className="text-[10px] uppercase tracking-wide text-white/70">{item.label}</dt>
                            <dd className="text-[13px] font-extrabold">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            <Link
                href={ctaUrl}
                className="relative mt-3 inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-white px-3.5 text-[12.5px] font-bold text-navy-800 transition-transform hover:-translate-y-0.5"
            >
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
        </section>
    );
}
