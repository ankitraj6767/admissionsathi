import { COLLEGE_TAB_SEGMENTS } from '@/config/constants';
import { EXAM_SECTION_SEGMENTS } from '@/config/exam-sections';
import { COURSE_LEVEL_LANDINGS, EXAM_CATEGORY_LANDINGS } from '@/config/taxonomy';

/**
 * Pure route resolution for the internal link-health scan.
 *
 * Kept free of database and `server-only` imports so it can be unit-tested
 * directly: given a set of published slugs, does this path map to a page the app
 * actually serves?
 */

/** Paths served by a `page.tsx` with no dynamic segment. */
export const STATIC_PATHS: ReadonlySet<string> = new Set([
    '/',
    '/colleges',
    '/colleges/state',
    '/colleges/city',
    '/colleges/course',
    '/colleges/exam',
    '/college-reviews',
    '/compare-colleges',
    '/courses',
    '/courses/category',
    '/courses/level',
    '/exams',
    '/exams/category',
    '/predictors',
    '/counselling',
    '/counselling/state',
    '/career-counselling',
    '/college-counselling',
    '/course-counselling',
    '/book-counselling',
    '/counsellors',
    '/education-loans',
    '/education-loans/eligibility',
    '/education-loans/calculator',
    '/education-loans/compare',
    '/scholarships',
    '/scholarships/course',
    '/resources',
    '/articles',
    '/news',
    '/guides',
    '/previous-year-papers',
    '/mock-tests',
    '/ebooks',
    '/webinars',
    '/faqs',
    '/ai-assistant',
    '/search',
    '/contact',
    '/login',
    '/signup',
    '/forgot-password',
    '/dashboard',
    '/dashboard/saved',
    '/dashboard/bookings',
    '/dashboard/predictions',
    '/dashboard/loans',
    '/dashboard/profile',
    '/dashboard/notifications',
    '/account',
    '/403',
]);

export type SlugSetKey =
    | 'college'
    | 'course'
    | 'courseCategory'
    | 'exam'
    | 'predictor'
    | 'article'
    | 'news'
    | 'resource'
    | 'scholarship'
    | 'loanProvider'
    | 'counsellor'
    | 'state'
    | 'city'
    | 'page';

export type SlugSets = Record<SlugSetKey, Set<string>>;

export const EMPTY_SLUG_SETS: SlugSets = {
    college: new Set(),
    course: new Set(),
    courseCategory: new Set(),
    exam: new Set(),
    predictor: new Set(),
    article: new Set(),
    news: new Set(),
    resource: new Set(),
    scholarship: new Set(),
    loanProvider: new Set(),
    counsellor: new Set(),
    state: new Set(),
    city: new Set(),
    page: new Set(),
};

const COURSE_TABS = new Set(['colleges', 'specializations', 'admission', 'syllabus', 'career', 'fees']);
const COLLEGE_TABS = new Set<string>(COLLEGE_TAB_SEGMENTS);
const EXAM_SECTIONS = new Set<string>(EXAM_SECTION_SEGMENTS);
const COURSE_LEVEL_SLUGS = new Set(COURSE_LEVEL_LANDINGS.map((entry) => entry.slug));
const EXAM_CATEGORY_SLUGS = new Set(EXAM_CATEGORY_LANDINGS.map((entry) => entry.slug));

/** Drops the query string and hash, then trims trailing slashes. */
export function normalizePath(href: string): string {
    const withoutHash = href.split('#')[0]?.split('?')[0] ?? '';
    if (withoutHash === '' || withoutHash === '/') return '/';
    return withoutHash.replace(/\/+$/, '') || '/';
}

/** Classifies an href so the scanner knows whether it can check it at all. */
export function classifyHref(href: string): 'internal' | 'external' | 'anchor' | 'relative' | 'empty' {
    const trimmed = href.trim();
    if (!trimmed) return 'empty';
    if (/^(https?:)?\/\//i.test(trimmed)) return 'external';
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return 'external';
    if (trimmed.startsWith('#')) return 'anchor';
    if (!trimmed.startsWith('/')) return 'relative';
    return 'internal';
}

/** Pulls `href` values out of stored rich text without parsing the document. */
export function extractHrefs(html?: string): string[] {
    if (!html) return [];
    return Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi), (match) => match[1]).filter(
        (href): href is string => Boolean(href),
    );
}

/** True when the path maps to a route this app serves for a live record. */
export function resolvesInternally(path: string, slugs: SlugSets): boolean {
    if (STATIC_PATHS.has(path)) return true;

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return true;

    const [first, second, third] = segments;

    if (first === 'colleges') {
        if (segments.length === 2) return slugs.college.has(second!);
        if (segments.length === 3) {
            if (second === 'state') return slugs.state.has(third!);
            if (second === 'city') return slugs.city.has(third!);
            if (second === 'course') return slugs.course.has(third!);
            if (second === 'exam') return slugs.exam.has(third!);
            return slugs.college.has(second!) && COLLEGE_TABS.has(third!);
        }
        return false;
    }

    if (first === 'courses') {
        if (segments.length === 2) return slugs.course.has(second!);
        if (segments.length === 3) {
            if (second === 'category') return slugs.courseCategory.has(third!);
            if (second === 'level') return COURSE_LEVEL_SLUGS.has(third!);
            return slugs.course.has(second!) && COURSE_TABS.has(third!);
        }
        return false;
    }

    if (first === 'exams') {
        if (segments.length === 2) return slugs.exam.has(second!);
        if (segments.length === 3) {
            if (second === 'category') return EXAM_CATEGORY_SLUGS.has(third!);
            return slugs.exam.has(second!) && EXAM_SECTIONS.has(third!);
        }
        return false;
    }

    if (first === 'scholarships') {
        if (segments.length === 2) return slugs.scholarship.has(second!);
        if (segments.length === 3 && second === 'course') return slugs.course.has(third!);
        return false;
    }

    if (first === 'counselling') {
        if (segments.length === 3 && second === 'state') return slugs.state.has(third!);
        return false;
    }

    // Single-segment paths fall through to the CMS page catch-all.
    if (segments.length === 1) return slugs.page.has(first!);
    if (segments.length !== 2) return false;

    switch (first) {
        case 'predictors':
            return slugs.predictor.has(second!);
        case 'articles':
            return slugs.article.has(second!);
        case 'news':
            return slugs.news.has(second!);
        case 'education-loans':
            return slugs.loanProvider.has(second!);
        case 'counsellors':
            return slugs.counsellor.has(second!);
        case 'guides':
        case 'previous-year-papers':
        case 'mock-tests':
        case 'ebooks':
        case 'webinars':
        case 'resources':
            return slugs.resource.has(second!);
        default:
            return false;
    }
}
