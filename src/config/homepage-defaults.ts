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
        key: 'whatsapp_community',
        name: 'WhatsApp community panel',
        isEnabled: true,
        displayOrder: 9,
        heading: 'Join Our WhatsApp Community',
        description: 'Get updates, alerts, PDFs & counselling tips directly!',
        ctaLabel: 'Join Now',
        config: { showQr: true },
    },
    {
        key: 'platform_stats',
        name: 'Platform statistics strip',
        isEnabled: true,
        displayOrder: 10,
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
        displayOrder: 11,
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
