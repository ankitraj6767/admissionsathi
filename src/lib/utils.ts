import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { resolveSiteUrl } from '@/config/site';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** URL-safe slug generator (transliteration-free, ASCII output). */
export function slugify(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 120);
}

/** Escapes user input before it is used inside a RegExp (NoSQL/ReDoS safety). */
export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

export function formatCurrency(value?: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return inrFormatter.format(value);
}

/** 240000 -> "₹ 2.4 L", 1500000 -> "₹ 15 L", 12000000 -> "₹ 1.2 Cr" */
export function formatCompactINR(value?: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (value >= 10_000_000) return `₹ ${trimZero(value / 10_000_000)} Cr`;
    if (value >= 100_000) return `₹ ${trimZero(value / 100_000)} L`;
    if (value >= 1_000) return `₹ ${trimZero(value / 1_000)} K`;
    return `₹ ${value}`;
}

function trimZero(n: number): string {
    return Number(n.toFixed(n < 10 ? 1 : 0)).toString();
}

/** 2048 -> "2 KB", 5_500_000 -> "5.2 MB". Used by the media library and picker. */
export function formatBytes(bytes?: number | null): string {
    if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 1000 -> "1000+", 20000 -> "20K+", 100000 -> "1 Lakh+" */
export function formatCompactCount(value: number, suffix = '+'): string {
    if (value >= 10_000_000) return `${trimZero(value / 10_000_000)} Cr${suffix}`;
    if (value >= 100_000) return `${trimZero(value / 100_000)} Lakh${suffix}`;
    if (value >= 1_000) return `${trimZero(value / 1_000)}K${suffix}`;
    return `${value}${suffix}`;
}

export function formatDate(
    value?: Date | string | null,
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'Asia/Kolkata' }).format(date);
}

export function formatRelativeTime(value?: Date | string | null): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(date);
}

export function truncate(text: string, max = 160): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Strips HTML tags for meta descriptions / reading time. */
export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function readingTimeMinutes(html: string): number {
    const words = stripHtml(html).split(' ').filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
}

export function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function unique<T>(items: T[]): T[] {
    return Array.from(new Set(items));
}

export function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/** Builds a query string while dropping empty values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '' || value === false) continue;
        sp.set(key, String(value));
    }
    const qs = sp.toString();
    return qs ? `?${qs}` : '';
}

export function maskPhone(phone: string): string {
    if (phone.length < 4) return '••••';
    return `${'•'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

export function maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain || !user) return '•••';
    return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

/** Deterministic pseudo-random for stable seed/demo values. */
export function hashString(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/**
 * Builds an absolute URL from a site-relative path.
 *
 * Resolves the origin per call through `resolveSiteUrl()` — the same function
 * behind `siteConfig.url` — so sitemaps, canonicals, OG cards and JSON-LD can
 * never disagree about the host.
 */
export function absoluteUrl(path: string): string {
    return `${resolveSiteUrl().replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
