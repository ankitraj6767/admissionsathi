import { COURSE_LEVELS, EXAM_CATEGORIES } from './constants';
import { slugify } from '@/lib/utils';

/**
 * Slug ⇄ label maps for enum-backed SEO landing pages.
 *
 * `/courses/level/[slug]` and `/exams/category/[slug]` group records by a stored
 * enum value rather than by a referenced document, so there is no slug column in
 * the database to look up. Deriving the slug from the enum keeps the two in sync:
 * adding a level or category in `constants.ts` publishes its landing page, and
 * the sitemap picks it up from the same source.
 *
 * Each entry carries editorial copy so the page has a genuine intro rather than a
 * templated sentence — thin, duplicated landing pages are worse than none.
 */
export interface TaxonomyLanding {
    /** Stored enum value, e.g. `Undergraduate`. */
    value: string;
    /** URL segment, e.g. `undergraduate`. */
    slug: string;
    /** Page H1 fragment. */
    label: string;
    /** Intro paragraph. */
    description: string;
}

const COURSE_LEVEL_COPY: Record<string, string> = {
    Certificate:
        'Short, skill-first programmes that run from a few weeks to a year. Useful for adding a specific competency without committing to a full degree.',
    Diploma:
        'One- to three-year programmes with a strong practical bias. Polytechnic diplomas also open lateral entry into the second year of a B.E./B.Tech.',
    Undergraduate:
        'Bachelor-level degrees taken after Class 12. This is where most entrance exams apply, and where fees, ranking and placement records matter most.',
    Postgraduate:
        'Master-level degrees taken after a bachelor. Admission usually runs through a national or university entrance exam plus an interview round.',
    Doctorate:
        'Research degrees with coursework, a qualifying exam and a thesis. Admission depends on your research proposal and the supervisor available.',
    Integrated:
        'Dual-degree programmes that combine a bachelor and a master in one admission, typically five years, with a single fee structure.',
};

const EXAM_CATEGORY_COPY: Record<string, string> = {
    Engineering:
        'Entrance exams for B.E./B.Tech, M.Tech and allied engineering programmes, including national and state-level tests.',
    Medical:
        'Entrance exams for MBBS, BDS, AYUSH, and postgraduate medical seats, along with the counselling rounds that follow.',
    Management:
        'Entrance exams for MBA, PGDM and BBA admissions, with sectional patterns, percentile scoring and interview stages.',
    Law: 'Entrance exams for integrated LL.B. and LL.M. programmes at national law universities and state institutions.',
    Design:
        'Aptitude-led entrance exams for design and architecture programmes, usually combining a written test with a studio or portfolio round.',
    Pharmacy: 'Entrance exams for B.Pharm, D.Pharm and M.Pharm admissions across state and university systems.',
    Nursing: 'Entrance exams for B.Sc Nursing, GNM and post-basic nursing programmes, including state nursing councils.',
    Agriculture:
        'Entrance exams for agriculture, horticulture, veterinary and allied science programmes at agricultural universities.',
    'Arts & Humanities':
        'Entrance exams for humanities, social science and language programmes at central and state universities.',
    Commerce: 'Entrance exams for B.Com, M.Com and professional accounting-track programmes.',
    'Computer Applications': 'Entrance exams for BCA, MCA and computer application programmes.',
    'University Entrance':
        'Common university entrance tests that feed multiple streams through a single application and score.',
};

function buildLandings(values: readonly string[], copy: Record<string, string>): TaxonomyLanding[] {
    return values.map((value) => ({
        value,
        slug: slugify(value),
        label: value,
        description: copy[value] ?? `Programmes and admissions grouped under ${value}.`,
    }));
}

export const COURSE_LEVEL_LANDINGS: TaxonomyLanding[] = buildLandings(COURSE_LEVELS, COURSE_LEVEL_COPY);
export const EXAM_CATEGORY_LANDINGS: TaxonomyLanding[] = buildLandings(EXAM_CATEGORIES, EXAM_CATEGORY_COPY);

export function findCourseLevelLanding(slug: string): TaxonomyLanding | undefined {
    return COURSE_LEVEL_LANDINGS.find((entry) => entry.slug === slug);
}

export function findExamCategoryLanding(slug: string): TaxonomyLanding | undefined {
    return EXAM_CATEGORY_LANDINGS.find((entry) => entry.slug === slug);
}
