import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HeroSection } from '@/components/homepage/hero-section';
import { TopCoursesSection } from '@/components/homepage/top-courses-section';
import { CompareCollegesWidget } from '@/components/homepage/compare-colleges-widget';
import { PredictorStrip } from '@/components/homepage/predictor-strip';
import { GuidanceToolsSection } from '@/components/homepage/guidance-tools-section';
import { TrendingPanel } from '@/components/homepage/trending-panel';
import { AiAssistantPanel } from '@/components/homepage/ai-assistant-panel';
import { WhatsappPanel } from '@/components/homepage/whatsapp-panel';
import { PlatformStatsStrip } from '@/components/homepage/platform-stats-strip';
import { StickyCta } from '@/components/homepage/sticky-cta';
import { CardSkeleton } from '@/components/ui/primitives';
import { getHomepageSections, getSection } from '@/services/homepage.service';
import { getSettings, readBool, readString } from '@/services/settings.service';
import {
    getHomeCategories,
    getHomeCourseOptions,
    getHomePredictors,
    getHomeTrendingUpdates,
} from '@/services/home-data.service';
import { getStateOptions } from '@/services/geo.service';
import { buildWebsiteJsonLd, buildOrganizationJsonLd, JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import type {
    AiAssistantConfig,
    CollegePredictorConfig,
    CompareCollegesConfig,
    GuidanceToolsConfig,
    HeroConfig,
    PlatformStatsConfig,
    QuickActionsConfig,
    StickyCtaConfig,
    TopCoursesConfig,
    TrendingConfig,
    WhatsappConfig,
} from '@/schemas/homepage.schema';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSettings();
    return buildMetadata({
        title: readString(settings, 'seo.defaultTitle', 'Admission Sathi'),
        description: readString(settings, 'seo.defaultDescription', ''),
        path: '/',
        ogImage: readString(settings, 'seo.defaultOgImage', ''),
    });
}

export default async function HomePage() {
    const [sections, settings] = await Promise.all([getHomepageSections(), getSettings()]);

    const hero = getSection<HeroConfig>(sections, 'hero');
    const quickActions = getSection<QuickActionsConfig>(sections, 'quick_actions');
    const topCourses = getSection<TopCoursesConfig>(sections, 'top_courses');
    const compare = getSection<CompareCollegesConfig>(sections, 'compare_colleges');
    const predictorSection = getSection<CollegePredictorConfig>(sections, 'college_predictor');
    const guidance = getSection<GuidanceToolsConfig>(sections, 'guidance_tools');
    const trending = getSection<TrendingConfig>(sections, 'trending');
    const aiSection = getSection<AiAssistantConfig>(sections, 'ai_assistant');
    const whatsappSection = getSection<WhatsappConfig>(sections, 'whatsapp_community');
    const statsSection = getSection<PlatformStatsConfig>(sections, 'platform_stats');
    const stickySection = getSection<StickyCtaConfig>(sections, 'sticky_cta');

    // Every loader below reads through the data cache, so a warm homepage costs
    // zero database round trips. Editor changes still appear immediately: each
    // loader is tagged and the admin actions already revalidate those tags.
    const [categories, courseOptions, stateOptions, predictors, updates] = await Promise.all([
        getHomeCategories({
            featuredOnly: topCourses.config.categorySlugs.length === 0,
            slugs: topCourses.config.categorySlugs.length ? topCourses.config.categorySlugs : undefined,
            limit: topCourses.config.limit,
        }),
        getHomeCourseOptions(),
        getStateOptions(),
        getHomePredictors({
            homepageOnly: predictorSection.config.predictorSlugs.length === 0,
            slugs: predictorSection.config.predictorSlugs.length
                ? predictorSection.config.predictorSlugs
                : undefined,
            limit: predictorSection.config.limit,
        }),
        getHomeTrendingUpdates({
            limit: trending.config.limit,
            categories: trending.config.categories,
        }),
    ]);

    const consentText = readString(settings, 'legal.consentText', 'I agree to be contacted.');
    const supportPhone = readString(settings, 'contact.phone', '');
    const whatsappNumber = readString(settings, 'contact.whatsappNumber', '').replace(/\D/g, '');
    const whatsappChatUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Admission Sathi, I need admission guidance.')}`
        : undefined;

    return (
        <>
            <JsonLd data={[buildOrganizationJsonLd(settings), buildWebsiteJsonLd(settings)]} />

            {hero.isEnabled ? (
                <HeroSection
                    hero={hero}
                    quickActions={quickActions}
                    courses={courseOptions}
                    states={stateOptions}
                    consentText={consentText}
                    showQuickActions={quickActions.isEnabled}
                />
            ) : null}

            <div className="shell space-y-4 pb-8">
                {/* ---------- Courses + comparison ---------- */}
                {topCourses.isEnabled || compare.isEnabled ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.52fr)]">
                        {topCourses.isEnabled ? (
                            <Suspense fallback={<CardSkeleton lines={4} />}>
                                <TopCoursesSection section={topCourses} categories={categories} />
                            </Suspense>
                        ) : null}

                        {compare.isEnabled ? (
                            <CompareCollegesWidget
                                heading={compare.heading ?? 'Compare Colleges'}
                                description={compare.description}
                                ctaLabel={compare.ctaLabel}
                                ctaUrl={compare.ctaUrl}
                                maxColleges={compare.config.maxColleges}
                                defaultSlugs={compare.config.defaultCollegeSlugs}
                            />
                        ) : null}
                    </div>
                ) : null}

                {/* ---------- Predictor band + guidance | trending + AI + WhatsApp ---------- */}
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.52fr)]">
                    <div className="space-y-4">
                        {predictorSection.isEnabled && predictors.length > 0 ? (
                            <PredictorStrip section={predictorSection} predictors={predictors} />
                        ) : null}

                        {guidance.isEnabled ? <GuidanceToolsSection section={guidance} /> : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        {trending.isEnabled ? <TrendingPanel section={trending} updates={updates} /> : null}

                        <div className="space-y-4">
                            {aiSection.isEnabled && readBool(settings, 'ai.enabled', true) ? (
                                <AiAssistantPanel
                                    title={readString(settings, 'ai.title', aiSection.heading ?? 'Ask Admission Sathi AI')}
                                    description={readString(settings, 'ai.greeting', aiSection.description ?? '')}
                                    placeholder={readString(settings, 'ai.placeholder', 'Type your question…')}
                                    suggestions={aiSection.config.suggestions}
                                />
                            ) : null}

                            {whatsappSection.isEnabled && readBool(settings, 'whatsapp.enabled', true) ? (
                                <WhatsappPanel
                                    title={readString(settings, 'whatsapp.title', whatsappSection.heading ?? '')}
                                    description={readString(settings, 'whatsapp.description', whatsappSection.description ?? '')}
                                    ctaLabel={whatsappSection.ctaLabel ?? 'Join Now'}
                                    groupUrl={readString(settings, 'whatsapp.groupUrl', '#')}
                                    qrImageUrl={readString(settings, 'whatsapp.qrImageUrl', '')}
                                    campaign={readString(settings, 'whatsapp.campaign', 'homepage_community')}
                                    showQr={whatsappSection.config.showQr}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* ---------- Platform stats ---------- */}
                {statsSection.isEnabled ? (
                    <PlatformStatsStrip
                        stats={statsSection.config.stats}
                        animateCounters={statsSection.config.animateCounters}
                    />
                ) : null}
            </div>

            {stickySection.isEnabled && readBool(settings, 'features.stickyCtaEnabled', true) ? (
                <StickyCta
                    heading={stickySection.heading ?? 'Still Confused? Talk to our expert counsellors'}
                    description={stickySection.description}
                    ctaLabel={stickySection.ctaLabel ?? 'Book Free Counselling Now'}
                    ctaUrl={stickySection.ctaUrl ?? '/book-counselling'}
                    phone={supportPhone}
                    whatsappUrl={whatsappChatUrl}
                    showCall={stickySection.config.showCall}
                    showWhatsapp={stickySection.config.showWhatsapp}
                    callLabel={stickySection.config.callLabel}
                    whatsappLabel={stickySection.config.whatsappLabel}
                    whatsappSubLabel={stickySection.config.whatsappSubLabel}
                />
            ) : null}
        </>
    );
}
