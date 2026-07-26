import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { siteConfig } from '@/config/site';
import { calculateEmi } from '@/lib/finance/emi';
import { renderTablePdf, type PdfTableSection } from '@/lib/pdf/table-pdf';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Downloadable EMI + amortisation summary.
 *
 * A Route Handler because the response is a binary file. The schedule is
 * recomputed here from the raw inputs rather than accepted from the client, so
 * the document can never contain figures we did not calculate.
 */
export const dynamic = 'force-dynamic';

/** Bounds mirror `calculatorSchema` in src/actions/finance.actions.ts. */
const querySchema = z.object({
    amount: z.coerce.number().min(10_000).max(50_000_000),
    rate: z.coerce.number().min(1).max(30),
    tenure: z.coerce.number().int().min(6).max(360),
    moratorium: z.coerce.number().int().min(0).max(120).default(0),
    fee: z.coerce.number().min(0).max(10).default(0),
    capitalise: z
        .enum(['0', '1', 'true', 'false'])
        .default('1')
        .transform((value) => value === '1' || value === 'true'),
});

/** Amortisation rows are grouped by year so a 120-month schedule stays scannable. */
function scheduleSections(schedule: ReturnType<typeof calculateEmi>['schedule']): PdfTableSection[] {
    const sections: PdfTableSection[] = [];

    for (const row of schedule) {
        const year = Math.ceil(row.month / 12);
        const heading = `Repayment year ${year}`;
        const cells = [
            `Month ${row.month}`,
            formatCurrency(row.openingBalance),
            formatCurrency(row.emi),
            formatCurrency(row.interest),
            formatCurrency(row.principal),
            formatCurrency(row.closingBalance),
        ];

        const existing = sections.find((section) => section.heading === heading);
        if (existing) existing.rows.push(cells);
        else sections.push({ heading, rows: [cells] });
    }

    return sections;
}

export async function GET(request: NextRequest) {
    const limited = await rateLimit({ key: 'loan:pdf', limit: 10, windowSeconds: 300 });
    if (!limited.success) {
        return NextResponse.json(
            { error: 'Too many downloads. Please try again in a few minutes.' },
            { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
        );
    }

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Check the loan amount, interest rate and tenure and try again.' },
            { status: 400 },
        );
    }

    try {
        const { amount, rate, tenure, moratorium, fee, capitalise } = parsed.data;

        const result = calculateEmi({
            loanAmount: amount,
            annualRatePercent: rate,
            tenureMonths: tenure,
            moratoriumMonths: moratorium,
            processingFeePercent: fee,
            capitaliseMoratoriumInterest: capitalise,
        });

        const summary: PdfTableSection = {
            heading: 'Loan summary',
            rows: [
                ['Loan amount', formatCurrency(amount), '', '', '', ''],
                ['Interest rate (annual)', `${rate}%`, '', '', '', ''],
                ['Repayment tenure', `${tenure} months`, '', '', '', ''],
                ['Moratorium', `${moratorium} months`, '', '', '', ''],
                [
                    'Interest during moratorium',
                    formatCurrency(result.moratoriumInterest),
                    capitalise ? 'Added to principal' : 'Paid separately',
                    '',
                    '',
                    '',
                ],
                ['Principal repaid', formatCurrency(result.principal), '', '', '', ''],
                ['Monthly EMI', formatCurrency(result.emi), '', '', '', ''],
                ['Total interest', formatCurrency(result.totalInterest), '', '', '', ''],
                ['Processing fee', formatCurrency(result.processingFee), `${fee}%`, '', '', ''],
                ['Total repayment', formatCurrency(result.totalRepayment), '', '', '', ''],
                ['Total cost of loan', formatCurrency(result.totalCost), '', '', '', ''],
                ['Total commitment', `${result.effectiveTenureMonths} months`, '', '', '', ''],
            ],
        };

        const pdf = renderTablePdf({
            title: 'Education Loan Summary',
            subtitle: `${formatCurrency(amount)} at ${rate}% over ${tenure} months   |   Generated ${formatDate(new Date())}`,
            columns: ['Period', 'Opening balance', 'EMI', 'Interest', 'Principal', 'Closing balance'],
            columnWidths: [1.2, 1.15, 1, 1, 1, 1.15],
            sections: [summary, ...scheduleSections(result.schedule)],
            footerNote: `${siteConfig.name} — ${siteConfig.tagline} · ${siteConfig.url}`,
            disclaimer:
                'This is an indicative calculation, not a loan offer. Actual EMI, interest rate, processing fee and moratorium treatment are set by the lender at sanction and may differ. Confirm the final schedule with your lender before committing.',
        });

        return new NextResponse(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="admission-sathi-loan-summary-${amount}-${rate}-${tenure}.pdf"`,
                'Content-Length': String(pdf.byteLength),
                'Cache-Control': 'private, max-age=0, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        logger.error('loan.summary_pdf_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Could not generate the summary.' }, { status: 500 });
    }
}
