import type { BreadcrumbItem } from '@/types/common';

export type PageBannerContext = {
    title: string;
    description?: string;
    eyebrow?: string;
    breadcrumbs?: BreadcrumbItem[];
};

const BANNER_IMAGES = {
    campus: '/brand/page-banners/campus.webp',
    courses: '/brand/page-banners/courses.webp',
    exams: '/brand/page-banners/exams.webp',
    counselling: '/brand/page-banners/counselling.webp',
    finance: '/brand/page-banners/finance.webp',
    scholarships: '/brand/page-banners/scholarships.webp',
    editorial: '/brand/page-banners/editorial.webp',
    tools: '/brand/page-banners/tools.webp',
} as const;

type BannerTheme = keyof typeof BANNER_IMAGES;

const BANNER_OBJECT_POSITION = {
    campus: 'object-[72%_32%] md:object-[center_28%]',
    courses: 'object-[72%_18%] md:object-[center_16%]',
    exams: 'object-[72%_16%] md:object-[center_12%]',
    counselling: 'object-[72%_16%] md:object-[center_12%]',
    finance: 'object-[72%_18%] md:object-[center_18%]',
    scholarships: 'object-[72%_20%] md:object-[center_18%]',
    editorial: 'object-[72%_14%] md:object-[center_12%]',
    tools: 'object-[72%_16%] md:object-[center_14%]',
} satisfies Record<BannerTheme, string>;

const ROUTE_THEMES: { prefix: string; theme: BannerTheme }[] = [
    { prefix: '/scholarships', theme: 'scholarships' },
    { prefix: '/education-loans', theme: 'finance' },
    { prefix: '/counselling', theme: 'counselling' },
    { prefix: '/counsellors', theme: 'counselling' },
    { prefix: '/book-counselling', theme: 'counselling' },
    { prefix: '/contact', theme: 'counselling' },
    { prefix: '/exams', theme: 'exams' },
    { prefix: '/predictors', theme: 'tools' },
    { prefix: '/ai-assistant', theme: 'tools' },
    { prefix: '/articles', theme: 'editorial' },
    { prefix: '/news', theme: 'editorial' },
    { prefix: '/faqs', theme: 'editorial' },
    { prefix: '/courses', theme: 'courses' },
    { prefix: '/colleges/course', theme: 'courses' },
    { prefix: '/colleges/exam', theme: 'exams' },
];

/** Pick a compact, locally hosted photo and a crop that suits the subject. */
export function resolvePageBannerVisual({ title, description, eyebrow, breadcrumbs }: PageBannerContext) {
    const hrefs = breadcrumbs?.map(({ href }) => href?.split(/[?#]/, 1)[0] ?? '').filter(Boolean) ?? [];
    const routeTheme = ROUTE_THEMES.find(({ prefix }) => hrefs.some((href) => href === prefix || href.startsWith(`${prefix}/`)))?.theme;

    const pageLabels = [title, eyebrow, ...(breadcrumbs?.map(({ label }) => label) ?? [])].join(' ').toLowerCase();
    const copy = `${pageLabels} ${description ?? ''}`.toLowerCase();

    const theme = routeTheme
        ?? (/scholarship|fellowship|grant|financial aid/.test(copy) ? 'scholarships' : undefined)
        ?? (/education loan|\bloan\b|\blender\b|\bemi\b|collateral|moratorium/.test(copy) ? 'finance' : undefined)
        ?? (/\bexams?\b|entrance test|admit card|syllabus|cut.?off|result date/.test(pageLabels) ? 'exams' : undefined)
        ?? (/counsell|counsel|advisor|guidance|book.{0,20}session|contact/.test(copy) ? 'counselling' : undefined)
        ?? (/predictor|prediction|probability|\bai\b|artificial intelligence|dashboard|eligibility calculator/.test(copy) ? 'tools' : undefined)
        ?? (/article|\bnews\b|\bguide\b|resource|\bfaq\b|live update/.test(copy) ? 'editorial' : undefined)
        ?? (/\bcourses?\b|programme|program|degree|career path|classroom/.test(pageLabels) ? 'courses' : undefined)
        ?? 'campus';

    return { src: BANNER_IMAGES[theme], objectPosition: BANNER_OBJECT_POSITION[theme] };
}
