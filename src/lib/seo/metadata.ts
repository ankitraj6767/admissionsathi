import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { truncate } from '@/lib/utils';

export interface MetadataInput {
    title: string;
    description?: string;
    path: string;
    ogImage?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    keywords?: string[];
    type?: 'website' | 'article';
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    /** Pagination metadata for listing pages. */
    pagination?: { page: number; totalPages: number };
}

/** Single place that builds canonical URLs, OG/Twitter cards and robots directives. */
export function buildMetadata(input: MetadataInput): Metadata {
    const canonicalPath = input.path.startsWith('/') ? input.path : `/${input.path}`;
    const description = truncate(input.description?.trim() || siteConfig.description, 300);
    const images = input.ogImage ? [{ url: input.ogImage }] : undefined;

    const metadata: Metadata = {
        title: input.title,
        description,
        keywords: input.keywords,
        alternates: { canonical: canonicalPath },
        robots: {
            index: !input.noIndex,
            follow: !input.noFollow,
            googleBot: { index: !input.noIndex, follow: !input.noFollow },
        },
        openGraph: {
            type: input.type ?? 'website',
            title: input.title,
            description,
            url: canonicalPath,
            siteName: siteConfig.name,
            locale: siteConfig.locale,
            images,
            ...(input.type === 'article'
                ? {
                    publishedTime: input.publishedTime,
                    modifiedTime: input.modifiedTime,
                    authors: input.authors,
                }
                : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title: input.title,
            description,
            site: siteConfig.twitter,
            images: input.ogImage ? [input.ogImage] : undefined,
        },
    };

    if (input.pagination && input.pagination.totalPages > 1) {
        const { page, totalPages } = input.pagination;
        const separator = canonicalPath.includes('?') ? '&' : '?';
        metadata.alternates = {
            canonical: page > 1 ? `${canonicalPath}${separator}page=${page}` : canonicalPath,
        };
        metadata.other = {
            ...(page > 1
                ? { 'link:prev': `${canonicalPath}${page - 1 > 1 ? `${separator}page=${page - 1}` : ''}` }
                : {}),
            ...(page < totalPages ? { 'link:next': `${canonicalPath}${separator}page=${page + 1}` } : {}),
        };
    }

    return metadata;
}

export function pageTitle(...parts: string[]): string {
    return parts.filter(Boolean).join(' — ');
}
