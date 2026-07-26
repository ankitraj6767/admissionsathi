import { NextResponse, type NextRequest } from 'next/server';
import { getCollegesBySlugs, listFeaturedColleges } from '@/db/repositories/college.repository';
import type { CollegeDoc } from '@/db/models/college.model';

export const runtime = 'nodejs';

export interface MiniCollege {
    id: string;
    slug: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    location: string;
    ownership: string;
    rating: number;
    ratingCount: number;
    annualFee?: number;
    nirfRank?: number;
    accreditation?: string;
}

function toMini(college: CollegeDoc): MiniCollege {
    return {
        id: String(college._id),
        slug: college.slug,
        name: college.name,
        shortName: college.shortName,
        logoUrl: college.logo?.url,
        location: [college.cityName, college.stateName].filter(Boolean).join(', '),
        ownership: college.ownership,
        rating: college.rating?.overall ?? 0,
        ratingCount: college.rating?.count ?? 0,
        annualFee: college.feeRange?.min,
        nirfRank: college.ranking?.nirfOverall,
        accreditation: college.accreditation?.[0],
    };
}

/**
 * Hydrates the comparison widget from slugs stored in localStorage, and returns
 * featured suggestions when no slugs are supplied.
 */
export async function GET(request: NextRequest) {
    const slugsParam = request.nextUrl.searchParams.get('slugs');
    const slugs = (slugsParam ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);

    const colleges = slugs.length ? await getCollegesBySlugs(slugs) : await listFeaturedColleges(3);

    const ordered = slugs.length
        ? slugs
            .map((slug) => colleges.find((c) => c.slug === slug))
            .filter((c): c is CollegeDoc => Boolean(c))
        : colleges;

    return NextResponse.json(
        { colleges: ordered.map(toMini) },
        { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    );
}
