import type { HomepageSectionKey } from './constants';

/**
 * Bootstrap definition of every homepage section.
 * The seed script writes these into the `HomepageSection` collection; the admin
 * Homepage Builder edits them; the homepage renders whatever the DB returns and
 * falls back to these values only when a section row is missing.
 */
export interface HomepageSectionDraft {
    key: HomepageSectionKey;
    name: string;
    isEnabled: boolean;
    displayOrder: number;
    heading?: string;
    subheading?: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    config: Record<string, unknown>;
}

export const HOMEPAGE_SECTION_DRAFTS: HomepageSectionDraft[] = [
    {
        key: 'hero',
        name: 'Hero, search & counselling form',
        isEnabled: true,
        displayOrder: 1,
        heading: 'Your Dream College',
        subheading: 'is a Step Away!',
        description: 'Explore courses, colleges, exams and get expert guidance — all in one place.',
        config: {
            eyebrow: 'WELCOME TO ADMISSION SATHI',
            highlightText: 'Step Away!',
            headingBeforeHighlight: 'Your Dream College is a',
            trustStats: [
                { label: 'Top Colleges', value: '1000+', icon: 'Building2', tone: 'navy' },
                { label: 'Courses', value: '50+', icon: 'BookOpen', tone: 'blue' },
                { label: 'Students Guided', value: '20K+', icon: 'Users', tone: 'purple' },
                { label: 'Success Rate', value: '95%', icon: 'CircleCheck', tone: 'green' },
            ],
            searchTitle: 'What do you want to study?',
            searchPlaceholder: 'Search Course, College, Exam or Keyword…',
            popularSearchesLabel: 'Popular Searches:',
            popularSearches: [
                { label: 'B.Tech', url: '/courses/b-tech' },
                { label: 'MBBS', url: '/courses/mbbs' },
                { label: 'MBA', url: '/courses/mba' },
                { label: 'BCA', url: '/courses/bca' },
                { label: 'BBA', url: '/courses/bba' },
                { label: 'Nursing', url: '/courses/b-sc-nursing' },
            ],
            heroImage: {
                url: '/brand/hero-students.svg',
                alt: 'Three students holding books and smiling on a college campus',
            },
            heroImageMobile: {
                url: '/brand/hero-students-mobile.svg',
                alt: 'Students smiling on a college campus',
            },
            form: {
                title: 'Book Free Counselling Session',
                subtitle: 'Get expert guidance for your dream career',
                submitLabel: 'Book My Counselling',
                badges: [
                    { label: '100% Free', icon: 'BadgeCheck' },
                    { label: 'Expert Guidance', icon: 'UserCheck' },
                    { label: 'Confidential', icon: 'Lock' },
                ],
                showEmail: false,
                showState: true,
                showCity: false,
            },
        },
    },
    {
        key: 'quick_actions',
        name: 'Hero quick action cards',
        isEnabled: true,
        displayOrder: 2,
        config: {
            cards: [
                { title: 'Find Courses', subtitle: 'Explore all courses', icon: 'GraduationCap', url: '/courses', tone: 'blue' },
                { title: 'Find Colleges', subtitle: 'Search top colleges', icon: 'Building2', url: '/colleges', tone: 'green' },
                { title: 'Predict Your College', subtitle: 'Check your chances', icon: 'Target', url: '/predictors', tone: 'purple' },
                { title: 'Book Counselling', subtitle: 'Talk to our experts', icon: 'Headphones', url: '/book-counselling', tone: 'orange' },
            ],
        },
    },
    {
        key: 'top_courses',
        name: 'Explore Top Courses',
        isEnabled: true,
        displayOrder: 3,
        heading: 'Explore Top Courses',
        ctaLabel: 'View All Courses',
        ctaUrl: '/courses',
        config: {
            limit: 8,
            /** empty = automatically use featured categories ordered by displayOrder */
            categorySlugs: [],
        },
    },
    {
        key: 'compare_colleges',
        name: 'Compare Colleges widget',
        isEnabled: true,
        displayOrder: 4,
        heading: 'Compare Colleges',
        description: 'Compare up to 4 colleges side by side',
        ctaLabel: 'View Comparison',
        ctaUrl: '/compare-colleges',
        config: {
            maxColleges: 4,
            /** Pre-filled example colleges (slugs). Users can remove/replace them. */
            defaultCollegeSlugs: [],
            suggestionLimit: 3,
        },
    },
    {
        key: 'college_predictor',
        name: 'Predict Your College band',
        isEnabled: true,
        displayOrder: 5,
        heading: 'Predict Your College',
        description:
            'Use our advanced predictors to check the best colleges you can get based on your score.',
        ctaLabel: 'View All Predictors',
        ctaUrl: '/predictors',
        config: {
            // 4 predictors + the "More" card fills one row of 5 on desktop.
            limit: 4,
            predictorSlugs: [],
            moreCardLabel: 'More Predictors',
            moreCardCtaLabel: 'View All',
        },
    },
    {
        key: 'guidance_tools',
        name: 'Guidance, loan, exam & tool cards',
        isEnabled: true,
        displayOrder: 6,
        config: {
            groups: [
                {
                    title: 'Admission Guidance',
                    tone: 'navy',
                    ctaLabel: 'Know More',
                    ctaUrl: '/counselling',
                    items: [
                        { title: 'Career Counselling', subtitle: 'Get help from experts', icon: 'Compass', url: '/career-counselling', tone: 'blue' },
                        { title: 'Course Recommendation', subtitle: 'Find best course for you', icon: 'ListChecks', url: '/course-counselling', tone: 'teal' },
                        { title: 'Admission Process', subtitle: 'Step by step guidance', icon: 'Route', url: '/guides/admission-process', tone: 'purple' },
                        { title: 'State & Entrance Updates', subtitle: 'Latest notifications', icon: 'BellRing', url: '/news', tone: 'orange' },
                    ],
                },
                {
                    title: 'Loan & Finance',
                    tone: 'green',
                    ctaLabel: 'Explore Loans',
                    ctaUrl: '/education-loans',
                    items: [
                        { title: 'Loan Eligibility Check', subtitle: 'Check how much loan you can get', icon: 'ShieldCheck', url: '/education-loans/eligibility', tone: 'green' },
                        { title: 'Loan Calculator', subtitle: 'Calculate EMI & interest', icon: 'Calculator', url: '/education-loans/calculator', tone: 'blue' },
                        { title: 'Top Education Loans', subtitle: 'Compare banks & interest rates', icon: 'Landmark', url: '/education-loans/compare', tone: 'purple' },
                        { title: 'Documents Required', subtitle: 'Check list of documents', icon: 'FileCheck', url: '/education-loans#documents', tone: 'orange' },
                    ],
                },
                {
                    title: 'Exams & Preparation',
                    tone: 'purple',
                    ctaLabel: 'Start Practicing',
                    ctaUrl: '/mock-tests',
                    items: [
                        { title: 'Previous Year Papers', subtitle: 'Download past 10 years papers', icon: 'FileStack', url: '/previous-year-papers', tone: 'blue' },
                        { title: 'Mock Tests', subtitle: 'Take full length mock tests', icon: 'ClipboardList', url: '/mock-tests', tone: 'teal' },
                        { title: 'Exam Syllabus', subtitle: 'Detailed syllabus & pattern', icon: 'BookOpenCheck', url: '/exams', tone: 'purple' },
                        { title: 'Preparation Tips', subtitle: 'Topper tips & study material', icon: 'Lightbulb', url: '/resources?type=guide', tone: 'orange' },
                    ],
                },
                {
                    title: 'College Tools',
                    tone: 'orange',
                    ctaLabel: 'Explore Tools',
                    ctaUrl: '/predictors',
                    items: [
                        { title: 'College Predictor', subtitle: 'Rule based college predictions', icon: 'Target', url: '/predictors', tone: 'blue' },
                        { title: 'College Compare', subtitle: 'Compare up to 4 colleges', icon: 'GitCompare', url: '/compare-colleges', tone: 'teal' },
                        { title: 'College Reviews', subtitle: 'Ratings & student reviews', icon: 'Star', url: '/college-reviews', tone: 'purple' },
                        { title: 'Scholarships', subtitle: 'Find scholarships for you', icon: 'Award', url: '/scholarships', tone: 'pink' },
                    ],
                },
            ],
        },
    },
    {
        key: 'trending',
        name: 'Trending Now feed',
        isEnabled: true,
        displayOrder: 7,
        heading: 'Trending Now',
        ctaLabel: 'View All Updates',
        ctaUrl: '/news',
        config: { limit: 4, categories: [] },
    },
    {
        key: 'ai_assistant',
        name: 'Ask Admission Sathi AI panel',
        isEnabled: true,
        displayOrder: 8,
        heading: 'Ask Admission Sathi AI',
        description: 'Get instant answers to all your admission & career related questions.',
        config: {
            suggestions: [
                'Which colleges can I get with 92 percentile in JEE Main?',
                'What is the eligibility for B.Sc Nursing?',
                'Compare MBA fees in Pune and Bengaluru',
            ],
        },
    },
    {
        key: 'loan_promo',
        name: 'Loan calculator promo card',
        isEnabled: true,
        displayOrder: 9,
        heading: 'Loan Calculator',
        description: 'Calculate education loan EMI, interest and eligibility in seconds.',
        ctaLabel: 'Calculate Now',
        ctaUrl: '/education-loans/calculator',
        config: {
            icon: 'Calculator',
            tone: 'teal',
            highlights: [
                { label: 'Rates from', value: '8.5%' },
                { label: 'Collateral-free up to', value: '₹ 7.5 L' },
            ],
        },
    },
    {
        key: 'whatsapp_community',
        name: 'WhatsApp community panel',
        isEnabled: true,
        displayOrder: 10,
        heading: 'Join Our WhatsApp Community',
        description: 'Get updates, alerts, PDFs & counselling tips directly!',
        ctaLabel: 'Join Now',
        config: { showQr: true },
    },
    {
        key: 'featured_colleges',
        name: 'Featured colleges',
        isEnabled: true,
        displayOrder: 11,
        heading: 'Top Colleges Students Are Shortlisting',
        description:
            'Compare fees, ranking, accreditation and placement records before you fill your choice list.',
        ctaLabel: 'View All Colleges',
        ctaUrl: '/colleges',
        config: {
            limit: 6,
            collegeSlugs: [],
            showRating: true,
            showFees: true,
            showPlacement: true,
        },
    },
    {
        key: 'upcoming_dates',
        name: 'Upcoming admission & exam dates',
        isEnabled: true,
        displayOrder: 12,
        heading: 'Dates You Cannot Afford to Miss',
        description:
            'Registration windows, exam days and result dates for the exams we track. Always confirm on the official portal.',
        ctaLabel: 'Full Exam Calendar',
        ctaUrl: '/exams',
        config: { limit: 6, keyDatesOnly: true, showTentativeBadge: true },
    },
    {
        key: 'scholarships',
        name: 'Scholarship spotlight',
        isEnabled: true,
        displayOrder: 13,
        heading: 'Scholarships Closing Soon',
        description: 'Government, private and institute schemes with the deadline shown up front.',
        ctaLabel: 'All Scholarships',
        ctaUrl: '/scholarships',
        config: { limit: 3, scholarshipSlugs: [] },
    },
    {
        key: 'student_reviews',
        name: 'Verified student reviews',
        isEnabled: true,
        displayOrder: 14,
        heading: 'What Students Say About Their Colleges',
        description: 'Moderated reviews from students who actually studied there.',
        ctaLabel: 'Read All Reviews',
        ctaUrl: '/college-reviews',
        config: { limit: 3, minRating: 4, showAggregate: true },
    },
    {
        key: 'latest_articles',
        name: 'Latest guides & insights',
        isEnabled: true,
        displayOrder: 15,
        heading: 'Guides From Our Counselling Desk',
        description: 'Practical walk-throughs of admission processes, cut-off trends and fee planning.',
        ctaLabel: 'All Articles',
        ctaUrl: '/articles',
        config: { limit: 3, featuredOnly: false },
    },
    {
        key: 'counsellors',
        name: 'Meet the counsellors',
        isEnabled: true,
        displayOrder: 16,
        heading: 'Meet the Counsellors Who Will Guide You',
        description:
            'Stream specialists who have worked through JoSAA, NEET, CAT and state counselling rounds.',
        ctaLabel: 'View All Counsellors',
        ctaUrl: '/counsellors',
        config: { limit: 4, counsellorSlugs: [], showRating: true },
    },
    {
        key: 'why_choose_us',
        name: 'Why choose Admission Sathi',
        isEnabled: true,
        displayOrder: 17,
        heading: 'Why Students Choose Admission Sathi',
        description: 'No commission-driven shortlists. No hidden fees. Just verified information and guidance.',
        config: {
            items: [
                {
                    title: 'Free, unbiased counselling',
                    description: 'Our counsellors are salaried, not commissioned, so a shortlist is built around you.',
                    icon: 'HeartHandshake',
                    tone: 'green',
                },
                {
                    title: 'Data you can check',
                    description: 'Every fee, cut-off and placement figure names its source and the year it applies to.',
                    icon: 'ShieldCheck',
                    tone: 'navy',
                },
                {
                    title: 'Predictions, not promises',
                    description: 'Predictors show a probability band from historical cut-offs, never a guaranteed seat.',
                    icon: 'Target',
                    tone: 'purple',
                },
                {
                    title: 'One place, whole journey',
                    description: 'Course choice, entrance exams, counselling rounds, scholarships and loans in one account.',
                    icon: 'Route',
                    tone: 'orange',
                },
            ],
        },
    },
    {
        key: 'explore_directory',
        name: 'Explore by state, city & stream',
        isEnabled: true,
        displayOrder: 18,
        heading: 'Explore Colleges Your Way',
        description: 'Start from where you want to study, what you want to study, or the exam you have written.',
        config: {
            stateLimit: 8,
            cityLimit: 8,
            columns: [
                {
                    title: 'By stream',
                    icon: 'LayoutGrid',
                    links: [
                        { label: 'Engineering colleges', url: '/colleges/course/b-tech' },
                        { label: 'Medical colleges', url: '/colleges/course/mbbs' },
                        { label: 'MBA colleges', url: '/colleges/course/mba' },
                        { label: 'BCA colleges', url: '/colleges/course/bca' },
                        { label: 'Nursing colleges', url: '/colleges/course/b-sc-nursing' },
                        { label: 'All streams', url: '/courses/category' },
                    ],
                },
                {
                    title: 'By exam',
                    icon: 'FileText',
                    links: [
                        { label: 'Colleges accepting JEE Main', url: '/colleges/exam/jee-main' },
                        { label: 'Colleges accepting NEET UG', url: '/colleges/exam/neet-ug' },
                        { label: 'Colleges accepting CUET', url: '/colleges/exam/cuet-ug' },
                        { label: 'Colleges accepting CAT', url: '/colleges/exam/cat' },
                        { label: 'All entrance exams', url: '/colleges/exam' },
                    ],
                },
                {
                    title: 'By level',
                    icon: 'ListChecks',
                    links: [
                        { label: 'Undergraduate courses', url: '/courses/level/undergraduate' },
                        { label: 'Postgraduate courses', url: '/courses/level/postgraduate' },
                        { label: 'Diploma courses', url: '/courses/level/diploma' },
                        { label: 'Integrated courses', url: '/courses/level/integrated' },
                        { label: 'All levels', url: '/courses/level' },
                    ],
                },
            ],
        },
    },
    {
        key: 'faq',
        name: 'Homepage FAQ',
        isEnabled: true,
        displayOrder: 19,
        heading: 'Questions Students Ask Us Most',
        description: 'Short answers to the things worth knowing before you start.',
        ctaLabel: 'All FAQs',
        ctaUrl: '/faqs',
        config: { limit: 6, scope: 'homepage', emitStructuredData: true },
    },
    {
        key: 'app_download',
        name: 'Mobile app download band',
        isEnabled: false,
        displayOrder: 20,
        heading: 'Track Your Admission From Your Phone',
        description:
            'Deadline reminders, saved colleges and counselling updates, wherever you are.',
        config: {
            tone: 'navy',
            showQr: false,
            highlights: [
                'Deadline and result alerts',
                'Saved colleges and comparisons in sync',
                'Chat with your counsellor',
            ],
        },
    },
    {
        key: 'platform_stats',
        name: 'Platform statistics strip',
        isEnabled: true,
        displayOrder: 21,
        config: {
            stats: [
                { label: 'Colleges Across India', value: '1000+', icon: 'Building2', tone: 'navy' },
                { label: 'Courses Available', value: '50+', icon: 'BookOpen', tone: 'blue' },
                { label: 'Students Counselled', value: '1 Lakh+', icon: 'Users', tone: 'purple' },
                { label: 'Success Rate', value: '95%', icon: 'TrendingUp', tone: 'green' },
                { label: 'Expert Support', value: '24/7', icon: 'Headphones', tone: 'orange' },
            ],
            animateCounters: true,
        },
    },
    {
        key: 'sticky_cta',
        name: 'Sticky bottom counselling CTA',
        isEnabled: true,
        displayOrder: 22,
        heading: 'Still Confused? Talk to our expert counsellors',
        description: 'We are here to help you make the right career decision.',
        ctaLabel: 'Book Free Counselling Now',
        ctaUrl: '/book-counselling',
        config: {
            showCall: true,
            showWhatsapp: true,
            callLabel: 'Call Now',
            whatsappLabel: 'WhatsApp',
            whatsappSubLabel: 'Chat with us',
        },
    },
];

export const HOMEPAGE_DRAFT_MAP: Record<string, HomepageSectionDraft> = Object.fromEntries(
    HOMEPAGE_SECTION_DRAFTS.map((s) => [s.key, s]),
);
