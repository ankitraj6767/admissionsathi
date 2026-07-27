/* eslint-disable no-console */
/**
 * Generates the local, per-college assets the seed points at:
 *
 *   public/brand/colleges/<slug>.svg          monogram logo
 *   public/brochures/<slug>-prospectus.pdf    one-page prospectus
 *
 * These are generated rather than hand-drawn because there are dozens of demo
 * colleges, and generated-but-distinct beats one shared placeholder: a card grid
 * with 60 identical grey logos is the main reason seeded pages look unfinished.
 *
 * Deterministic: the same college always gets the same colours, so re-running
 * produces no diff. Run with `npm run assets:colleges`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLLEGE_SEEDS } from '../src/db/seeds/data/college.data';
import { hashString, slugify } from '../src/lib/utils';

/** Run from the repo root (npm scripts always are), so cwd is the project root. */
const ROOT = process.cwd();
const LOGO_DIR = join(ROOT, 'public/brand/colleges');
const BROCHURE_DIR = join(ROOT, 'public/brochures');

/** Brand-adjacent palette: navy/orange base plus enough hues to tell logos apart. */
const PALETTE = [
    ['#0F2A4A', '#F97316'],
    ['#14324F', '#0EA5A4'],
    ['#1E293B', '#EF4444'],
    ['#0B3B2E', '#F59E0B'],
    ['#312E81', '#F472B6'],
    ['#3F2A56', '#22C55E'],
    ['#0C4A6E', '#FACC15'],
    ['#4C1D24', '#38BDF8'],
];

/** Up to three initials from the significant words of the name. */
function monogram(name: string): string {
    const skip = new Set([
        'of', 'and', '&', 'the', 'institute', 'college', 'university', 'school',
        'sciences', 'science', 'studies', 'management', 'technology',
    ]);
    const words = name.split(/[\s&]+/).filter(Boolean);
    const significant = words.filter((word) => !skip.has(word.toLowerCase()));
    const source = significant.length ? significant : words;
    return source
        .slice(0, 3)
        .map((word) => word[0]!.toUpperCase())
        .join('');
}

function logoSvg(name: string, slug: string): string {
    const [base, accent] = PALETTE[hashString(slug) % PALETTE.length]!;
    const initials = monogram(name);
    // Shrink the type as initials are added so three letters still fit the tile.
    const fontSize = initials.length >= 3 ? 34 : initials.length === 2 ? 42 : 52;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(name)} logo">
  <title>${escapeXml(name)}</title>
  <rect width="128" height="128" rx="26" fill="${base}"/>
  <path d="M0 96h128v32H0z" fill="${accent}" opacity="0.9"/>
  <path d="M64 14 108 36v6H20v-6z" fill="#FFFFFF" opacity="0.92"/>
  <text x="64" y="80" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF">${escapeXml(initials)}</text>
</svg>
`;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* --------------------------------- brochure ------------------------------ */

/**
 * PDF string literal: escape the delimiters, and fold to ASCII.
 *
 * The base-14 fonts used here are written without an /Encoding, so a byte above
 * 0x7E is not portable — an em dash or a bullet comes out as a control character
 * in some viewers. Substituting ASCII is simpler than embedding an encoding.
 */
function pdfText(value: string): string {
    return value
        .replace(/[•·]/g, '-')
        .replace(/[—–]/g, '-')
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/₹/g, 'Rs. ')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

interface Line {
    text: string;
    size: number;
    font: 'F1' | 'F2';
    gap: number;
}

/**
 * Minimal single-page PDF written by hand.
 *
 * A real PDF library would be overkill for a one-page demo prospectus, and this
 * keeps the seed free of another dependency. Offsets in the xref table are
 * computed from the actual byte lengths, so the file is valid rather than merely
 * viewer-tolerated.
 */
function prospectusPdf(lines: Line[], title: string): Buffer {
    let y = 780;
    const content = lines
        .map((line) => {
            y -= line.gap;
            return `BT /${line.font} ${line.size} Tf 56 ${y} Td (${pdfText(line.text)}) Tj ET`;
        })
        .join('\n');

    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        `<< /Title (${pdfText(title)}) /Producer (Admission Sathi seed) >>`,
    ];

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
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdf, 'latin1');
}

function inr(value: number): string {
    return `Rs. ${value.toLocaleString('en-IN')}`;
}

/* ---------------------------------- main --------------------------------- */

function main() {
    mkdirSync(LOGO_DIR, { recursive: true });
    mkdirSync(BROCHURE_DIR, { recursive: true });

    for (const seed of COLLEGE_SEEDS) {
        const slug = slugify(`${seed.name} ${seed.citySlug}`);

        writeFileSync(join(LOGO_DIR, `${slug}.svg`), logoSvg(seed.name, slug), 'utf8');

        const lines: Line[] = [
            { text: seed.name, size: 20, font: 'F1', gap: 0 },
            { text: `${seed.shortName} · ${seed.ownership} · Established ${seed.establishedYear}`, size: 11, font: 'F2', gap: 26 },
            { text: 'Programme prospectus (demonstration copy)', size: 11, font: 'F2', gap: 18 },
            { text: 'About the institute', size: 13, font: 'F1', gap: 44 },
            { text: `Affiliated to ${seed.affiliatedTo}.`, size: 11, font: 'F2', gap: 22 },
            { text: `Approvals: ${seed.approvals.join(', ') || 'Not applicable'}.`, size: 11, font: 'F2', gap: 18 },
            { text: `Accreditation: ${seed.accreditation.join(', ')}.`, size: 11, font: 'F2', gap: 18 },
            { text: `Campus: ${seed.campusSizeAcres} acres · ${seed.totalStudents.toLocaleString('en-IN')} students on roll.`, size: 11, font: 'F2', gap: 18 },
            { text: `Hostel: ${seed.hostelAvailable ? 'available for men and women' : 'not available on campus'}.`, size: 11, font: 'F2', gap: 18 },
            { text: 'Fees', size: 13, font: 'F1', gap: 36 },
            { text: `Annual fee range: ${inr(seed.feeMin)} to ${inr(seed.feeMax)} depending on programme.`, size: 11, font: 'F2', gap: 22 },
            { text: 'Placements (last reported cycle)', size: 13, font: 'F1', gap: 36 },
            { text: `Highest package ${inr(seed.highestPackage)} · Average package ${inr(seed.averagePackage)}.`, size: 11, font: 'F2', gap: 22 },
            { text: `Students placed: ${seed.placementPercentage}% of eligible candidates.`, size: 11, font: 'F2', gap: 18 },
            { text: `Recruiters: ${seed.recruiters.join(', ')}.`, size: 11, font: 'F2', gap: 18 },
            { text: 'Admission', size: 13, font: 'F1', gap: 36 },
            {
                text: seed.examSlugs.length
                    ? `Entrance exams accepted: ${seed.examSlugs.join(', ').toUpperCase()}.`
                    : 'Admission is on merit in the qualifying examination.',
                size: 11,
                font: 'F2',
                gap: 22,
            },
            { text: 'Apply through the counselling portal, then complete document verification.', size: 11, font: 'F2', gap: 18 },
            { text: 'Demonstration data', size: 13, font: 'F1', gap: 40 },
            { text: 'Every figure in this document is illustrative sample data generated for a', size: 11, font: 'F2', gap: 22 },
            { text: 'product demonstration. It is not an official prospectus and must not be', size: 11, font: 'F2', gap: 16 },
            { text: 'used for admission decisions.', size: 11, font: 'F2', gap: 16 },
        ];

        writeFileSync(
            join(BROCHURE_DIR, `${slug}-prospectus.pdf`),
            prospectusPdf(lines, `${seed.name} — prospectus (demonstration)`),
        );
    }

    console.log(
        `Generated ${COLLEGE_SEEDS.length} logos in public/brand/colleges and ${COLLEGE_SEEDS.length} brochures in public/brochures`,
    );
}

main();
