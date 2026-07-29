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
import { LoanPromoCard } from '@/components/homepage/loan-promo-card';
import { FeaturedCollegesSection } from '@/components/homepage/featured-colleges-section';
import { UpcomingDatesSection } from '@/components/homepage/upcoming-dates-section';
import { ScholarshipsSection } from '@/components/homepage/scholarships-section';
import { StudentReviewsSection } from '@/components/homepage/student-reviews-section';
import { LatestArticlesSection } from '@/components/homepage/latest-articles-section';
import { CounsellorsSection } from '@/components/homepage/counsellors-section';
import { WhyChooseUsSection } from '@/components/homepage/why-choose-us-section';
import { ExploreDirectorySection } from '@/components/homepage/explore-directory-section';
import { HomeFaqSection } from '@/components/homepage/home-faq-section';
import { AppDownloadSection } from '@/components/homepage/app-download-section';
import { CardSkeleton } from '@/components/ui/primitives';
import { getHomepageSections, getSection } from '@/services/homepage.service';
import { getSettings, readBool, readString } from '@/services/settings.service';
import {
    getHomeArticles,
    getHomeCategories,
    getHomeCounsellors,
    getHomeCourseOptions,
    getHomeDirectoryGeo,
    getHomeFaqs,
    getHomeFeaturedColleges,
    getHomePredictors,
    getHomeReviews,
    getHomeScholarships,
    getHomeTrendingUpdates,
    getHomeUpcomingDates,
} from '@/services/home-data.service';
import { getStateOptions } from '@/services/geo.service';
import { buildFaqJsonLd, buildWebsiteJsonLd, buildOrganizationJsonLd, JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import type {
    AiAssistantConfig,
    AppDownloadConfig,
    CollegePredictorConfig,
    CompareCollegesConfig,
    CounsellorsConfig,
    ExploreDirectoryConfig,
    FaqSectionConfig,
    FeaturedCollegesConfig,
    GuidanceToolsConfig,
    HeroConfig,
    LatestArticlesConfig,
    LoanPromoConfig,
    PlatformStatsConfig,
    QuickActionsConfig,
    ScholarshipsConfig,
    StickyCtaConfig,
    StudentReviewsConfig,
    TopCoursesConfig,
    TrendingConfig,
    UpcomingDatesConfig,
    WhatsappConfig,
    WhyChooseUsConfig,
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
    const loanPromo = getSection<LoanPromoConfig>(sections, 'loan_promo');
    const whatsappSection = getSection<WhatsappConfig>(sections, 'whatsapp_community');
    const featuredColleges = getSection<FeaturedCollegesConfig>(sections, 'featured_colleges');
    const upcomingDates = getSection<UpcomingDatesConfig>(sections, 'upcoming_dates');
    const scholarshipSection = getSection<ScholarshipsConfig>(sections, 'scholarships');
    const reviewSection = getSection<StudentReviewsConfig>(sections, 'student_reviews');
    const articleSection = getSection<LatestArticlesConfig>(sections, 'latest_articles');
    const counsellorSection = getSection<CounsellorsConfig>(sections, 'counsellors');
    const whyChooseUs = getSection<WhyChooseUsConfig>(sections, 'why_choose_us');
    const directorySection = getSection<ExploreDirectoryConfig>(sections, 'explore_directory');
    const faqSection = getSection<FaqSectionConfig>(sections, 'faq');
    const appSection = getSection<AppDownloadConfig>(sections, 'app_download');
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

    /*
     * Content for the sections below the fold.
     *
     * Each loader is skipped when its section is disabled, so turning a section off
     * in the builder removes its query as well as its markup. All of them read
     * through the tagged data cache, so a warm homepage still costs no database
     * round trips no matter how many sections are enabled.
     */
    const [
        collegeRows,
        dateRows,
        scholarshipRows,
        reviewData,
        articleRows,
        counsellorRows,
        faqRows,
        directoryGeo,
    ] = await Promise.all([
        featuredColleges.isEnabled
            ? getHomeFeaturedColleges({
                limit: featuredColleges.config.limit,
                slugs: featuredColleges.config.collegeSlugs.length
                    ? featuredColleges.config.collegeSlugs
                    : undefined,
            })
            : Promise.resolve([]),
        upcomingDates.isEnabled
            ? getHomeUpcomingDates({
                limit: upcomingDates.config.limit,
                keyDatesOnly: upcomingDates.config.keyDatesOnly,
            })
            : Promise.resolve([]),
        scholarshipSection.isEnabled
            ? getHomeScholarships({
                limit: scholarshipSection.config.limit,
                slugs: scholarshipSection.config.scholarshipSlugs.length
                    ? scholarshipSection.config.scholarshipSlugs
                    : undefined,
            })
            : Promise.resolve([]),
        reviewSection.isEnabled
            ? getHomeReviews({
                limit: reviewSection.config.limit,
                minRating: reviewSection.config.minRating,
            })
            : Promise.resolve({ reviews: [], aggregate: { average: 0, count: 0 } }),
        articleSection.isEnabled
            ? getHomeArticles({
                limit: articleSection.config.limit,
                category: articleSection.config.category,
                featuredOnly: articleSection.config.featuredOnly,
            })
            : Promise.resolve([]),
        counsellorSection.isEnabled
            ? getHomeCounsellors({
                limit: counsellorSection.config.limit,
                slugs: counsellorSection.config.counsellorSlugs.length
                    ? counsellorSection.config.counsellorSlugs
                    : undefined,
            })
            : Promise.resolve([]),
        faqSection.isEnabled
            ? getHomeFaqs({ limit: faqSection.config.limit, scope: faqSection.config.scope })
            : Promise.resolve([]),
        directorySection.isEnabled
            ? getHomeDirectoryGeo({
                stateLimit: directorySection.config.stateLimit,
                cityLimit: directorySection.config.cityLimit,
            })
            : Promise.resolve({ states: [], cities: [] }),
    ]);

    const faqJsonLd =
        faqSection.isEnabled && faqSection.config.emitStructuredData
            ? buildFaqJsonLd(faqRows.map((faq) => ({ question: faq.question, answer: faq.answerHtml })))
            : null;

    const consentText = readString(settings, 'legal.consentText', 'I agree to be contacted.');
    const supportPhone = readString(settings, 'contact.phone', '');
    const whatsappNumber = readString(settings, 'contact.whatsappNumber', '').replace(/\D/g, '');
    const whatsappChatUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Admission Sathi, I need admission guidance.')}`
        : undefined;

    return (
        <>
            <JsonLd
                data={[
                    buildOrganizationJsonLd(settings),
                    buildWebsiteJsonLd(settings),
                    ...(faqJsonLd ? [faqJsonLd] : []),
                ]}
            />

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

                            {/* Closes the dead space this column used to leave under the
                                WhatsApp panel, where the taller trending feed beside it
                                ran on. */}
                            {loanPromo.isEnabled ? (
                                <LoanPromoCard
                                    heading={loanPromo.heading ?? 'Loan Calculator'}
                                    description={loanPromo.description}
                                    ctaLabel={loanPromo.ctaLabel ?? 'Calculate Now'}
                                    ctaUrl={loanPromo.ctaUrl ?? '/education-loans/calculator'}
                                    config={loanPromo.config}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* ---------- Discovery: colleges, dates, money ---------- */}
                {featuredColleges.isEnabled ? (
                    <FeaturedCollegesSection
                        heading={featuredColleges.heading ?? 'Featured colleges'}
                        description={featuredColleges.description}
                        ctaLabel={featuredColleges.ctaLabel}
                        ctaUrl={featuredColleges.ctaUrl}
                        colleges={collegeRows}
                        config={featuredColleges.config}
                    />
                ) : null}

                {upcomingDates.isEnabled ? (
                    <UpcomingDatesSection
                        heading={upcomingDates.heading ?? 'Upcoming dates'}
                        description={upcomingDates.description}
                        ctaLabel={upcomingDates.ctaLabel}
                        ctaUrl={upcomingDates.ctaUrl}
                        dates={dateRows}
                        config={upcomingDates.config}
                    />
                ) : null}

                {scholarshipSection.isEnabled ? (
                    <ScholarshipsSection
                        heading={scholarshipSection.heading ?? 'Scholarships'}
                        description={scholarshipSection.description}
                        ctaLabel={scholarshipSection.ctaLabel}
                        ctaUrl={scholarshipSection.ctaUrl}
                        scholarships={scholarshipRows}
                    />
                ) : null}

                {/* ---------- Trust: reviews, guides, counsellors ---------- */}
                {reviewSection.isEnabled ? (
                    <StudentReviewsSection
                        heading={reviewSection.heading ?? 'Student reviews'}
                        description={reviewSection.description}
                        ctaLabel={reviewSection.ctaLabel}
                        ctaUrl={reviewSection.ctaUrl}
                        reviews={reviewData.reviews}
                        aggregate={reviewData.aggregate}
                        config={reviewSection.config}
                    />
                ) : null}

                {articleSection.isEnabled ? (
                    <LatestArticlesSection
                        heading={articleSection.heading ?? 'Latest guides'}
                        description={articleSection.description}
                        ctaLabel={articleSection.ctaLabel}
                        ctaUrl={articleSection.ctaUrl}
                        articles={articleRows}
                    />
                ) : null}

                {counsellorSection.isEnabled ? (
                    <CounsellorsSection
                        heading={counsellorSection.heading ?? 'Our counsellors'}
                        description={counsellorSection.description}
                        ctaLabel={counsellorSection.ctaLabel}
                        ctaUrl={counsellorSection.ctaUrl}
                        counsellors={counsellorRows}
                        config={counsellorSection.config}
                    />
                ) : null}

                {whyChooseUs.isEnabled ? (
                    <WhyChooseUsSection
                        heading={whyChooseUs.heading ?? 'Why Admission Sathi'}
                        description={whyChooseUs.description}
                        config={whyChooseUs.config}
                    />
                ) : null}

                {/* ---------- Directory, FAQ, app ---------- */}
                {directorySection.isEnabled ? (
                    <ExploreDirectorySection
                        heading={directorySection.heading ?? 'Explore colleges'}
                        description={directorySection.description}
                        config={directorySection.config}
                        geo={directoryGeo}
                    />
                ) : null}

                {faqSection.isEnabled ? (
                    <HomeFaqSection
                        heading={faqSection.heading ?? 'Frequently asked questions'}
                        description={faqSection.description}
                        ctaLabel={faqSection.ctaLabel}
                        ctaUrl={faqSection.ctaUrl}
                        faqs={faqRows}
                    />
                ) : null}

                {appSection.isEnabled ? (
                    <AppDownloadSection
                        heading={appSection.heading ?? 'Get the app'}
                        description={appSection.description}
                        config={appSection.config}
                        androidUrl={readString(settings, 'app.androidUrl', '')}
                        iosUrl={readString(settings, 'app.iosUrl', '')}
                        qrImageUrl={readString(settings, 'whatsapp.qrImageUrl', '')}
                    />
                ) : null}

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
