/* eslint-disable no-console */
import { Types } from 'mongoose';
import { hashString, readingTimeMinutes, slugify, stripHtml } from '@/lib/utils';
import { DEMO_DATA_NOTICE, RESERVATION_CATEGORIES } from '@/config/constants';
import { College } from '@/db/models/college.model';
import { Cutoff, Predictor, PredictorDataset } from '@/db/models/predictor.model';
import { LoanProduct, LoanProvider, Scholarship } from '@/db/models/finance.model';
import { CounsellingBooking, Counsellor } from '@/db/models/counselling.model';
import { Lead, LeadActivity } from '@/db/models/lead.model';
import { Article, FAQ, NewsPost, Resource, Review } from '@/db/models/content.model';
import { EXAM_SEEDS, SEED_EXAM_YEAR } from './data/exam.data';
import { STATE_SEEDS } from './data/geo.data';
import { LOAN_DOCUMENTS, LOAN_PROVIDER_SEEDS, SCHOLARSHIP_SEEDS } from './data/finance.data';
import { ARTICLE_SEEDS, COUNSELLOR_SEEDS, NEWS_SEEDS } from './data/people-content.data';
import { HOMEPAGE_FAQ_SEEDS } from './data/homepage-faq.data';
import { log, type SeedContext } from './seed-core';

function daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 86_400_000);
}

function monthsFromNow(offset: number, day = 15): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + offset, day);
    return date;
}

function html(paragraphs: string[]): string {
    return paragraphs.map((p) => (p.startsWith('<') ? p : `<p>${p}</p>`)).join('');
}

/* ------------------------- predictors + cut-offs -------------------------- */

const QUOTAS = ['All India', 'Home State'] as const;
const ROUNDS = [1, 2, 3];

export async function seedPredictors(
    adminId: Types.ObjectId,
    ctx: Pick<SeedContext, 'examIdBySlug'>,
) {
    let predictorCount = 0;
    let cutoffCount = 0;
    let order = 0;

    const colleges = await College.find({ status: 'published' })
        .select('_id name slug cityName stateName ownership feeRange ranking examsAccepted courses')
        .populate<{ courses: { name: string }[] }>('courses', 'name')
        .lean()
        .exec();

    for (const seed of EXAM_SEEDS) {
        if (!seed.predictor) continue;
        order += 10;

        const exam = ctx.examIdBySlug.get(seed.slug);
        const metric = seed.predictor.metric;
        const higherIsBetter = metric !== 'rank';

        const predictor = await Predictor.findOneAndUpdate(
            { slug: slugify(seed.predictor.name) },
            {
                $set: {
                    name: seed.predictor.name,
                    exam: exam?.id,
                    examShortName: seed.shortName,
                    subtitle: `${seed.shortName} Predictor`,
                    description: `Estimate the colleges you may get with your ${seed.shortName} ${metric}, based on imported previous-year closing data and configurable rules.`,
                    icon: seed.predictor.icon,
                    themeColor: seed.predictor.themeColor,
                    metric,
                    metricDirection: higherIsBetter ? 'higher_is_better' : 'lower_is_better',
                    fields: [
                        {
                            key: metric === 'rank' ? 'rank' : metric === 'percentile' ? 'percentile' : 'score',
                            label: metric === 'rank' ? 'Your All India Rank' : metric === 'percentile' ? 'Your percentile' : 'Your score',
                            type: 'number',
                            required: true,
                            min: 0,
                            max: metric === 'percentile' ? 100 : 1_500_000,
                            placeholder: metric === 'rank' ? 'e.g. 25000' : metric === 'percentile' ? 'e.g. 92.5' : 'e.g. 540',
                            displayOrder: 10,
                        },
                        {
                            key: 'category',
                            label: 'Category',
                            type: 'select',
                            required: true,
                            options: RESERVATION_CATEGORIES.map((c) => ({ label: c, value: c })),
                            displayOrder: 20,
                        },
                        {
                            key: 'gender',
                            label: 'Gender',
                            type: 'select',
                            required: false,
                            options: [
                                { label: 'Male', value: 'Male' },
                                { label: 'Female', value: 'Female' },
                                { label: 'Other', value: 'Other' },
                            ],
                            displayOrder: 30,
                        },
                        {
                            key: 'homeState',
                            label: 'Home state (for state quota)',
                            type: 'select',
                            required: false,
                            options: [],
                            displayOrder: 40,
                        },
                        {
                            key: 'quota',
                            label: 'Quota',
                            type: 'select',
                            required: false,
                            options: QUOTAS.map((q) => ({ label: q, value: q })),
                            displayOrder: 50,
                        },
                        {
                            key: 'round',
                            label: 'Counselling round',
                            type: 'select',
                            required: false,
                            options: ROUNDS.map((r) => ({ label: `Round ${r}`, value: String(r) })),
                            displayOrder: 60,
                        },
                        {
                            key: 'branch',
                            label: 'Preferred branch / programme',
                            type: 'multiselect',
                            required: false,
                            options: [],
                            displayOrder: 70,
                        },
                        {
                            key: 'collegeType',
                            label: 'College type',
                            type: 'select',
                            required: false,
                            options: [
                                { label: 'Government', value: 'Government' },
                                { label: 'Private', value: 'Private' },
                                { label: 'Deemed', value: 'Deemed' },
                            ],
                            displayOrder: 80,
                        },
                    ],
                    bandRules: higherIsBetter
                        ? [
                            { band: 'very_high', minRatio: 1.08 },
                            { band: 'high', minRatio: 1.02 },
                            { band: 'moderate', minRatio: 0.98 },
                            { band: 'low', minRatio: 0.92 },
                            { band: 'very_low', minRatio: 0 },
                        ]
                        : [
                            { band: 'very_high', maxRatio: 0.7 },
                            { band: 'high', maxRatio: 0.9 },
                            { band: 'moderate', maxRatio: 1.05 },
                            { band: 'low', maxRatio: 1.25 },
                            { band: 'very_low', maxRatio: 99 },
                        ],
                    showOnHomepage: Boolean(seed.featured),
                    isFeatured: Boolean(seed.featured),
                    displayOrder: order,
                    ctaLabel: 'Check Now',
                    faqs: [
                        {
                            question: 'How accurate is this predictor?',
                            answer:
                                'It is a rule-based estimate built on previous-year closing data. Actual allotment depends on the current-year seat matrix, applicant pool and reservation rules.',
                            order: 1,
                        },
                        {
                            question: 'Does a prediction guarantee admission?',
                            answer: 'No. Predictions are indicative probability bands, not an admission guarantee.',
                            order: 2,
                        },
                    ],
                    status: 'published',
                    createdBy: adminId,
                    seo: {
                        title: `${seed.predictor.name} ${SEED_EXAM_YEAR} — Estimate Your Chances`,
                        description: `Enter your ${seed.shortName} ${metric}, category and quota to see colleges where your chances are estimated as high, moderate or low.`,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();

        predictorCount += 1;

        // ---- dataset + cut-off rows ----
        await Cutoff.deleteMany({ predictor: predictor!._id });
        await PredictorDataset.deleteMany({ predictor: predictor!._id });

        const dataset = await PredictorDataset.create({
            predictor: predictor!._id,
            name: `${seed.shortName} ${SEED_EXAM_YEAR - 1} closing data (demonstration)`,
            version: 1,
            year: SEED_EXAM_YEAR - 1,
            sourceFileName: `${seed.slug}-${SEED_EXAM_YEAR - 1}-demo.csv`,
            sourceNote: DEMO_DATA_NOTICE,
            columnMapping: {
                collegeName: 'College',
                branchName: 'Branch',
                category: 'Category',
                quota: 'Quota',
                round: 'Round',
                closingRank: 'Closing Rank',
                closingPercentile: 'Closing Percentile',
                closingScore: 'Closing Score',
            },
            state: 'published',
            publishedAt: new Date(),
            publishedBy: adminId,
            createdBy: adminId,
        });

        const relevant = colleges.filter((c) =>
            exam ? (c.examsAccepted ?? []).some((e) => String(e) === String(exam.id)) : false,
        );

        const rows: Record<string, unknown>[] = [];

        relevant.forEach((college, collegeIndex) => {
            const branches = (college.courses ?? []).map((c) => c.name).slice(0, 4);
            const branchList = branches.length ? branches : ['General Programme'];
            const prestige = college.ranking?.nirfOverall ?? 150 + (collegeIndex % 50);

            branchList.forEach((branchName, branchIndex) => {
                RESERVATION_CATEGORIES.forEach((category, categoryIndex) => {
                    QUOTAS.forEach((quota, quotaIndex) => {
                        ROUNDS.forEach((round) => {
                            const base = prestige * 90 + branchIndex * 2600 + hashString(branchName) % 1800;
                            const categoryRelax = 1 + categoryIndex * 0.42;
                            const quotaRelax = quota === 'Home State' ? 1.25 : 1;
                            const roundRelax = 1 + (round - 1) * 0.12;

                            const closingRank = Math.round(base * categoryRelax * quotaRelax * roundRelax) + 120;
                            const closingPercentile = Number(
                                Math.max(
                                    38,
                                    99.6 - (closingRank / 1_100_000) * 100 * 1.6 - categoryIndex * 0.9,
                                ).toFixed(3),
                            );
                            const closingScore = Math.max(
                                90,
                                Math.round(720 - closingRank / 2200 - categoryIndex * 14),
                            );

                            rows.push({
                                dataset: dataset._id,
                                predictor: predictor!._id,
                                exam: exam?.id,
                                examShortName: seed.shortName,
                                year: SEED_EXAM_YEAR - 1,
                                round,
                                college: college._id,
                                collegeName: college.name,
                                collegeSlug: college.slug,
                                stateName: college.stateName,
                                cityName: college.cityName,
                                collegeType: college.ownership,
                                branchName,
                                category,
                                quota,
                                closingRank,
                                closingPercentile,
                                closingScore,
                                seats: 30 + (hashString(`${college.name}${branchName}`) % 90),
                                annualFee: college.feeRange?.min,
                                nirfRank: college.ranking?.nirfOverall,
                                isPublished: true,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });
                        });
                    });
                });
            });
        });

        if (rows.length > 0) {
            await Cutoff.insertMany(rows, { ordered: false });
            cutoffCount += rows.length;
        }

        await PredictorDataset.updateOne(
            { _id: dataset._id },
            { $set: { rowCount: rows.length, validRowCount: rows.length, invalidRowCount: 0 } },
        );
        await Predictor.updateOne({ _id: predictor!._id }, { $set: { activeDataset: dataset._id } });
    }

    log(`Seeded ${predictorCount} predictors with ${cutoffCount} cut-off rows`);
}

/* ------------------------------- finance --------------------------------- */

export async function seedFinance(
    adminId: Types.ObjectId,
    ctx: Pick<SeedContext, 'courseIdBySlug' | 'stateIdBySlug'>,
) {
    let productCount = 0;
    let order = 0;

    for (const seed of LOAN_PROVIDER_SEEDS) {
        order += 10;
        const provider = await LoanProvider.findOneAndUpdate(
            { slug: seed.slug },
            {
                $set: {
                    name: seed.name,
                    providerType: seed.providerType,
                    summary: seed.summary,
                    detailsHtml: html([
                        `${seed.name} offers education loans for domestic${seed.coversAbroad ? ' and overseas' : ''} programmes.`,
                        `Interest rates range from ${seed.interestRateMin}% to ${seed.interestRateMax}% per annum, with a maximum sanction of ₹${(seed.maxLoanAmount / 100000).toFixed(0)} lakh and repayment tenure up to ${seed.maxTenureYears} years.`,
                        `<strong>${DEMO_DATA_NOTICE}</strong>`,
                    ]),
                    interestRateMin: seed.interestRateMin,
                    interestRateMax: seed.interestRateMax,
                    maxLoanAmount: seed.maxLoanAmount,
                    maxLoanAmountWithoutCollateral: seed.maxLoanAmountWithoutCollateral,
                    collateralRequiredAbove: seed.collateralRequiredAbove,
                    processingFeePercent: seed.processingFeePercent,
                    processingFeeNote: seed.processingFeePercent === 0 ? 'No processing fee on select schemes' : undefined,
                    moratoriumMonths: seed.moratoriumMonths,
                    maxTenureYears: seed.maxTenureYears,
                    processingTimeDays: seed.processingTimeDays,
                    documentsRequired: LOAN_DOCUMENTS,
                    eligibilityHtml: html([
                        'Indian national with a confirmed admission to a recognised institute, along with a co-applicant (parent or guardian) meeting the income criteria.',
                    ]),
                    coversAbroad: seed.coversAbroad,
                    rating: seed.rating,
                    isFeatured: seed.featured ?? false,
                    displayOrder: order,
                    faqs: [
                        {
                            question: 'Is collateral mandatory?',
                            answer: `Collateral is generally required above ₹${(seed.collateralRequiredAbove / 100000).toFixed(1)} lakh.`,
                            order: 1,
                        },
                        {
                            question: 'How long does sanction take?',
                            answer: `Typical processing time is ${seed.processingTimeDays}.`,
                            order: 2,
                        },
                    ],
                    status: 'published',
                    createdBy: adminId,
                    seo: {
                        title: `${seed.name} Education Loan — Interest Rate, Eligibility & Documents`,
                        description: `${seed.name} education loan details: interest rate range, maximum amount, collateral requirement, moratorium and required documents.`,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();

        await LoanProduct.deleteMany({ provider: provider!._id });
        const purposes: ('Domestic Study' | 'Study Abroad')[] = seed.coversAbroad
            ? ['Domestic Study', 'Study Abroad']
            : ['Domestic Study'];

        for (const purpose of purposes) {
            await LoanProduct.create({
                provider: provider!._id,
                providerName: seed.name,
                name: `${seed.name} ${purpose} Loan`,
                slug: slugify(`${seed.name} ${purpose}`),
                purpose,
                interestRateMin: seed.interestRateMin + (purpose === 'Study Abroad' ? 0.5 : 0),
                interestRateMax: seed.interestRateMax + (purpose === 'Study Abroad' ? 0.75 : 0),
                minAmount: 50000,
                maxAmount: purpose === 'Study Abroad' ? seed.maxLoanAmount : Math.round(seed.maxLoanAmount * 0.7),
                tenureYearsMax: seed.maxTenureYears,
                moratoriumMonths: seed.moratoriumMonths,
                processingFeePercent: seed.processingFeePercent,
                collateralFree: seed.maxLoanAmountWithoutCollateral >= seed.maxLoanAmount,
                featuresHtml: html([
                    'Covers tuition, hostel, examination fees, equipment and travel (where applicable).',
                ]),
                status: 'active',
                displayOrder: 10,
                createdBy: adminId,
            });
            productCount += 1;
        }
    }

    for (const seed of SCHOLARSHIP_SEEDS) {
        await Scholarship.findOneAndUpdate(
            { slug: seed.slug },
            {
                $set: {
                    name: seed.name,
                    provider: seed.provider,
                    providerType: seed.providerType,
                    description: `${seed.name} supports eligible students with ${seed.benefitType.toLowerCase()} assistance.`,
                    detailsHtml: html([
                        `${seed.name} is offered by ${seed.provider}. The benefit is provided as ${seed.benefitType.toLowerCase()}.`,
                        `<strong>${DEMO_DATA_NOTICE}</strong>`,
                    ]),
                    eligibilityHtml: html([
                        `<ul>${[
                            seed.minPercentage ? `<li>Minimum ${seed.minPercentage}% in the qualifying examination</li>` : '',
                            seed.maxFamilyIncome
                                ? `<li>Annual family income up to ₹${seed.maxFamilyIncome.toLocaleString('en-IN')}</li>`
                                : '',
                            `<li>Applicable categories: ${seed.targetCategories.join(', ')}</li>`,
                            `<li>Applicable levels: ${seed.targetLevels.join(', ')}</li>`,
                        ]
                            .filter(Boolean)
                            .join('')}</ul>`,
                    ]),
                    documentsRequired: [
                        'Income certificate',
                        'Caste / category certificate (if applicable)',
                        'Latest marksheet',
                        'Admission proof',
                        'Bank account details',
                    ],
                    benefitType: seed.benefitType,
                    amountMin: seed.amountMin,
                    amountMax: seed.amountMax,
                    applicationStart: monthsFromNow(seed.deadlineMonthOffset - 2, 1),
                    applicationDeadline: monthsFromNow(seed.deadlineMonthOffset, 28),
                    applicationUrl: 'https://example.org/apply',
                    targetLevels: seed.targetLevels,
                    targetCategories: seed.targetCategories,
                    targetCourses: (seed.courseSlugs ?? [])
                        .map((s) => ctx.courseIdBySlug.get(s)?.id)
                        .filter(Boolean),
                    minPercentage: seed.minPercentage,
                    maxFamilyIncome: seed.maxFamilyIncome,
                    isFeatured: seed.featured ?? false,
                    status: 'published',
                    publishedAt: new Date(),
                    createdBy: adminId,
                    seo: {
                        title: `${seed.name} — Eligibility, Amount & Application`,
                        description: `${seed.name} by ${seed.provider}: eligibility, benefit amount, required documents and application deadline.`,
                    },
                },
            },
            { upsert: true },
        ).exec();
    }

    log(
        `Seeded ${LOAN_PROVIDER_SEEDS.length} loan providers, ${productCount} loan products and ${SCHOLARSHIP_SEEDS.length} scholarships`,
    );
}

/* ----------------------------- counsellors ------------------------------- */

export async function seedCounsellors(
    adminId: Types.ObjectId,
    ctx: Pick<SeedContext, 'categoryIdBySlug' | 'stateIdBySlug'>,
) {
    let order = 0;
    const availability = [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
        ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00'].map((startTime) => ({
            weekday,
            startTime,
            endTime: `${String(Number(startTime.slice(0, 2))).padStart(2, '0')}:30`,
            isActive: true,
        })),
    );

    for (const seed of COUNSELLOR_SEEDS) {
        order += 10;
        await Counsellor.findOneAndUpdate(
            { slug: seed.slug },
            {
                $set: {
                    name: seed.name,
                    designation: seed.designation,
                    bio: `${seed.name} is a ${seed.designation.toLowerCase()} with ${seed.experienceYears} years of experience helping students with ${seed.specializations.join(', ').toLowerCase()}.`,
                    email: seed.email,
                    languages: seed.languages,
                    specializations: seed.specializations,
                    focusCategories: seed.categorySlugs
                        .map((s) => ctx.categoryIdBySlug.get(s)?.id)
                        .filter(Boolean),
                    focusStates: seed.stateSlugs
                        .map((s) => ctx.stateIdBySlug.get(s))
                        .filter(Boolean),
                    experienceYears: seed.experienceYears,
                    qualifications: seed.qualifications,
                    rating: { average: seed.rating, count: seed.ratingCount },
                    sessionModes: ['Video Call', 'Phone Call'],
                    freeSessionMinutes: 30,
                    paidSessionMinutes: 60,
                    paidSessionFee: 999,
                    availability,
                    maxDailyBookings: 8,
                    isAcceptingLeads: true,
                    isFeatured: seed.featured ?? false,
                    displayOrder: order,
                    status: 'active',
                    createdBy: adminId,
                    seo: {
                        title: `${seed.name} — ${seed.designation} | Admission Sathi`,
                        description: `Book a free counselling session with ${seed.name}, ${seed.designation.toLowerCase()} specialising in ${seed.specializations.join(', ').toLowerCase()}.`,
                    },
                },
            },
            { upsert: true },
        ).exec();
    }

    log(`Seeded ${COUNSELLOR_SEEDS.length} counsellors`);
}

/* ------------------------------- content --------------------------------- */

export async function seedContent(
    adminId: Types.ObjectId,
    ctx: Pick<SeedContext, 'examIdBySlug' | 'collegeIdBySlug' | 'courseIdBySlug' | 'stateIdBySlug'>,
) {
    let articleCount = 0;

    for (const [index, seed] of ARTICLE_SEEDS.entries()) {
        const slug = slugify(seed.title);
        const contentHtml = html([
            `<h2 id="overview">Overview</h2>`,
            seed.excerpt,
            `<h2 id="what-matters">What actually matters</h2>`,
            'Start with the constraints you cannot change — budget, location and eligibility — and only then compare the options that remain. Most poor decisions come from comparing on a single metric.',
            '<ul><li>Confirm approval and affiliation before anything else</li><li>Compare total cost of attendance, not just tuition</li><li>Read the placement report line by line</li><li>Talk to at least two current students</li></ul>',
            `<h2 id="step-by-step">Step by step</h2>`,
            '<ol><li>List your non-negotiables</li><li>Shortlist 8–10 realistic options</li><li>Rank them on fee, outcome and fit</li><li>Validate with a counsellor before locking choices</li></ol>',
            `<h2 id="common-mistakes">Common mistakes</h2>`,
            'Choosing a college purely on brand recall, ignoring the fee refund policy, and skipping the document checklist are the three most expensive mistakes we see every admission season.',
            `<h2 id="next-steps">Next steps</h2>`,
            'Use the college predictor for a probability band, shortlist with the comparison tool, then book a free counselling session to review your final list.',
            `<p><em>${DEMO_DATA_NOTICE}</em></p>`,
        ]);

        await Article.findOneAndUpdate(
            { slug },
            {
                $set: {
                    title: seed.title,
                    excerpt: seed.excerpt,
                    contentHtml,
                    category: seed.category,
                    tags: seed.tags,
                    authorName: 'Admission Sathi Editorial Team',
                    readingTimeMinutes: readingTimeMinutes(contentHtml),
                    tableOfContents: [
                        { id: 'overview', label: 'Overview', level: 2 },
                        { id: 'what-matters', label: 'What actually matters', level: 2 },
                        { id: 'step-by-step', label: 'Step by step', level: 2 },
                        { id: 'common-mistakes', label: 'Common mistakes', level: 2 },
                        { id: 'next-steps', label: 'Next steps', level: 2 },
                    ],
                    faqs: [
                        {
                            question: 'Where does this information come from?',
                            answer:
                                'Editorial guidance based on published admission processes. Always confirm dates and fees on the official portal.',
                            order: 1,
                        },
                    ],
                    isFeatured: index < 6,
                    isTrending: index < 10,
                    viewCount: 120 + (hashString(slug) % 4000),
                    status: 'published',
                    publishedAt: daysFromNow(-(index + 1) * 2),
                    createdBy: adminId,
                    seo: {
                        title: seed.title,
                        description: stripHtml(seed.excerpt).slice(0, 180),
                    },
                },
            },
            { upsert: true },
        ).exec();
        articleCount += 1;
    }

    for (const [index, seed] of NEWS_SEEDS.entries()) {
        const slug = slugify(seed.title);
        const exam = seed.examSlug ? ctx.examIdBySlug.get(seed.examSlug) : undefined;

        await NewsPost.findOneAndUpdate(
            { slug },
            {
                $set: {
                    title: seed.title,
                    summary: seed.summary,
                    contentHtml: html([seed.summary, `<p><em>${DEMO_DATA_NOTICE}</em></p>`]),
                    category: seed.category,
                    badge: seed.badge,
                    priority: seed.priority,
                    publishDate: daysFromNow(-index),
                    expiryDate: daysFromNow(45 - index),
                    targetExam: exam?.id,
                    targetExamName: exam?.shortName,
                    isFeatured: index < 4,
                    showInTrending: true,
                    status: 'published',
                    createdBy: adminId,
                    seo: { title: seed.title, description: seed.summary.slice(0, 180) },
                },
            },
            { upsert: true },
        ).exec();
    }

    // Global FAQs
    const globalFaqs = [
        {
            question: 'Is Admission Sathi counselling really free?',
            answerHtml:
                '<p>Yes. The first counselling session is free. Paid sessions with senior counsellors are optional and clearly priced before you book.</p>',
            category: 'Counselling',
        },
        {
            question: 'How accurate are the college predictors?',
            answerHtml:
                '<p>Predictors use imported previous-year closing data and configurable rules to produce probability bands. They are estimates, not admission guarantees.</p>',
            category: 'Predictors',
        },
        {
            question: 'Where do fees and cut-offs come from?',
            answerHtml:
                '<p>Data is collected from public sources and institute disclosures. Figures change every cycle, so always confirm with the official institute or authority.</p>',
            category: 'Data',
        },
        {
            question: 'Do you charge colleges for listings?',
            answerHtml:
                '<p>Sponsored placements are labelled. Editorial content and predictor results are not influenced by sponsorship.</p>',
            category: 'Platform',
        },
        {
            question: 'How do I get an education loan through the platform?',
            answerHtml:
                '<p>Compare lenders, check eligibility and use the EMI calculator. Submit an enquiry and a finance counsellor will guide you through documentation.</p>',
            category: 'Finance',
        },
    ];

    await FAQ.deleteMany({ scope: 'global' });
    await FAQ.insertMany(
        globalFaqs.map((faq, index) => ({
            ...faq,
            scope: 'global',
            displayOrder: (index + 1) * 10,
            isFeatured: index < 3,
            status: 'active',
            createdBy: adminId,
        })),
    );

    const homepageFaqs = HOMEPAGE_FAQ_SEEDS;

    await FAQ.deleteMany({ scope: 'homepage' });
    await FAQ.insertMany(
        homepageFaqs.map((faq, index) => ({
            ...faq,
            scope: 'homepage',
            displayOrder: (index + 1) * 10,
            isFeatured: true,
            status: 'active',
            createdBy: adminId,
        })),
    );

    // Resources: previous year papers + mock tests + guides
    await Resource.deleteMany({});
    const resourceRows: Record<string, unknown>[] = [];
    for (const seed of EXAM_SEEDS.slice(0, 8)) {
        const exam = ctx.examIdBySlug.get(seed.slug);
        for (let yearOffset = 1; yearOffset <= 3; yearOffset += 1) {
            resourceRows.push({
                title: `${seed.shortName} ${SEED_EXAM_YEAR - yearOffset} Question Paper with Answer Key`,
                slug: slugify(`${seed.shortName} ${SEED_EXAM_YEAR - yearOffset} question paper`),
                type: 'previous_year_paper',
                description: `Complete ${seed.shortName} ${SEED_EXAM_YEAR - yearOffset} question paper with the official answer key. Demonstration record.`,
                relatedExam: exam?.id,
                relatedExamName: seed.shortName,
                year: SEED_EXAM_YEAR - yearOffset,
                fileUrl: '/resources/sample-paper.pdf',
                fileType: 'application/pdf',
                fileSizeKb: 820,
                isFree: true,
                requiresLogin: false,
                status: 'published',
                publishedAt: new Date(),
                createdBy: adminId,
            });
        }
        resourceRows.push({
            title: `${seed.shortName} Full-Length Mock Test`,
            slug: slugify(`${seed.shortName} full length mock test`),
            type: 'mock_test',
            description: `Timed ${seed.shortName} mock test matching the latest pattern. Demonstration record.`,
            relatedExam: exam?.id,
            relatedExamName: seed.shortName,
            durationMinutes: 180,
            questionCount: 90,
            difficulty: 'Moderate',
            isFree: true,
            requiresLogin: true,
            status: 'published',
            publishedAt: new Date(),
            createdBy: adminId,
        });
        resourceRows.push({
            title: `${seed.shortName} Syllabus & Preparation Guide`,
            slug: slugify(`${seed.shortName} syllabus preparation guide`),
            type: 'guide',
            description: `Topic-wise ${seed.shortName} syllabus with a week-by-week preparation plan.`,
            relatedExam: exam?.id,
            relatedExamName: seed.shortName,
            contentHtml: html([
                'This guide breaks the syllabus into weekly targets with revision checkpoints and mock test cadence.',
            ]),
            isFree: true,
            status: 'published',
            publishedAt: new Date(),
            createdBy: adminId,
        });
    }

    // State counselling guides: one per major state
    for (const [index, state] of STATE_SEEDS.slice(0, 10).entries()) {
        const stateSlug = slugify(state.name);
        const authority = state.counsellingAuthority ?? 'the designated state counselling authority';
        const title = `${state.name} Engineering Counselling Guide ${SEED_EXAM_YEAR}`;
        resourceRows.push({
            title,
            slug: slugify(title),
            type: 'state_counselling_guide',
            description: `How engineering counselling works in ${state.name}: registration with ${authority}, document verification, choice filling, seat allotment rounds and reporting. Process explainer only — verify every date and fee on the official portal.`,
            relatedState: ctx.stateIdBySlug.get(stateSlug),
            contentHtml: html([
                `<h2 id="who-conducts">Who conducts the counselling</h2>`,
                `Admission to state-quota engineering seats in ${state.name} is handled centrally by ${authority}. Institute-level seats left vacant after the central rounds are usually filled by the colleges themselves under the authority's rules.`,
                `<h2 id="registration">Step 1 — Registration</h2>`,
                'Create an account on the counselling portal, enter your entrance exam roll number and personal details, then pay the registration fee. Use a mobile number and email you will keep access to for the whole cycle, because allotment and reporting alerts go there.',
                `<h2 id="verification">Step 2 — Document verification</h2>`,
                'Upload or physically verify your Class 10 and 12 marksheets, entrance exam scorecard, domicile proof, category certificate (if claiming reservation) and income certificate where a fee concession is claimed. Mismatched names or missing certificates are the most common reason a candidature is put on hold.',
                `<h2 id="choice-filling">Step 3 — Choice filling and locking</h2>`,
                'Order college-and-branch combinations strictly by genuine preference — allotment engines honour your order, not your expectations. Fill more choices than you think you need, keep a few safe options at the bottom, and lock before the window closes; unlocked choices may be auto-locked as submitted.',
                `<h2 id="allotment">Step 4 — Seat allotment rounds</h2>`,
                'Seats are allotted over multiple rounds using merit, category, quota and your locked preference order. If you are allotted a seat you can typically freeze it, or opt to float or slide for a better choice in later rounds while retaining the current seat, subject to the rules published for that cycle.',
                `<h2 id="reporting">Step 5 — Reporting and fee payment</h2>`,
                'Pay the seat acceptance fee online within the stated window and report to the allotted institute (or a designated help centre) with original documents. Missing the reporting window normally cancels the allotment and can forfeit the fee.',
                `<h2 id="mop-up">Mop-up and spot rounds</h2>`,
                'Vacant seats after the main rounds go to mop-up or spot counselling, which may be open to fresh registrations. Eligibility, fees and reporting timelines for these rounds are announced separately by the authority.',
                `<p><em>${DEMO_DATA_NOTICE}</em></p>`,
            ]),
            year: SEED_EXAM_YEAR,
            isFree: true,
            requiresLogin: false,
            isFeatured: index < 4,
            status: 'published',
            publishedAt: daysFromNow(-(index + 1)),
            createdBy: adminId,
            seo: {
                title: `${state.name} Engineering Counselling ${SEED_EXAM_YEAR} — Process, Rounds & Documents`,
                description: `Step-by-step ${state.name} engineering counselling process: registration, document verification, choice filling, seat allotment and reporting.`,
            },
        });
    }

    // E-books
    const ebookSeeds = [
        {
            title: 'Entrance Exam Preparation Planner',
            description: 'A printable 16-week planner with weekly subject targets, revision checkpoints and mock test cadence. Demonstration record.',
            sizeKb: 1240,
        },
        {
            title: 'Course Selection Workbook',
            description: 'Guided worksheets that help you rank streams and courses against aptitude, budget and long-term career goals. Demonstration record.',
            sizeKb: 980,
        },
        {
            title: 'Education Loan Handbook',
            description: 'How lenders assess a student loan file: co-applicant income, collateral thresholds, moratorium and repayment planning. Demonstration record.',
            sizeKb: 1460,
        },
        {
            title: 'Scholarship Application Guide',
            description: 'Types of merit, means and category scholarships, the documents each one needs, and how to avoid rejection on technicalities. Demonstration record.',
            sizeKb: 1120,
        },
        {
            title: 'Counselling Day Checklist',
            description: 'Document checklist, fee payment steps and reporting do-and-don\u2019t list to carry into any counselling round. Demonstration record.',
            sizeKb: 640,
        },
    ];

    for (const [index, ebook] of ebookSeeds.entries()) {
        resourceRows.push({
            title: ebook.title,
            slug: slugify(ebook.title),
            type: 'ebook',
            description: ebook.description,
            contentHtml: html([ebook.description, `<p><em>${DEMO_DATA_NOTICE}</em></p>`]),
            fileUrl: '/resources/sample-ebook.pdf',
            fileType: 'application/pdf',
            fileSizeKb: ebook.sizeKb,
            isFree: true,
            requiresLogin: index > 2,
            isFeatured: index < 2,
            status: 'published',
            publishedAt: daysFromNow(-(index + 2)),
            createdBy: adminId,
            seo: {
                title: `${ebook.title} — Free Download`,
                description: ebook.description.slice(0, 180),
            },
        });
    }

    // Webinars
    const webinarSeeds = [
        {
            title: 'Choice Filling Masterclass for Engineering Counselling',
            description: 'A walkthrough of preference ordering, freeze-float-slide decisions and the mistakes that cost candidates a better seat. Demonstration record.',
            durationMinutes: 60,
        },
        {
            title: 'Medical Counselling: All India Quota vs State Quota',
            description: 'How the two quota streams run in parallel, who is eligible for each, and how to plan a preference list across both. Demonstration record.',
            durationMinutes: 75,
        },
        {
            title: 'Funding Your Degree: Loans, Scholarships and Fee Planning',
            description: 'Session on building a realistic funding plan — total cost of attendance, loan eligibility and scholarship timelines. Demonstration record.',
            durationMinutes: 55,
        },
        {
            title: 'Reading a Placement Report Critically',
            description: 'Median versus average package, participation rate and the fine print to check before you shortlist a college. Demonstration record.',
            durationMinutes: 45,
        },
        {
            title: 'Stream Selection After Class 12: A Counsellor Q&A',
            description: 'Live question-and-answer session on matching aptitude and interest to a degree pathway. Demonstration record.',
            durationMinutes: 50,
        },
    ];

    for (const [index, webinar] of webinarSeeds.entries()) {
        resourceRows.push({
            title: webinar.title,
            slug: slugify(webinar.title),
            type: 'webinar',
            description: webinar.description,
            contentHtml: html([webinar.description, `<p><em>${DEMO_DATA_NOTICE}</em></p>`]),
            speakerName: COUNSELLOR_SEEDS[index % COUNSELLOR_SEEDS.length].name,
            webinarAt: daysFromNow((index + 1) * 7),
            durationMinutes: webinar.durationMinutes,
            externalUrl: 'https://meet.example.com/admission-sathi-demo-webinar',
            isFree: true,
            requiresLogin: true,
            isFeatured: index < 2,
            status: 'published',
            publishedAt: daysFromNow(-(index + 1)),
            createdBy: adminId,
            seo: {
                title: `${webinar.title} — Live Webinar`,
                description: webinar.description.slice(0, 180),
            },
        });
    }

    // Admission calendars
    const calendarSeeds = [
        {
            title: `Engineering Admission Calendar ${SEED_EXAM_YEAR}`,
            stream: 'engineering',
            description: `Stage-wise engineering admission cycle for ${SEED_EXAM_YEAR}: entrance exam registration, exam and result, central and state counselling rounds, then institute reporting. Sequence only — confirm every date with the official authority.`,
        },
        {
            title: `Medical Admission Calendar ${SEED_EXAM_YEAR}`,
            stream: 'medical',
            description: `Stage-wise medical admission cycle for ${SEED_EXAM_YEAR}: entrance exam registration, exam and result, all-India and state quota counselling rounds, then college reporting. Sequence only — confirm every date with the official authority.`,
        },
    ];

    for (const [index, calendar] of calendarSeeds.entries()) {
        resourceRows.push({
            title: calendar.title,
            slug: slugify(calendar.title),
            type: 'admission_calendar',
            description: calendar.description,
            contentHtml: html([
                `<h2 id="how-to-use">How to use this calendar</h2>`,
                `This calendar lists the ${calendar.stream} admission cycle in the order the stages actually occur, without asserting any date. Official notifications shift every year, so treat each stage as a checkpoint and confirm the window on the conducting authority's portal.`,
                `<h2 id="stages">Stages in order</h2>`,
                '<ol><li>Entrance exam notification and online registration</li><li>Correction window and admit card release</li><li>Exam date, answer key and objection window</li><li>Result and scorecard download</li><li>Counselling registration and document verification</li><li>Choice filling and locking</li><li>Seat allotment rounds, then freeze, float or slide</li><li>Fee payment and reporting to the allotted institute</li><li>Mop-up or spot rounds for vacant seats</li></ol>',
                `<h2 id="what-to-track">What to track yourself</h2>`,
                'Keep the official portal, your registration number and your document set in one place, and check the authority notice board weekly once the cycle opens. Deadlines are rarely extended twice.',
                `<p><em>${DEMO_DATA_NOTICE}</em></p>`,
            ]),
            year: SEED_EXAM_YEAR,
            isFree: true,
            requiresLogin: false,
            isFeatured: index === 0,
            status: 'published',
            publishedAt: daysFromNow(-(index + 1)),
            createdBy: adminId,
            seo: {
                title: `${calendar.title} — Stage-wise Admission Timeline`,
                description: calendar.description.slice(0, 180),
            },
        });
    }

    await Resource.insertMany(resourceRows);

    // Reviews for a handful of colleges
    await Review.deleteMany({});
    const colleges = await College.find({ status: 'published' })
        .select('_id name slug')
        .limit(12)
        .lean()
        .exec();

    const reviewTemplates = [
        {
            title: 'Strong faculty support and active placement cell',
            text: 'The teaching staff is approachable and the placement cell starts preparation from the pre-final year. Labs are well maintained and the library subscription list is genuinely useful for projects.',
            pros: 'Faculty support, placement preparation, lab infrastructure',
            cons: 'Hostel mess menu could be more varied',
            rating: 4.5,
        },
        {
            title: 'Good academics, campus life could improve',
            text: 'Academics are rigorous and the curriculum is updated regularly. Clubs exist but need more student-led initiative. Overall a solid choice for the fee you pay.',
            pros: 'Updated curriculum, transparent evaluation',
            cons: 'Limited club activity, crowded canteen at peak hours',
            rating: 4.0,
        },
        {
            title: 'Value for money for a private institute',
            text: 'Fees are reasonable compared to peers in the city and the placement percentage is consistent. Faculty availability during project work is the biggest positive.',
            pros: 'Reasonable fee, consistent placements',
            cons: 'Sports facilities are basic',
            rating: 4.2,
        },
    ];

    const reviewRows: Record<string, unknown>[] = [];
    colleges.forEach((college, collegeIndex) => {
        reviewTemplates.forEach((template, index) => {
            reviewRows.push({
                college: college._id,
                collegeName: college.name,
                collegeSlug: college.slug,
                authorName: ['Rohit S.', 'Anjali M.', 'Faizan K.'][index],
                isAnonymous: index === 2,
                title: template.title,
                reviewText: template.text,
                pros: template.pros,
                cons: template.cons,
                passingYear: new Date().getFullYear() - (index + 1),
                ratings: {
                    overall: template.rating,
                    placement: Math.min(5, template.rating - 0.1),
                    faculty: Math.min(5, template.rating + 0.2),
                    infrastructure: Math.min(5, template.rating - 0.2),
                    campusLife: Math.min(5, template.rating + 0.1),
                    valueForMoney: Math.min(5, template.rating),
                },
                helpfulCount: 3 + ((collegeIndex + index) % 12),
                verificationStatus: 'email_verified',
                moderationStatus: index === 2 ? 'pending' : 'approved',
                isFeatured: collegeIndex < 2 && index === 0,
                createdBy: adminId,
            });
        });
    });
    await Review.insertMany(reviewRows);

    log(
        `Seeded ${articleCount} articles, ${NEWS_SEEDS.length} news updates, ${resourceRows.length} resources, ${reviewRows.length} reviews, ${globalFaqs.length} FAQs`,
    );
}

/* ------------------------- sample CRM records ---------------------------- */

export async function seedSampleLeads(adminId: Types.ObjectId) {
    await Lead.deleteMany({});
    await LeadActivity.deleteMany({});
    await CounsellingBooking.deleteMany({});

    const counsellors = await Counsellor.find().select('_id name').limit(5).lean().exec();
    // Every stage in `LEAD_STATUSES`, so each column of the CRM board has something
    // in it — an all-empty column reads like a broken screen in a demo.
    const statuses = [
        'new',
        'contacted',
        'qualified',
        'session_scheduled',
        'session_completed',
        'follow_up',
        'converted',
        'closed',
        'lost',
    ];
    const sources = [
        'homepage_counselling_form',
        'predictor_submission',
        'college_enquiry',
        'loan_enquiry',
        'whatsapp_cta',
    ];
    const names = [
        'Aditya Sharma',
        'Sneha Nair',
        'Rohit Kumar',
        'Fatima Ansari',
        'Karthik Reddy',
        'Ishita Bose',
        'Manav Patel',
        'Divya Menon',
        'Yashwant Singh',
        'Pooja Deshmukh',
        'Rehan Qureshi',
        'Ananya Iyer',
    ];

    const leads = [];
    for (const [index, name] of names.entries()) {
        const status = statuses[index % statuses.length]!;
        const counsellor = counsellors[index % Math.max(1, counsellors.length)];
        const phone = `98${String(10000000 + index * 111111).slice(0, 8)}`;

        const lead = await Lead.create({
            reference: `AS-DEMO-${String(index + 1).padStart(4, '0')}`,
            name,
            phone,
            phoneNormalized: phone.slice(-10),
            email: `${slugify(name)}@example.com`,
            courseInterestName: ['B.Tech', 'MBBS', 'MBA', 'BCA', 'B.Sc Nursing'][index % 5],
            preferredTimeLabel: ['morning', 'evening', 'anytime'][index % 3],
            source: sources[index % sources.length],
            assignedTo: counsellor?._id,
            assignedToName: counsellor?.name,
            assignedAt: new Date(),
            status,
            priority: ['low', 'medium', 'high'][index % 3],
            score: 40 + ((index * 7) % 55),
            followUpAt: daysFromNow((index % 5) + 1),
            consent: { given: true, givenAt: new Date(), textVersion: 'v1' },
            createdBy: adminId,
            createdAt: daysFromNow(-index),
        });

        await LeadActivity.create({
            lead: lead._id,
            type: 'created',
            title: 'Demonstration lead created by the seed script',
            isInternal: true,
            actorName: 'Seed script',
        });

        // A lead past the "qualified" stage should have a real stage change behind it,
        // otherwise every seeded timeline is a single "created" row.
        if (status !== 'new') {
            await LeadActivity.create({
                lead: lead._id,
                type: 'status_change',
                title: `Status moved to ${status.replace(/_/g, ' ')}`,
                fromValue: 'new',
                toValue: status,
                isInternal: true,
                actorName: counsellor?.name ?? 'Seed script',
            });
        }

        if (['session_scheduled', 'session_completed', 'converted'].includes(status)) {
            const booking = await CounsellingBooking.create({
                reference: `BK-DEMO-${String(index + 1).padStart(4, '0')}`,
                lead: lead._id,
                counsellor: counsellor?._id,
                counsellorName: counsellor?.name,
                type: 'career',
                mode: 'Video Call',
                studentName: name,
                phone,
                email: `${slugify(name)}@example.com`,
                scheduledAt: daysFromNow((index % 6) + 1),
                durationMinutes: 30,
                preferredTimeLabel: 'morning',
                status: status === 'session_scheduled' ? 'confirmed' : 'completed',
                meetingLink: 'https://meet.example.org/demo-session',
                source: 'seed',
                createdBy: adminId,
            });
            await Lead.updateOne({ _id: lead._id }, { $push: { bookings: booking._id } });
        }

        leads.push(lead);
    }

    log(`Seeded ${leads.length} demonstration leads with activities and bookings`);
}
