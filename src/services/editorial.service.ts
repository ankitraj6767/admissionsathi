import 'server-only';
import { listArticles, listNews } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { cached, CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

export const searchArticles = cached(
    async (filters: Parameters<typeof listArticles>[0]) => toPlain(await listArticles(filters)),
    ['article-search'],
    { tags: [CACHE_TAGS.articles], revalidate: CACHE_TTL.short },
);

export const searchNews = cached(
    async (filters: Parameters<typeof listNews>[0]) => toPlain(await listNews(filters)),
    ['news-search'],
    { tags: [CACHE_TAGS.news], revalidate: CACHE_TTL.short },
);
