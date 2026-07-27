import 'server-only';
import type { CollegeDoc } from '@/db/models/college.model';
import {
    countActiveCollegeCourses,
    getCollegesBySlugs,
    incrementCollegeCompareCounts,
    listCollegeIdsBySlugs,
} from '@/db/repositories/college.repository';
import {
    findComparisonByShareId,
    incrementComparisonViews,
    upsertComparison,
} from '@/db/repositories/system.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { siteConfig } from '@/config/site';
import { formatCompactINR } from '@/lib/utils';

export interface ComparisonRow {
    label: string;
    group: string;
    values: (string | number | null)[];
    /** true = higher is better, false = lower is better, undefined = not comparable */
    higherIsBetter?: boolean;
}

export interface ComparisonPayload {
    colleges: {
        id: string;
        name: string;
        shortName?: string;
        slug: string;
        logoUrl?: string;
        location: string;
    }[];
    rows: ComparisonRow[];
    shareUrl?: string;
}

const nz = (value?: number | null) => (value === undefined || value === null ? null : value);

/** Builds the full comparison matrix for up to four colleges. */
export async function buildComparison(slugs: string[]): Promise<ComparisonPayload> {
    const limited = slugs.slice(0, siteConfig.compare.maxColleges);
    const colleges = await getCollegesBySlugs(limited);

    // preserve the requested order
    const ordered = limited
        .map((slug) => colleges.find((c) => c.slug === slug))
        .filter((c): c is CollegeDoc => Boolean(c));

    if (ordered.length === 0) {
        return { colleges: [], rows: [] };
    }

    const courseCounts = await Promise.all(
        ordered.map((college) => countActiveCollegeCourses(college._id, 200)),
    );

    const rows: ComparisonRow[] = [
        {
            group: 'Basics',
            label: 'Location',
            values: ordered.map((c) => [c.cityName, c.stateName].filter(Boolean).join(', ')),
        },
        { group: 'Basics', label: 'Ownership', values: ordered.map((c) => c.ownership) },
        { group: 'Basics', label: 'Established', values: ordered.map((c) => nz(c.establishedYear)) },
        { group: 'Basics', label: 'Affiliation', values: ordered.map((c) => c.affiliatedTo ?? '—') },
        {
            group: 'Basics',
            label: 'Approvals',
            values: ordered.map((c) => c.approvals?.join(', ') || '—'),
        },
        {
            group: 'Basics',
            label: 'Accreditation',
            values: ordered.map((c) => c.accreditation?.join(', ') || '—'),
        },
        {
            group: 'Ranking & rating',
            label: 'NIRF overall rank',
            values: ordered.map((c) => nz(c.ranking?.nirfOverall)),
            higherIsBetter: false,
        },
        {
            group: 'Ranking & rating',
            label: 'NIRF category rank',
            values: ordered.map((c) => nz(c.ranking?.nirfCategory)),
            higherIsBetter: false,
        },
        {
            group: 'Ranking & rating',
            label: 'Student rating',
            values: ordered.map((c) => nz(c.rating?.overall)),
            higherIsBetter: true,
        },
        {
            group: 'Ranking & rating',
            label: 'Reviews',
            values: ordered.map((c) => nz(c.rating?.count)),
            higherIsBetter: true,
        },
        {
            group: 'Fees',
            label: 'Annual fee (from)',
            values: ordered.map((c) => nz(c.feeRange?.min)),
            higherIsBetter: false,
        },
        {
            group: 'Fees',
            label: 'Annual fee (up to)',
            values: ordered.map((c) => nz(c.feeRange?.max)),
            higherIsBetter: false,
        },
        {
            group: 'Fees',
            label: 'Hostel fee (from)',
            values: ordered.map((c) => nz(c.hostelFeeRange?.min)),
            higherIsBetter: false,
        },
        {
            group: 'Placements',
            label: 'Highest package',
            values: ordered.map((c) => nz(c.placement?.highestPackage)),
            higherIsBetter: true,
        },
        {
            group: 'Placements',
            label: 'Average package',
            values: ordered.map((c) => nz(c.placement?.averagePackage)),
            higherIsBetter: true,
        },
        {
            group: 'Placements',
            label: 'Median package',
            values: ordered.map((c) => nz(c.placement?.medianPackage)),
            higherIsBetter: true,
        },
        {
            group: 'Placements',
            label: 'Placement rate (%)',
            values: ordered.map((c) => nz(c.placement?.placementPercentage)),
            higherIsBetter: true,
        },
        {
            group: 'Placements',
            label: 'Top recruiters',
            values: ordered.map((c) => c.placement?.topRecruiters?.slice(0, 4).join(', ') || '—'),
        },
        {
            group: 'Academics',
            label: 'Programmes offered',
            values: courseCounts.map((count) => count),
            higherIsBetter: true,
        },
        {
            group: 'Academics',
            label: 'Faculty–student ratio',
            values: ordered.map((c) => c.facultyStudentRatio ?? '—'),
        },
        {
            group: 'Academics',
            label: 'Total students',
            values: ordered.map((c) => nz(c.totalStudents)),
        },
        {
            group: 'Campus',
            label: 'Campus size (acres)',
            values: ordered.map((c) => nz(c.campusSizeAcres)),
            higherIsBetter: true,
        },
        {
            group: 'Campus',
            label: 'Hostel',
            values: ordered.map((c) => (c.hostelAvailable ? 'Available' : 'Not available')),
        },
        {
            group: 'Campus',
            label: 'Facilities',
            values: ordered.map((c) => c.facilities?.slice(0, 5).join(', ') || '—'),
        },
    ];

    return {
        colleges: ordered.map((college) => ({
            id: String(college._id),
            name: college.name,
            shortName: college.shortName,
            slug: college.slug,
            logoUrl: college.logo?.url,
            location: [college.cityName, college.stateName].filter(Boolean).join(', '),
        })),
        rows: toPlain(rows),
    };
}

/** Formats a comparison value for display. */
export function formatComparisonValue(label: string, value: string | number | null): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number') {
        if (label.toLowerCase().includes('fee') || label.toLowerCase().includes('package')) {
            return formatCompactINR(value);
        }
        if (label.toLowerCase().includes('rating')) return value.toFixed(1);
        if (label.toLowerCase().includes('rank')) return `#${value}`;
        return value.toLocaleString('en-IN');
    }
    return value;
}

/** Persists a comparison so it can be shared with a short URL. */
export async function saveComparison(input: {
    slugs: string[];
    userId?: string;
    anonymousId?: string;
    title?: string;
}): Promise<string> {
    const shareId = Math.random().toString(36).slice(2, 10);
    const collegeIds = await listCollegeIdsBySlugs(input.slugs);

    await upsertComparison({
        shareId,
        user: input.userId,
        anonymousId: input.anonymousId,
        colleges: collegeIds,
        collegeSlugs: input.slugs,
        title: input.title,
    });

    await incrementCollegeCompareCounts(input.slugs);

    return shareId;
}

/** Reads a shared comparison and counts the view (the returned count includes it). */
export async function getComparisonByShareId(shareId: string) {
    await incrementComparisonViews(shareId);
    const comparison = await findComparisonByShareId(shareId);
    return comparison ? toPlain(comparison) : null;
}
