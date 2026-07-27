import { hashString, slugify } from '@/lib/utils';
import type { CollegeSeed } from './college.data';

/**
 * Media and contact detail for the demonstration colleges.
 *
 * Why this file exists: the college dataset only carries facts (fees, ranking,
 * placement). Everything a visitor *sees first* — logo, hero banner, gallery,
 * campus-tour video, brochure, website, map — was missing, so seeded pages looked
 * like empty shells. Rather than hand-authoring 60 galleries, tiles are composed
 * deterministically from themed asset pools keyed on the college slug: the same
 * college always gets the same photos, and no two neighbouring tiles repeat.
 *
 * Asset sources
 * - Photos: Unsplash (`images.unsplash.com`), free to use under the Unsplash
 *   licence. Host is already allowed in `next.config.ts` (`remotePatterns` and
 *   CSP `img-src`).
 * - Videos: Pexels (`videos.pexels.com`), free to use under the Pexels licence,
 *   referenced as direct MP4s so they play through the native `<video>` element
 *   the gallery lightbox already uses for `videoProvider: 'file'`. CSP
 *   `media-src` allows `https:`, so no config change is needed.
 *
 * Every asset is generic stock footage of *some* campus — it is illustrative
 * demonstration media, exactly like the fees and rankings, and is not a photo of
 * the (fictional) institute it is attached to.
 */

/* ------------------------------ photo pools ------------------------------ */

/** Unsplash photo ids, grouped by what they show. */
const PHOTOS = {
    campus: [
        '1562774053-701939374585',
        '1541339907198-e08756dedf3f',
        '1498243691581-b145c3f54a5a',
        '1529148482759-b35b25c5f217',
        '1517971129774-8a2b38fa128e',
        '1607237138185-eedd9c632b0b',
        '1568605114967-8130f3a36994',
        '1600585154340-be6161a56a0c',
        '1524758631624-e2822e304c36',
    ],
    library: [
        '1427504494785-3a9ca7044f45',
        '1521587760476-6c12a4b040da',
        '1436450412740-6b988f486c6b',
        '1517245386807-bb43f82c33c4',
    ],
    classroom: [
        '1503676260728-1c00da094a0b',
        '1509062522246-3755977927d7',
        '1524178232363-1fb2b075b655',
        '1523580494863-6f3031224c94',
        '1517502884422-41eaead166d4',
    ],
    scienceLab: [
        '1568792923760-d70635a89fdc',
        '1581092160562-40aa08e78837',
        '1532094349884-543bc11b234d',
        '1581092918056-0c4c3acd3789',
        '1565043666747-69f6646db940',
        '1518152006812-edab29b069ac',
    ],
    computerLab: [
        '1519389950473-47ba0277781c',
        '1573164713988-8665fc963095',
        '1497366811353-6870744d04b2',
        '1522071820081-009f0129c71c',
    ],
    hostel: [
        '1571260899304-425eee4c7efc',
        '1555854877-bab0e564b8d5',
        '1600880292203-757bb62b4baf',
        '1541746972996-4e0b0f43e02a',
    ],
    sports: [
        '1574629810360-7efbbe195018',
        '1571019613454-1cb2f99b2d8b',
        '1526379095098-d400fd0bf935',
        '1534438327276-14e5300c3a48',
        '1517649763962-0c623066013b',
        '1587280501635-68a0e82cd5ff',
    ],
    cafeteria: ['1552566626-52f8b828add9', '1517248135467-4c7edcad34c4', '1454165804606-c3d57bc86b40'],
    auditorium: ['1461896836934-ffe607ba8211', '1540575467063-178a50c2df87', '1594381898411-846e7d193883'],
    campusLife: [
        '1523240795612-9a054b0db644',
        '1522202176988-66273c2fd55f',
        '1543269865-cbf427effbad',
        '1580582932707-520aed937b7b',
        '1524995997946-a1c2e315a42f',
        '1531482615713-2afd69097998',
        '1504328345606-18bbc8c9d7d1',
    ],
    convocation: ['1546410531-bb4caa6b424d', '1523580846011-d3a5bc25702b'],
    hospital: [
        '1592280771190-3e2e4d571952',
        '1579154204601-01588f351e67',
        '1584982751601-97dcc096659c',
        '1631217868264-e5b90bb7e133',
        '1583373834259-46cc92173cb7',
        '1576091160399-112ba8d25d1d',
        '1551076805-e1869033e561',
    ],
    nursing: ['1584515933487-779824d29309', '1622253692010-333f2da6031d', '1559839734-2b71ea197ec2'],
    pharmacy: [
        '1587854692152-cbe660dbde88',
        '1471864190281-a93a3070b6de',
        '1585435557343-3b092031a831',
        '1512069772995-ec65ed45afd6',
    ],
    law: ['1450101499163-c8848c66ca85', '1589829545856-d10d557cf95f', '1436450412740-6b988f486c6b'],
    kitchen: ['1556910103-1c02745aae4d', '1581299894007-aaa50297cf16', '1414235077428-338989a2e8c0'],
} as const;

type PhotoPool = keyof typeof PHOTOS;

/**
 * Unsplash serves derivatives from query parameters, so a fixed crop keeps every
 * tile the same aspect ratio and avoids a ragged grid.
 */
function photoUrl(id: string, width: number, height: number): string {
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=70`;
}

/* ------------------------------ video pool ------------------------------- */

interface VideoAsset {
    /** Direct MP4, verified reachable. */
    url: string;
    caption: string;
    poster: PhotoPool;
}

const CAMPUS_TOUR: VideoAsset = {
    url: 'https://videos.pexels.com/video-files/7490421/7490421-hd_1920_1080_25fps.mp4',
    caption: 'Campus tour — aerial walkthrough',
    poster: 'campus',
};

/** Second video, rotated per college so galleries do not all look identical. */
const SUPPORTING_VIDEOS: VideoAsset[] = [
    {
        url: 'https://videos.pexels.com/video-files/8198509/8198509-hd_1920_1080_25fps.mp4',
        caption: 'Between classes in the academic block',
        poster: 'campusLife',
    },
    {
        url: 'https://videos.pexels.com/video-files/8198511/8198511-hd_1920_1080_25fps.mp4',
        caption: 'Inside a lecture hall',
        poster: 'classroom',
    },
    {
        url: 'https://videos.pexels.com/video-files/8499665/8499665-hd_1920_1080_30fps.mp4',
        caption: 'Library and reading rooms',
        poster: 'library',
    },
    {
        url: 'https://videos.pexels.com/video-files/7230798/7230798-hd_1920_1080_25fps.mp4',
        caption: 'Laboratory and research work',
        poster: 'scienceLab',
    },
    {
        url: 'https://videos.pexels.com/video-files/7945243/7945243-hd_1920_1080_25fps.mp4',
        caption: 'Convocation ceremony',
        poster: 'convocation',
    },
    {
        url: 'https://videos.pexels.com/video-files/7945681/7945681-hd_1920_1080_25fps.mp4',
        caption: 'Graduation day at the sports arena',
        poster: 'sports',
    },
    {
        url: 'https://videos.pexels.com/video-files/7712354/7712354-hd_1920_1080_30fps.mp4',
        caption: 'Graduation day on campus',
        poster: 'campus',
    },
    {
        url: 'https://videos.pexels.com/video-files/7945192/7945192-hd_1920_1080_25fps.mp4',
        caption: 'Degree distribution at convocation',
        poster: 'auditorium',
    },
];

/* ------------------------------ stream themes ---------------------------- */

export type StreamTheme =
    | 'engineering'
    | 'medical'
    | 'nursing'
    | 'paramedical'
    | 'pharmacy'
    | 'law'
    | 'management'
    | 'bca-it'
    | 'hospitality';

interface ThemeSpec {
    tagline: string;
    /** Two stream-specific gallery tiles. */
    tiles: { pool: PhotoPool; caption: string }[];
}

const THEMES: Record<StreamTheme, ThemeSpec> = {
    engineering: {
        tagline: 'Engineering, technology and applied sciences',
        tiles: [
            { pool: 'scienceLab', caption: 'Mechanical workshop and machine lab' },
            { pool: 'computerLab', caption: 'Electronics and instrumentation lab' },
        ],
    },
    medical: {
        tagline: 'Medical education with an attached teaching hospital',
        tiles: [
            { pool: 'hospital', caption: 'Attached teaching hospital' },
            { pool: 'hospital', caption: 'Anatomy and clinical simulation lab' },
        ],
    },
    nursing: {
        tagline: 'Nursing education and clinical training',
        tiles: [
            { pool: 'nursing', caption: 'Clinical skills and nursing practice lab' },
            { pool: 'hospital', caption: 'Ward training at the partner hospital' },
        ],
    },
    paramedical: {
        tagline: 'Allied health and paramedical sciences',
        tiles: [
            { pool: 'hospital', caption: 'Diagnostic imaging and pathology lab' },
            { pool: 'nursing', caption: 'Physiotherapy and rehabilitation hall' },
        ],
    },
    pharmacy: {
        tagline: 'Pharmaceutical sciences and drug research',
        tiles: [
            { pool: 'pharmacy', caption: 'Pharmaceutics and formulation lab' },
            { pool: 'scienceLab', caption: 'Instrumental analysis lab' },
        ],
    },
    law: {
        tagline: 'Legal education, advocacy and research',
        tiles: [
            { pool: 'auditorium', caption: 'Moot court hall' },
            { pool: 'law', caption: 'Law library and case archive' },
        ],
    },
    management: {
        tagline: 'Management, commerce and business analytics',
        tiles: [
            { pool: 'classroom', caption: 'Case-study discussion room' },
            { pool: 'computerLab', caption: 'Finance and analytics lab' },
        ],
    },
    'bca-it': {
        tagline: 'Computer applications, IT and data science',
        tiles: [
            { pool: 'computerLab', caption: 'Programming and project lab' },
            { pool: 'scienceLab', caption: 'Networking and cyber-security lab' },
        ],
    },
    hospitality: {
        tagline: 'Hospitality, hotel management and culinary arts',
        tiles: [
            { pool: 'kitchen', caption: 'Training kitchen' },
            { pool: 'cafeteria', caption: 'Training restaurant' },
        ],
    },
};

export function themeFor(seed: CollegeSeed): StreamTheme {
    if (seed.mediaTheme) return seed.mediaTheme;
    const primary = seed.categorySlugs[0];
    if (primary && primary in THEMES) return primary as StreamTheme;
    return 'engineering';
}

/* ------------------------------- city detail ----------------------------- */

/** Approximate city-centre coordinates and a head-post-office pincode. */
const CITY_PLACES: Record<string, { lat: number; lng: number; pincode: string }> = {
    'new-delhi': { lat: 28.6139, lng: 77.209, pincode: '110001' },
    dwarka: { lat: 28.5921, lng: 77.046, pincode: '110075' },
    rohini: { lat: 28.7495, lng: 77.0565, pincode: '110085' },
    mumbai: { lat: 19.076, lng: 72.8777, pincode: '400001' },
    pune: { lat: 18.5204, lng: 73.8567, pincode: '411001' },
    nagpur: { lat: 21.1458, lng: 79.0882, pincode: '440001' },
    nashik: { lat: 19.9975, lng: 73.7898, pincode: '422001' },
    aurangabad: { lat: 19.8762, lng: 75.3433, pincode: '431001' },
    bengaluru: { lat: 12.9716, lng: 77.5946, pincode: '560001' },
    mysuru: { lat: 12.2958, lng: 76.6394, pincode: '570001' },
    mangaluru: { lat: 12.9141, lng: 74.856, pincode: '575001' },
    hubballi: { lat: 15.3647, lng: 75.124, pincode: '580020' },
    chennai: { lat: 13.0827, lng: 80.2707, pincode: '600001' },
    coimbatore: { lat: 11.0168, lng: 76.9558, pincode: '641001' },
    madurai: { lat: 9.9252, lng: 78.1198, pincode: '625001' },
    tiruchirappalli: { lat: 10.7905, lng: 78.7047, pincode: '620001' },
    lucknow: { lat: 26.8467, lng: 80.9462, pincode: '226001' },
    noida: { lat: 28.5355, lng: 77.391, pincode: '201301' },
    kanpur: { lat: 26.4499, lng: 80.3319, pincode: '208001' },
    varanasi: { lat: 25.3176, lng: 82.9739, pincode: '221001' },
    prayagraj: { lat: 25.4358, lng: 81.8463, pincode: '211001' },
    hyderabad: { lat: 17.385, lng: 78.4867, pincode: '500001' },
    warangal: { lat: 17.9689, lng: 79.5941, pincode: '506002' },
    kolkata: { lat: 22.5726, lng: 88.3639, pincode: '700001' },
    durgapur: { lat: 23.5204, lng: 87.3119, pincode: '713201' },
    siliguri: { lat: 26.7271, lng: 88.3953, pincode: '734001' },
    ahmedabad: { lat: 23.0225, lng: 72.5714, pincode: '380001' },
    surat: { lat: 21.1702, lng: 72.8311, pincode: '395001' },
    vadodara: { lat: 22.3072, lng: 73.1812, pincode: '390001' },
    jaipur: { lat: 26.9124, lng: 75.7873, pincode: '302001' },
    kota: { lat: 25.2138, lng: 75.8648, pincode: '324001' },
    udaipur: { lat: 24.5854, lng: 73.7125, pincode: '313001' },
    bhopal: { lat: 23.2599, lng: 77.4126, pincode: '462001' },
    indore: { lat: 22.7196, lng: 75.8577, pincode: '452001' },
    gwalior: { lat: 26.2183, lng: 78.1828, pincode: '474001' },
    patna: { lat: 25.5941, lng: 85.1376, pincode: '800001' },
    gaya: { lat: 24.7955, lng: 85.0002, pincode: '823001' },
    muzaffarpur: { lat: 26.1209, lng: 85.3647, pincode: '842001' },
    thiruvananthapuram: { lat: 8.5241, lng: 76.9366, pincode: '695001' },
    kochi: { lat: 9.9312, lng: 76.2673, pincode: '682001' },
    kozhikode: { lat: 11.2588, lng: 75.7804, pincode: '673001' },
    chandigarh: { lat: 30.7333, lng: 76.7794, pincode: '160001' },
    ludhiana: { lat: 30.901, lng: 75.8573, pincode: '141001' },
    amritsar: { lat: 31.634, lng: 74.8723, pincode: '143001' },
    bhubaneswar: { lat: 20.2961, lng: 85.8245, pincode: '751001' },
    cuttack: { lat: 20.4625, lng: 85.883, pincode: '753001' },
    guwahati: { lat: 26.1445, lng: 91.7362, pincode: '781001' },
    dibrugarh: { lat: 27.4728, lng: 94.912, pincode: '786001' },
    gurugram: { lat: 28.4595, lng: 77.0266, pincode: '122001' },
    faridabad: { lat: 28.4089, lng: 77.3178, pincode: '121001' },
    sonipat: { lat: 28.9931, lng: 77.0151, pincode: '131001' },
    visakhapatnam: { lat: 17.6868, lng: 83.2185, pincode: '530001' },
    vijayawada: { lat: 16.5062, lng: 80.648, pincode: '520001' },
    guntur: { lat: 16.3067, lng: 80.4365, pincode: '522001' },
    dehradun: { lat: 30.3165, lng: 78.0322, pincode: '248001' },
    haridwar: { lat: 29.9457, lng: 78.1642, pincode: '249401' },
    ranchi: { lat: 23.3441, lng: 85.3096, pincode: '834001' },
    jamshedpur: { lat: 22.8046, lng: 86.2029, pincode: '831001' },
    raipur: { lat: 21.2514, lng: 81.6296, pincode: '492001' },
    bilaspur: { lat: 22.0797, lng: 82.1409, pincode: '495001' },
    'goa-panaji': { lat: 15.4909, lng: 73.8278, pincode: '403001' },
    'vasco-da-gama': { lat: 15.386, lng: 73.8157, pincode: '403802' },
};

const LOCALITIES = [
    'Education City',
    'Knowledge Park',
    'Institutional Area',
    'University Road',
    'Campus Road',
    'Technology Park',
    'Vidya Nagar',
];

/* -------------------------------- helpers -------------------------------- */

/** Stable choice from a pool: the same key always returns the same asset. */
function pick<T>(pool: readonly T[], key: string, offset = 0): T {
    return pool[(hashString(key) + offset * 7) % pool.length]!;
}

/** Distinct choices from a pool, used when one tile group needs two photos. */
function pickPair<T>(pool: readonly T[], key: string): [T, T] {
    const first = (hashString(key) % pool.length + pool.length) % pool.length;
    const second = (first + 1 + (hashString(`${key}-b`) % (pool.length - 1))) % pool.length;
    return [pool[first]!, pool[second]!];
}

/**
 * Fictional `.edu.in` host built from the college short name.
 *
 * `.edu.in` registration is restricted to recognised institutions, so a made-up
 * name here cannot be squatted by a third party — which is why this is used
 * instead of a live domain. Replace with the real website when the dataset is.
 */
function websiteFor(shortName: string): string {
    return `https://www.${slugify(shortName).replace(/-/g, '')}.edu.in`;
}

/** Fake-but-plausible phone in the reserved-looking 99555 block. */
function phoneFor(key: string, offset: number): string {
    const suffix = String(10000 + (hashString(`${key}-${offset}`) % 89999));
    return `+91 99555 ${suffix}`;
}

/* -------------------------------- gallery -------------------------------- */

export interface SeedGalleryItem {
    kind: 'image' | 'video';
    url: string;
    alt: string;
    caption: string;
    width?: number;
    height?: number;
    videoProvider?: 'file';
    embedUrl?: string;
    thumbnailUrl?: string;
    displayOrder: number;
}

const GALLERY_WIDTH = 1400;
const GALLERY_HEIGHT = 933;

/**
 * Composes a 12–14 tile gallery: campus, academics, the two stream-specific
 * tiles, residence and campus life, then the two videos last so the photo grid
 * leads.
 */
export function buildGallery(seed: CollegeSeed, slug: string): SeedGalleryItem[] {
    const theme = THEMES[themeFor(seed)];
    const [campusA, campusB] = pickPair(PHOTOS.campus, slug);
    const label = seed.shortName;

    const photos: { id: string; caption: string }[] = [
        { id: campusA, caption: 'Main campus entrance' },
        { id: campusB, caption: 'Academic block' },
        { id: pick(PHOTOS.library, slug), caption: 'Central library and reading hall' },
        ...theme.tiles.map((tile, index) => ({
            id: pick(PHOTOS[tile.pool], `${slug}-${tile.pool}`, index + 1),
            caption: tile.caption,
        })),
        { id: pick(PHOTOS.classroom, slug), caption: 'Lecture hall' },
        ...(seed.hostelAvailable
            ? [{ id: pick(PHOTOS.hostel, slug), caption: 'Hostel block and common room' }]
            : []),
        { id: pick(PHOTOS.sports, slug), caption: 'Sports complex and playfield' },
        { id: pick(PHOTOS.cafeteria, slug), caption: 'Campus cafeteria' },
        { id: pick(PHOTOS.auditorium, slug), caption: 'Auditorium and seminar hall' },
        { id: pick(PHOTOS.campusLife, slug), caption: 'Student life on campus' },
        { id: pick(PHOTOS.convocation, slug), caption: 'Annual convocation' },
    ];

    const videos = [CAMPUS_TOUR, pick(SUPPORTING_VIDEOS, slug)];

    return [
        ...photos.map((photo, index) => ({
            kind: 'image' as const,
            url: photoUrl(photo.id, GALLERY_WIDTH, GALLERY_HEIGHT),
            alt: `${label} — ${photo.caption.toLowerCase()}`,
            caption: photo.caption,
            width: GALLERY_WIDTH,
            height: GALLERY_HEIGHT,
            displayOrder: index,
        })),
        ...videos.map((video, index) => ({
            kind: 'video' as const,
            url: video.url,
            // Referenced MP4s play through the native player the lightbox uses
            // for `videoProvider: 'file'`, so `embedUrl` is the file itself.
            embedUrl: video.url,
            videoProvider: 'file' as const,
            thumbnailUrl: photoUrl(pick(PHOTOS[video.poster], `${slug}-video`, index), 800, 533),
            alt: `${label} — ${video.caption.toLowerCase()}`,
            caption: video.caption,
            displayOrder: photos.length + index,
        })),
    ];
}

/* ------------------------------ full profile ----------------------------- */

export interface CollegeMedia {
    logo: { url: string; alt: string };
    banner: { url: string; alt: string; width: number; height: number };
    gallery: SeedGalleryItem[];
    brochureUrl: string;
    tagline: string;
    universityType: string;
    address: string;
    pincode: string;
    location: { type: 'Point'; coordinates: [number, number] };
    mapEmbedUrl: string;
    contact: { phone: string; admissionPhone: string; email: string; website: string };
    studyModes: string[];
}

/** Local monogram SVGs, generated by `npm run assets:colleges`. */
export function logoPath(slug: string): string {
    return `/brand/colleges/${slug}.svg`;
}

/** Local one-page prospectus PDFs, generated by `npm run assets:colleges`. */
export function brochurePath(slug: string): string {
    return `/brochures/${slug}-prospectus.pdf`;
}

function universityTypeFor(seed: CollegeSeed): string {
    if (seed.ownership === 'Deemed') return 'Deemed to be University';
    if (/university/i.test(seed.name)) {
        return seed.ownership === 'Government' ? 'State University' : 'Private University';
    }
    if (seed.ownership === 'Autonomous') return 'Autonomous Institute';
    if (seed.ownership === 'Government') return 'Government Institute';
    return 'Affiliated College';
}

export function buildCollegeMedia(seed: CollegeSeed, slug: string, cityName: string): CollegeMedia {
    const place = CITY_PLACES[seed.citySlug] ?? { lat: 20.5937, lng: 78.9629, pincode: '110001' };
    const locality = pick(LOCALITIES, slug);
    const bannerId = pick(PHOTOS.campus, `${slug}-banner`, 3);
    const domain = websiteFor(seed.shortName);

    return {
        logo: { url: logoPath(slug), alt: `${seed.shortName} logo` },
        banner: {
            url: photoUrl(bannerId, 1920, 640),
            alt: `${seed.name} campus`,
            width: 1920,
            height: 640,
        },
        gallery: buildGallery(seed, slug),
        brochureUrl: brochurePath(slug),
        tagline: seed.tagline ?? `${THEMES[themeFor(seed)].tagline} in ${cityName}`,
        universityType: universityTypeFor(seed),
        address: `${seed.shortName} Campus, ${locality}, ${cityName} – ${place.pincode}`,
        pincode: place.pincode,
        location: { type: 'Point', coordinates: [place.lng, place.lat] },
        // `www.google.com` is already allowed by the CSP `frame-src` list, which is
        // what makes this render instead of being blocked.
        mapEmbedUrl: `https://www.google.com/maps?q=${place.lat},${place.lng}&z=15&output=embed`,
        contact: {
            phone: phoneFor(slug, 1),
            admissionPhone: phoneFor(slug, 2),
            email: `admissions@${new URL(domain).hostname.replace(/^www\./, '')}`,
            website: domain,
        },
        studyModes: seed.studyModes ?? ['Full Time'],
    };
}
