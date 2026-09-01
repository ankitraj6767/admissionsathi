import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SearchBox } from '@/components/search/search-box';
import { CounsellingForm } from '@/components/forms/counselling-form';
import { Icon } from '@/components/ui/icon';
import { toneStyles } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { HeroConfig, QuickActionsConfig } from '@/schemas/homepage.schema';
import type { ResolvedSection } from '@/services/homepage.service';
import type { SelectOption } from '@/types/common';

interface HeroSectionProps {
    hero: ResolvedSection<HeroConfig>;
    quickActions: ResolvedSection<QuickActionsConfig>;
    courses: SelectOption[];
    states: SelectOption[];
    consentText: string;
    showQuickActions: boolean;
}

const PHOTO_HERO_URL = '/brand/hero-students-photo.png';
const LEGACY_HERO_URLS = new Set([
    '/brand/hero-students.svg',
    '/brand/hero-students-mobile.svg',
]);

/**
 * Existing installations can still have the original seeded illustration URL
 * in the homepage-builder config. Upgrade only those legacy defaults while
 * continuing to respect any image an editor has explicitly configured.
 */
function resolveHeroImage<T extends { url: string } | null | undefined>(image: T): T {
    if (!image || !LEGACY_HERO_URLS.has(image.url)) return image;
    return { ...image, url: PHOTO_HERO_URL } as T;
}

/** Homepage hero: headline + trust stats, search card, hero image and lead form. */
export function HeroSection({
    hero,
    quickActions,
    courses,
    states,
    consentText,
    showQuickActions,
}: HeroSectionProps) {
    const config = hero.config;
    const form = config.form;
    const image = resolveHeroImage(config.heroImage);
    const mobileImage = resolveHeroImage(config.heroImageMobile ?? image);

    return (
        <section aria-labelledby="hero-heading" className="relative overflow-hidden pb-6 pt-5 md:pt-7">
            {/* soft background accents */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 top-6 h-64 w-64 rounded-full bg-navy-100/40 blur-3xl" />
                <div className="absolute right-[22%] top-0 h-72 w-72 rounded-full bg-orange-100/35 blur-3xl" />
            </div>

            {/* Hero image sits behind the search column on large screens */}
            {image?.url ? (
                <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 left-[45%] right-[13%] top-2 hidden lg:block"
                >
                    <div className="relative h-full w-full">
                        <Image
                            src={image.url}
                            alt=""
                            fill
                            priority
                            sizes="(min-width: 1280px) 42vw, 40vw"
                            className="object-contain object-bottom"
                        />
                    </div>
                </div>
            ) : null}

            <div className="shell relative max-w-[1400px]">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,296px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                    {/*
                        Headline + search share row 1, trust stats + quick actions share row 2,
                        so the left and centre blocks start and end on the same baselines.
                    */}
                    <div className="grid gap-5 self-start lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
                        {/* ----------------- Headline (row 1, col 1) -----------------
                            Centred below `lg`, where the headline sits above a full-width
                            search card rather than beside the hero image. Both the heading
                            and the description are width-capped (`.hero-title` sets
                            `max-inline-size`, the description caps at 34ch), so they need
                            auto inline margins as well as `text-center` — otherwise the text
                            centres inside a box that is still pinned left. */}
                        <div className="hero-title-col relative z-10 text-center lg:col-start-1 lg:row-start-1 lg:text-left">
                            {config.eyebrow ? (
                                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-navy-600">
                                    {config.eyebrow}
                                </p>
                            ) : null}

                            <h1
                                id="hero-heading"
                                className="hero-title mx-auto mt-2.5 font-display text-hero font-extrabold text-navy-800 lg:mx-0"
                            >
                                {config.headingBeforeHighlight ?? hero.heading}{' '}
                                <span className="text-orange">{config.highlightText ?? hero.subheading}</span>
                            </h1>

                            {hero.description ? (
                                <p className="mx-auto mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-soft lg:mx-0">
                                    {hero.description}
                                </p>
                            ) : null}
                        </div>

                        {/* ---------------- Trust stats (row 2, col 1) ---------------- */}
                        {config.trustStats.length > 0 ? (
                            <div className="relative z-10 lg:col-start-1 lg:row-start-2">
                                {/* `mx-auto` keeps the capped card under the centred headline
                                    on tablet, where `max-w-md` is narrower than the column;
                                    from `lg` the cap is lifted and the card aligns left again. */}
                                <div className="mx-auto grid h-full max-w-md grid-cols-2 content-center gap-2.5 rounded-panel border border-line bg-white/90 p-3 shadow-card backdrop-blur sm:grid-cols-4 lg:mx-0 lg:max-w-none">
                                    {config.trustStats.map((stat) => (
                                        <div key={stat.label} className="text-center">
                                            <span
                                                className={cn(
                                                    'mx-auto mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-[9px]',
                                                    toneStyles[stat.tone ?? 'navy'] ?? toneStyles.navy,
                                                )}
                                            >
                                                <Icon name={stat.icon} className="h-4 w-4" />
                                            </span>
                                            <p className="text-[15px] font-extrabold leading-none text-navy-800">{stat.value}</p>
                                            <p className="mt-1 text-[10px] font-medium leading-tight text-ink-soft">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* ---------------- Search (row 1, col 2) ---------------- */}
                        <div className="relative z-10 flex flex-col lg:col-start-2 lg:row-start-1 lg:max-w-[360px]">
                            <div className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-raised md:p-5">
                                <h2 className="mb-3 text-center text-[14.5px] font-bold text-navy-800">
                                    {config.searchTitle ?? 'What do you want to study?'}
                                </h2>

                                <SearchBox placeholder={config.searchPlaceholder} size="lg" />

                                {config.popularSearches.length > 0 ? (
                                    <div className="mt-3.5">
                                        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-soft">
                                            {config.popularSearchesLabel ?? 'Popular Searches:'}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {config.popularSearches.map((chip) => (
                                                <Link key={chip.label} href={chip.url} className="chip">
                                                    {chip.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* ---------------- Quick actions (row 2, col 2) ---------------- */}
                        <div className="relative z-10 flex flex-col lg:col-start-2 lg:row-start-2">
                            {/* Mobile / tablet hero image */}
                            {mobileImage?.url ? (
                                <div className="relative mb-4 h-44 w-full lg:hidden">
                                    <Image
                                        src={mobileImage.url}
                                        alt={mobileImage.alt ?? 'Students on a college campus'}
                                        fill
                                        priority
                                        sizes="210px"
                                        className="object-contain object-bottom"
                                    />
                                </div>
                            ) : null}

                            {showQuickActions && quickActions.config.cards.length > 0 ? (
                                <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
                                    {quickActions.config.cards.map((card) => (
                                        <Link
                                            key={card.title}
                                            href={card.url}
                                            className="group flex min-h-[92px] flex-col items-center justify-center rounded-[14px] border border-line bg-white/95 px-2 py-3 text-center shadow-card backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised"
                                        >
                                            <span
                                                className={cn(
                                                    'mb-2 inline-flex h-9 w-9 items-center justify-center rounded-[10px]',
                                                    toneStyles[card.tone ?? 'navy'] ?? toneStyles.navy,
                                                )}
                                            >
                                                <Icon name={card.icon} className="h-[18px] w-[18px]" />
                                            </span>
                                            <span className="text-[11.5px] font-bold leading-tight text-ink">{card.title}</span>
                                            {card.subtitle ? (
                                                <span className="mt-0.5 text-[9.5px] leading-tight text-ink-soft">{card.subtitle}</span>
                                            ) : null}
                                            <ArrowRight
                                                className="mt-1 h-3 w-3 text-orange opacity-0 transition-opacity group-hover:opacity-100"
                                                aria-hidden
                                            />
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* ---------------- Right: counselling form ---------------- */}
                    <div className="relative z-10">
                        {form ? (
                            <CounsellingForm
                                title={form.title}
                                subtitle={form.subtitle}
                                submitLabel={form.submitLabel}
                                badges={form.badges}
                                courses={courses}
                                states={states}
                                showEmail={form.showEmail}
                                showState={form.showState}
                                consentText={consentText}
                                source="homepage_counselling_form"
                                sourceDetail="hero"
                                variant="dark"
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
