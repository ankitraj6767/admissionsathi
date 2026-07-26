import 'server-only';

/**
 * Minimal, dependency-free PDF writer for tabular reports.
 *
 * Why hand-rolled instead of a library: the only server-side PDF we produce is a
 * text table (college comparison, loan amortisation). A headless-browser or
 * full PDF toolkit would add tens of megabytes to a serverless bundle and a cold
 * start we cannot afford for a download endpoint. This emits a valid PDF 1.4
 * document using the base-14 Helvetica fonts, which every reader ships, so no
 * font embedding is needed.
 *
 * Scope and limits, stated plainly:
 * - WinAnsi (Latin-1) text only. Characters outside it (₹, —, ’) are transliterated.
 * - No images, vector art or selectable table semantics.
 * - Column widths are fixed by the caller; overflowing text is clipped.
 */

/** Rows are pre-formatted strings: this writer does no number formatting. */
export interface PdfTableSection {
    heading?: string;
    rows: string[][];
}

export interface PdfDocumentInput {
    title: string;
    subtitle?: string;
    /** Column header cells. Length must match every row's length. */
    columns: string[];
    /** Relative column widths; normalised internally. */
    columnWidths?: number[];
    sections: PdfTableSection[];
    /** Small print rendered at the bottom of every page. */
    footerNote?: string;
    /** Longer disclaimer block rendered after the last table. */
    disclaimer?: string;
}

/* --------------------------- text encoding --------------------------- */

/**
 * Replaces characters the base-14 WinAnsi encoding cannot show.
 * Doing this up front keeps the output readable instead of emitting the
 * "missing glyph" box that readers substitute.
 */
const TRANSLITERATIONS: [RegExp, string][] = [
    [/₹/g, 'Rs.'],
    [/[—–]/g, '-'],
    [/[’‘]/g, "'"],
    [/[“”]/g, '"'],
    [/…/g, '...'],
    [/★/g, '*'],
    [/•/g, '-'],
    [/\u00a0/g, ' '],
];

function toWinAnsi(input: string): string {
    let out = input;
    for (const [pattern, replacement] of TRANSLITERATIONS) out = out.replace(pattern, replacement);
    // Drop anything still outside Latin-1; a dropped glyph beats a corrupt stream.
    return out.replace(/[^\x20-\x7e\xa0-\xff]/g, '');
}

/** Escapes the three characters that terminate or nest a PDF string literal. */
function escapePdfString(input: string): string {
    return toWinAnsi(input).replace(/([\\()])/g, '\\$1');
}

/* --------------------------- text metrics --------------------------- */

/**
 * Helvetica advance widths (units of 1/1000 em) for the printable ASCII range.
 * Real metrics rather than a monospace guess, so columns actually line up.
 */
const HELVETICA_WIDTHS: Record<string, number> = {
    ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191,
    '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
    '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
    '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556,
    '@': 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
    I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778,
    R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
    '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
    a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
    j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333,
    s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
    '{': 334, '|': 260, '}': 334, '~': 584,
};

const DEFAULT_WIDTH = 556;

function textWidth(text: string, fontSize: number): number {
    let units = 0;
    for (const char of text) units += HELVETICA_WIDTHS[char] ?? DEFAULT_WIDTH;
    return (units * fontSize) / 1000;
}

/** Truncates with an ellipsis so a long value never bleeds into the next column. */
function fitText(text: string, maxWidth: number, fontSize: number): string {
    const clean = toWinAnsi(text);
    if (textWidth(clean, fontSize) <= maxWidth) return clean;

    let result = '';
    for (const char of clean) {
        if (textWidth(`${result}${char}...`, fontSize) > maxWidth) break;
        result += char;
    }
    return `${result.trimEnd()}...`;
}

/** Greedy word wrap used for the disclaimer paragraph. */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (textWidth(candidate, fontSize) <= maxWidth) {
            line = candidate;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

/* ------------------------------ layout ------------------------------ */

// A4 portrait in PostScript points.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FONT_REGULAR = '/F1';
const FONT_BOLD = '/F2';

const SIZE_TITLE = 17;
const SIZE_SUBTITLE = 9.5;
const SIZE_HEADING = 10.5;
const SIZE_BODY = 8.5;
const SIZE_SMALL = 7.5;

const ROW_HEIGHT = 16;
const HEADER_ROW_HEIGHT = 19;

/** Navy #073174 and the neutral greys, as PDF 0–1 RGB triples. */
const NAVY = '0.027 0.192 0.455';
const INK = '0.071 0.129 0.239';
const INK_SOFT = '0.400 0.439 0.522';
const LINE = '0.898 0.918 0.949';
const BAND = '0.961 0.972 0.988';

class PageBuilder {
    private readonly ops: string[] = [];
    /** Distance from the page top to the next drawing baseline. */
    private cursor = MARGIN;

    get remaining(): number {
        return PAGE_HEIGHT - MARGIN - this.cursor;
    }

    private y(offset = 0): number {
        return PAGE_HEIGHT - this.cursor - offset;
    }

    advance(amount: number): void {
        this.cursor += amount;
    }

    text(value: string, x: number, options: { size?: number; bold?: boolean; color?: string } = {}): void {
        const size = options.size ?? SIZE_BODY;
        this.ops.push(
            'BT',
            `${options.color ?? INK} rg`,
            `${options.bold ? FONT_BOLD : FONT_REGULAR} ${size} Tf`,
            `1 0 0 1 ${x.toFixed(2)} ${this.y(size).toFixed(2)} Tm`,
            `(${escapePdfString(value)}) Tj`,
            'ET',
        );
    }

    rect(x: number, width: number, height: number, color: string): void {
        this.ops.push(
            `${color} rg`,
            `${x.toFixed(2)} ${(this.y(height)).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`,
            'f',
        );
    }

    hairline(offset: number): void {
        this.ops.push(
            `${LINE} RG`,
            '0.5 w',
            `${MARGIN} ${this.y(offset).toFixed(2)} m`,
            `${(PAGE_WIDTH - MARGIN).toFixed(2)} ${this.y(offset).toFixed(2)} l`,
            'S',
        );
    }

    /** Absolute-positioned footer, independent of the cursor. */
    footer(note: string, pageLabel: string): void {
        const y = MARGIN * 0.55;
        this.ops.push(
            `${LINE} RG`,
            '0.5 w',
            `${MARGIN} ${(MARGIN * 0.95).toFixed(2)} m`,
            `${(PAGE_WIDTH - MARGIN).toFixed(2)} ${(MARGIN * 0.95).toFixed(2)} l`,
            'S',
            'BT',
            `${INK_SOFT} rg`,
            `${FONT_REGULAR} ${SIZE_SMALL} Tf`,
            `1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm`,
            `(${escapePdfString(fitText(note, CONTENT_WIDTH - 70, SIZE_SMALL))}) Tj`,
            'ET',
            'BT',
            `${INK_SOFT} rg`,
            `${FONT_REGULAR} ${SIZE_SMALL} Tf`,
            `1 0 0 1 ${(PAGE_WIDTH - MARGIN - textWidth(pageLabel, SIZE_SMALL)).toFixed(2)} ${y.toFixed(2)} Tm`,
            `(${escapePdfString(pageLabel)}) Tj`,
            'ET',
        );
    }

    build(): string {
        return this.ops.join('\n');
    }
}

/* ---------------------------- document ---------------------------- */

function resolveColumnWidths(columns: string[], weights?: number[]): number[] {
    const raw = weights?.length === columns.length ? weights : columns.map((_, i) => (i === 0 ? 1.6 : 1));
    const total = raw.reduce((sum, value) => sum + value, 0);
    return raw.map((value) => (value / total) * CONTENT_WIDTH);
}

/**
 * Renders the document body across as many pages as needed.
 * Table headers repeat on every page so a two-page comparison stays readable.
 */
function renderPages(input: PdfDocumentInput): PageBuilder[] {
    const widths = resolveColumnWidths(input.columns, input.columnWidths);
    const offsets = widths.reduce<number[]>((acc, width, index) => {
        acc.push(index === 0 ? MARGIN : acc[index - 1]! + widths[index - 1]!);
        return acc;
    }, []);

    const pages: PageBuilder[] = [];
    let page = new PageBuilder();
    pages.push(page);

    const drawColumnHeader = () => {
        page.rect(MARGIN, CONTENT_WIDTH, HEADER_ROW_HEIGHT, NAVY);
        input.columns.forEach((column, index) => {
            page.text(fitText(column, widths[index]! - 10, SIZE_BODY), offsets[index]! + 5, {
                size: SIZE_BODY,
                bold: true,
                color: '1 1 1',
            });
        });
        page.advance(HEADER_ROW_HEIGHT);
    };

    const newPage = () => {
        page = new PageBuilder();
        pages.push(page);
        drawColumnHeader();
    };

    // Title block (first page only).
    page.text(input.title, MARGIN, { size: SIZE_TITLE, bold: true, color: NAVY });
    page.advance(SIZE_TITLE + 6);
    if (input.subtitle) {
        page.text(fitText(input.subtitle, CONTENT_WIDTH, SIZE_SUBTITLE), MARGIN, {
            size: SIZE_SUBTITLE,
            color: INK_SOFT,
        });
        page.advance(SIZE_SUBTITLE + 6);
    }
    page.hairline(0);
    page.advance(12);
    drawColumnHeader();

    let bandToggle = false;

    for (const section of input.sections) {
        if (section.heading) {
            if (page.remaining < ROW_HEIGHT * 3) newPage();
            page.advance(6);
            page.text(section.heading.toUpperCase(), MARGIN, {
                size: SIZE_HEADING - 2,
                bold: true,
                color: NAVY,
            });
            page.advance(SIZE_HEADING + 2);
            bandToggle = false;
        }

        for (const row of section.rows) {
            if (page.remaining < ROW_HEIGHT + 4) newPage();

            if (bandToggle) page.rect(MARGIN, CONTENT_WIDTH, ROW_HEIGHT, BAND);
            bandToggle = !bandToggle;

            row.slice(0, input.columns.length).forEach((cell, index) => {
                page.text(fitText(cell ?? '', widths[index]! - 10, SIZE_BODY), offsets[index]! + 5, {
                    size: SIZE_BODY,
                    bold: index === 0,
                    color: index === 0 ? INK : INK,
                });
            });

            page.advance(ROW_HEIGHT);
            page.hairline(0);
        }
    }

    if (input.disclaimer) {
        const lines = wrapText(input.disclaimer, CONTENT_WIDTH - 12, SIZE_SMALL);
        const blockHeight = lines.length * (SIZE_SMALL + 3) + 16;
        if (page.remaining < blockHeight + 10) newPage();

        page.advance(12);
        page.rect(MARGIN, CONTENT_WIDTH, blockHeight, BAND);
        page.advance(8);
        for (const line of lines) {
            page.text(line, MARGIN + 6, { size: SIZE_SMALL, color: INK_SOFT });
            page.advance(SIZE_SMALL + 3);
        }
    }

    const note = input.footerNote ?? '';
    pages.forEach((builtPage, index) => {
        builtPage.footer(note, `Page ${index + 1} of ${pages.length}`);
    });

    return pages;
}

/**
 * Assembles the PDF file.
 *
 * Object layout: 1 = Catalog, 2 = Pages, 3 = Helvetica, 4 = Helvetica-Bold,
 * then one Page + one content Stream per page. The xref table is byte-offset
 * based, so offsets are measured on the Latin-1 buffer, not the JS string.
 */
export function renderTablePdf(input: PdfDocumentInput): Uint8Array {
    const pages = renderPages(input);
    const pageCount = pages.length;

    const objects: string[] = [];

    const pageObjectId = (index: number) => 5 + index * 2;
    const contentObjectId = (index: number) => 6 + index * 2;

    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push(
        `<< /Type /Pages /Count ${pageCount} /Kids [${pages
            .map((_, index) => `${pageObjectId(index)} 0 R`)
            .join(' ')}] >>`,
    );
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    pages.forEach((page, index) => {
        const content = page.build();
        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] ` +
            `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId(index)} 0 R >>`,
        );
        objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    });

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];

    objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(pdf, 'latin1'));
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf +=
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ` +
        `/Info << /Title (${escapePdfString(input.title)}) /Producer (Admission Sathi) >> >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`;

    return new Uint8Array(Buffer.from(pdf, 'latin1'));
}
