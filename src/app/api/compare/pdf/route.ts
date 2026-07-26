import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_DATA_NOTICE } from '@/config/constants';
import { siteConfig } from '@/config/site';
import { renderTablePdf, type PdfTableSection } from '@/lib/pdf/table-pdf';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { formatDate } from '@/lib/utils';
import {
    buildComparison,
    formatComparisonValue,
    getComparisonByShareId,
} from '@/services/comparison.service';

/**
 * Server-side PDF export of a college comparison.
 *
 * A Route Handler rather than a Server Action because the response is a binary
 * file download, which an action cannot return. Slugs arrive either directly
 * (`?slugs=a,b,c`) or via a saved comparison (`?share=abc12345`).
 *
 * Everything is re-derived on the server from the slugs, so a caller cannot
 * inject fabricated fees or rankings into a document that carries our branding.
 */
export const dynamic = 'force-dynamic';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,139}$/;

function parseSlugs(raw: string | null): string[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map((slug) => slug.trim().toLowerCase())
        .filter((slug) => SLUG_PATTERN.test(slug))
        .slice(0, siteConfig.compare.maxColleges);
}

/** Turns the flat comparison matrix into one PDF section per attribute group. */
function toSections(rows: Awaited<ReturnType<typeof buildComparison>>['rows']): PdfTableSection[] {
    const sections: PdfTableSection[] = [];

    for (const row of rows) {
        const cells = [row.label, ...row.values.map((value) => formatComparisonValue(row.label, value))];
        const existing = sections.find((section) => section.heading === row.group);
        if (existing) existing.rows.push(cells);
        else sections.push({ heading: row.group, rows: [cells] });
    }

    return sections;
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);

    // Rendering is cheap but not free, and the endpoint is public.
    const limited = await rateLimit({ key: 'compare:pdf', limit: 10, windowSeconds: 300 });
    if (!limited.success) {
        return NextResponse.json(
            { error: 'Too many exports. Please try again in a few minutes.' },
            { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
        );
    }

    try {
        let slugs = parseSlugs(url.searchParams.get('slugs'));

        const shareId = url.searchParams.get('share');
        if (slugs.length === 0 && shareId) {
            const saved = await getComparisonByShareId(shareId.slice(0, 32));
            slugs = parseSlugs((saved?.collegeSlugs ?? []).join(','));
        }

        if (slugs.length === 0) {
            return NextResponse.json(
                { error: 'Add at least one college to export a comparison.' },
                { status: 400 },
            );
        }

        const comparison = await buildComparison(slugs);
        if (comparison.colleges.length === 0) {
            return NextResponse.json({ error: 'No published colleges matched.' }, { status: 404 });
        }

        const pdf = renderTablePdf({
            title: 'College Comparison',
            subtitle: `${comparison.colleges.map((college) => college.name).join('  ·  ')}   |   Generated ${formatDate(new Date())}`,
            columns: ['Parameter', ...comparison.colleges.map((college) => college.shortName || college.name)],
            columnWidths: [1.7, ...comparison.colleges.map(() => 1)],
            sections: toSections(comparison.rows),
            footerNote: `${siteConfig.name} — ${siteConfig.tagline} · ${siteConfig.url}`,
            disclaimer:
                'Figures are compiled from public sources and change every admission season. Verify fees, seats, cut-offs and placement data with the institute or the official counselling authority before acting on this comparison. ' +
                DEMO_DATA_NOTICE,
        });

        const fileName = `admission-sathi-comparison-${comparison.colleges
            .map((college) => college.slug)
            .join('-')
            .slice(0, 80)}.pdf`;

        return new NextResponse(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(pdf.byteLength),
                'Cache-Control': 'private, max-age=0, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        logger.error('compare.pdf_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
    }
}
