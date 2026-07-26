import type { NavNode } from '@/services/navigation.service';

/**
 * Bootstrap navigation definition.
 *
 * This is NOT used to render a hard-coded menu in normal operation: the seed
 * script writes these rows into the `NavigationItem` collection and the site
 * reads them from MongoDB (so admins can edit every label, URL and order).
 * It doubles as a resilience fallback if the collection is empty or the
 * database is unreachable, so navigation never disappears.
 */

type Draft = {
    label: string;
    url: string;
    icon?: string;
    description?: string;
    itemType?: NavNode['itemType'];
    columnGroup?: string;
    badge?: string;
    isNew?: boolean;
    isFeatured?: boolean;
    openInNewTab?: boolean;
    visibility?: NavNode['visibility'];
    children?: Draft[];
};

let counter = 0;
function node(draft: Draft, path = 'nav'): NavNode {
    counter += 1;
    const id = `${path}-${counter}`;
    return {
        id,
        label: draft.label,
        url: draft.url,
        icon: draft.icon,
        description: draft.description,
        itemType: draft.itemType ?? (draft.children?.length ? 'dropdown' : 'link'),
        columnGroup: draft.columnGroup,
        badge: draft.badge,
        isNew: draft.isNew ?? false,
        isFeatured: draft.isFeatured ?? false,
        openInNewTab: draft.openInNewTab ?? false,
        visibility: draft.visibility ?? 'public',
        children: (draft.children ?? []).map((child) => node(child, id)),
    };
}

export const HEADER_MENU_DRAFT: Draft[] = [
    { label: 'Home', url: '/', icon: 'Home' },
    {
        label: 'Courses',
        url: '/courses',
        itemType: 'mega',
        children: [
            { label: 'Engineering', url: '/courses/b-tech', icon: 'Cog', description: 'B.Tech, M.Tech, Diploma', columnGroup: 'By Stream' },
            { label: 'Medical', url: '/courses/mbbs', icon: 'Stethoscope', description: 'MBBS, BDS, PG Medical', columnGroup: 'By Stream' },
            { label: 'Management', url: '/courses/mba', icon: 'Briefcase', description: 'MBA, BBA, PGDM', columnGroup: 'By Stream' },
            { label: 'BCA / IT', url: '/courses/bca', icon: 'Code2', description: 'BCA, MCA, B.Sc IT', columnGroup: 'By Stream' },
            { label: 'Pharmacy', url: '/courses/b-pharma', icon: 'Pill', description: 'B.Pharm, M.Pharm, D.Pharm', columnGroup: 'By Stream' },
            { label: 'Law', url: '/courses/llb', icon: 'Scale', description: 'LLB, BA LLB, LLM', columnGroup: 'By Stream' },
            { label: 'Nursing', url: '/courses/b-sc-nursing', icon: 'HeartPulse', description: 'B.Sc Nursing, GNM, Post Basic', columnGroup: 'By Stream' },
            { label: 'Paramedical', url: '/courses/bpt', icon: 'Activity', description: 'BPT, MLT, Radiology', columnGroup: 'By Stream' },
            { label: 'Undergraduate', url: '/courses?level=Undergraduate', columnGroup: 'By Level' },
            { label: 'Postgraduate', url: '/courses?level=Postgraduate', columnGroup: 'By Level' },
            { label: 'Diploma', url: '/courses?level=Diploma', columnGroup: 'By Level' },
            { label: 'Doctorate', url: '/courses?level=Doctorate', columnGroup: 'By Level' },
            { label: 'All Courses', url: '/courses', columnGroup: 'Explore', isFeatured: true },
            { label: 'Course Comparison', url: '/courses?compare=1', columnGroup: 'Explore' },
            { label: 'Course Recommendation', url: '/course-counselling', columnGroup: 'Explore', isNew: true },
        ],
    },
    {
        label: 'Colleges',
        url: '/colleges',
        itemType: 'mega',
        children: [
            { label: 'All Colleges', url: '/colleges', columnGroup: 'Browse', isFeatured: true },
            { label: 'Government Colleges', url: '/colleges?ownership=Government', columnGroup: 'Browse' },
            { label: 'Private Colleges', url: '/colleges?ownership=Private', columnGroup: 'Browse' },
            { label: 'Deemed Universities', url: '/colleges?ownership=Deemed', columnGroup: 'Browse' },
            { label: 'Engineering Colleges', url: '/colleges/course/b-tech', columnGroup: 'By Course' },
            { label: 'Medical Colleges', url: '/colleges/course/mbbs', columnGroup: 'By Course' },
            { label: 'MBA Colleges', url: '/colleges/course/mba', columnGroup: 'By Course' },
            { label: 'Law Colleges', url: '/colleges/course/llb', columnGroup: 'By Course' },
            { label: 'Colleges in Delhi', url: '/colleges/city/new-delhi', columnGroup: 'By City' },
            { label: 'Colleges in Bengaluru', url: '/colleges/city/bengaluru', columnGroup: 'By City' },
            { label: 'Colleges in Pune', url: '/colleges/city/pune', columnGroup: 'By City' },
            { label: 'Colleges in Chennai', url: '/colleges/city/chennai', columnGroup: 'By City' },
            { label: 'Compare Colleges', url: '/compare-colleges', columnGroup: 'Tools', isFeatured: true },
            { label: 'College Reviews', url: '/college-reviews', columnGroup: 'Tools' },
            { label: 'Scholarships', url: '/scholarships', columnGroup: 'Tools' },
        ],
    },
    {
        label: 'Predictors',
        url: '/predictors',
        itemType: 'dropdown',
        children: [
            { label: 'JEE Main College Predictor', url: '/predictors/jee-main-college-predictor', icon: 'Target' },
            { label: 'NEET UG College Predictor', url: '/predictors/neet-ug-college-predictor', icon: 'Target' },
            { label: 'NEET PG College Predictor', url: '/predictors/neet-pg-college-predictor', icon: 'Target' },
            { label: 'CUET College Predictor', url: '/predictors/cuet-college-predictor', icon: 'Target' },
            { label: 'CAT College Predictor', url: '/predictors/cat-college-predictor', icon: 'Target' },
            { label: 'CLAT College Predictor', url: '/predictors/clat-college-predictor', icon: 'Target' },
            { label: 'All Predictors', url: '/predictors', icon: 'LayoutGrid', isFeatured: true },
        ],
    },
    {
        label: 'Exams',
        url: '/exams',
        itemType: 'mega',
        children: [
            { label: 'JEE Main', url: '/exams/jee-main', columnGroup: 'Engineering' },
            { label: 'JEE Advanced', url: '/exams/jee-advanced', columnGroup: 'Engineering' },
            { label: 'BITSAT', url: '/exams/bitsat', columnGroup: 'Engineering' },
            { label: 'NEET UG', url: '/exams/neet-ug', columnGroup: 'Medical' },
            { label: 'NEET PG', url: '/exams/neet-pg', columnGroup: 'Medical' },
            { label: 'INI CET', url: '/exams/ini-cet', columnGroup: 'Medical' },
            { label: 'CAT', url: '/exams/cat', columnGroup: 'Management' },
            { label: 'XAT', url: '/exams/xat', columnGroup: 'Management' },
            { label: 'MAT', url: '/exams/mat', columnGroup: 'Management' },
            { label: 'CUET UG', url: '/exams/cuet-ug', columnGroup: 'University' },
            { label: 'CLAT', url: '/exams/clat', columnGroup: 'Law' },
            { label: 'AILET', url: '/exams/ailet', columnGroup: 'Law' },
            { label: 'All Exams', url: '/exams', columnGroup: 'Preparation', isFeatured: true },
            { label: 'Previous Year Papers', url: '/previous-year-papers', columnGroup: 'Preparation' },
            { label: 'Mock Tests', url: '/mock-tests', columnGroup: 'Preparation' },
        ],
    },
    {
        label: 'Counselling',
        url: '/counselling',
        itemType: 'dropdown',
        children: [
            { label: 'Book Free Counselling', url: '/book-counselling', icon: 'CalendarCheck', isFeatured: true },
            { label: 'Career Counselling', url: '/career-counselling', icon: 'Compass' },
            { label: 'College Counselling', url: '/college-counselling', icon: 'Building2' },
            { label: 'Course Counselling', url: '/course-counselling', icon: 'BookOpen' },
            { label: 'Our Counsellors', url: '/counsellors', icon: 'Users' },
            { label: 'State Counselling Guides', url: '/guides', icon: 'MapPin' },
        ],
    },
    {
        label: 'Loan & Finance',
        url: '/education-loans',
        itemType: 'dropdown',
        children: [
            { label: 'Education Loans', url: '/education-loans', icon: 'Landmark' },
            { label: 'Check Eligibility', url: '/education-loans/eligibility', icon: 'ShieldCheck' },
            { label: 'EMI Calculator', url: '/education-loans/calculator', icon: 'Calculator' },
            { label: 'Compare Loans', url: '/education-loans/compare', icon: 'GitCompare' },
            { label: 'Scholarships', url: '/scholarships', icon: 'Award' },
        ],
    },
    {
        label: 'Resources',
        url: '/resources',
        itemType: 'dropdown',
        children: [
            { label: 'Articles', url: '/articles', icon: 'FileText' },
            { label: 'News & Updates', url: '/news', icon: 'Newspaper' },
            { label: 'Guides', url: '/resources?type=guide', icon: 'BookMarked' },
            { label: 'Previous Year Papers', url: '/previous-year-papers', icon: 'FileStack' },
            { label: 'Mock Tests', url: '/mock-tests', icon: 'ClipboardList' },
            { label: 'E-Books', url: '/ebooks', icon: 'Book' },
            { label: 'Webinars', url: '/webinars', icon: 'Video' },
        ],
    },
    {
        label: 'More',
        url: '#',
        itemType: 'dropdown',
        children: [
            { label: 'About Us', url: '/about', icon: 'Info' },
            { label: 'Contact Us', url: '/contact', icon: 'Phone' },
            { label: 'Ask Admission Sathi AI', url: '/ai-assistant', icon: 'Sparkles', isNew: true },
            { label: 'Colleges by State', url: '/colleges/state', icon: 'Map' },
            { label: 'FAQs', url: '/faqs', icon: 'HelpCircle' },
            { label: 'Careers', url: '/careers', icon: 'Briefcase' },
        ],
    },
];

export const FOOTER_MENU_DRAFT: Draft[] = [
    {
        label: 'Top Courses',
        url: '/courses',
        itemType: 'heading',
        children: [
            { label: 'B.Tech', url: '/courses/b-tech' },
            { label: 'MBBS', url: '/courses/mbbs' },
            { label: 'MBA', url: '/courses/mba' },
            { label: 'BCA', url: '/courses/bca' },
            { label: 'B.Pharm', url: '/courses/b-pharma' },
            { label: 'BA LLB', url: '/courses/llb' },
            { label: 'B.Sc Nursing', url: '/courses/b-sc-nursing' },
        ],
    },
    {
        label: 'Colleges',
        url: '/colleges',
        itemType: 'heading',
        children: [
            { label: 'Engineering Colleges', url: '/colleges/course/b-tech' },
            { label: 'Medical Colleges', url: '/colleges/course/mbbs' },
            { label: 'MBA Colleges', url: '/colleges/course/mba' },
            { label: 'Law Colleges', url: '/colleges/course/llb' },
            { label: 'Compare Colleges', url: '/compare-colleges' },
            { label: 'College Reviews', url: '/college-reviews' },
        ],
    },
    {
        label: 'Exams',
        url: '/exams',
        itemType: 'heading',
        children: [
            { label: 'JEE Main', url: '/exams/jee-main' },
            { label: 'NEET UG', url: '/exams/neet-ug' },
            { label: 'CUET UG', url: '/exams/cuet-ug' },
            { label: 'CAT', url: '/exams/cat' },
            { label: 'CLAT', url: '/exams/clat' },
            { label: 'All Exams', url: '/exams' },
        ],
    },
    {
        label: 'Predictors & Tools',
        url: '/predictors',
        itemType: 'heading',
        children: [
            { label: 'JEE Main Predictor', url: '/predictors/jee-main-college-predictor' },
            { label: 'NEET UG Predictor', url: '/predictors/neet-ug-college-predictor' },
            { label: 'CAT Predictor', url: '/predictors/cat-college-predictor' },
            { label: 'Loan EMI Calculator', url: '/education-loans/calculator' },
            { label: 'Compare Colleges', url: '/compare-colleges' },
        ],
    },
    {
        label: 'Counselling',
        url: '/counselling',
        itemType: 'heading',
        children: [
            { label: 'Book Free Counselling', url: '/book-counselling' },
            { label: 'Career Counselling', url: '/career-counselling' },
            { label: 'College Counselling', url: '/college-counselling' },
            { label: 'Course Counselling', url: '/course-counselling' },
            { label: 'Our Counsellors', url: '/counsellors' },
        ],
    },
    {
        label: 'Loan & Finance',
        url: '/education-loans',
        itemType: 'heading',
        children: [
            { label: 'Education Loans', url: '/education-loans' },
            { label: 'Loan Eligibility', url: '/education-loans/eligibility' },
            { label: 'Compare Loans', url: '/education-loans/compare' },
            { label: 'Scholarships', url: '/scholarships' },
        ],
    },
    {
        label: 'Resources',
        url: '/resources',
        itemType: 'heading',
        children: [
            { label: 'Articles', url: '/articles' },
            { label: 'News', url: '/news' },
            { label: 'Previous Year Papers', url: '/previous-year-papers' },
            { label: 'Mock Tests', url: '/mock-tests' },
            { label: 'Webinars', url: '/webinars' },
            { label: 'E-Books', url: '/ebooks' },
        ],
    },
    {
        label: 'Company',
        url: '/about',
        itemType: 'heading',
        children: [
            { label: 'About Us', url: '/about' },
            { label: 'Contact Us', url: '/contact' },
            { label: 'Careers', url: '/careers' },
            { label: 'Editorial Policy', url: '/editorial-policy' },
            { label: 'Partner With Us', url: '/partner-with-us' },
        ],
    },
];

export const LEGAL_MENU_DRAFT: Draft[] = [
    { label: 'Privacy Policy', url: '/privacy-policy' },
    { label: 'Terms of Use', url: '/terms-of-use' },
    { label: 'Refund Policy', url: '/refund-policy' },
    { label: 'Disclaimer', url: '/disclaimer' },
    { label: 'Sitemap', url: '/sitemap.xml' },
];

export const UTILITY_MENU_DRAFT: Draft[] = [
    { label: 'Download App', url: '/app', icon: 'Smartphone' },
    { label: 'Android', url: 'https://play.google.com', icon: 'Play', openInNewTab: true },
    { label: 'iOS', url: 'https://www.apple.com/app-store/', icon: 'Apple', openInNewTab: true },
];

export const FALLBACK_MENUS: Record<string, NavNode[]> = {
    header: HEADER_MENU_DRAFT.map((d) => node(d, 'header')),
    footer: FOOTER_MENU_DRAFT.map((d) => node(d, 'footer')),
    legal: LEGAL_MENU_DRAFT.map((d) => node(d, 'legal')),
    utility: UTILITY_MENU_DRAFT.map((d) => node(d, 'utility')),
    mobile: HEADER_MENU_DRAFT.map((d) => node(d, 'mobile')),
};

export type NavigationDraft = Draft;
