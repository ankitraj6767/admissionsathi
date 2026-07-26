import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/utils';

/**
 * robots.txt
 *
 * Authenticated areas, the API surface and search-result URLs are disallowed:
 * they are either private or produce near-duplicate crawlable permutations.
 * Non-production hosts are fully disallowed so preview deployments never
 * compete with the live site in search results.
 */
export default function robots(): MetadataRoute.Robots {
    /*
     * Only the real production deployment is crawlable.
     *
     * `VERCEL_ENV` is the reliable signal: it is `production`, `preview` or
     * `development`. Sniffing the hostname instead would block a production
     * site that legitimately runs on a `*.vercel.app` domain, and would let a
     * preview through as soon as it got a custom domain.
     */
    const vercelEnv = process.env.VERCEL_ENV;
    const isProduction = vercelEnv
        ? vercelEnv === 'production'
        : process.env.NODE_ENV === 'production';

    if (!isProduction) {
        return {
            rules: [{ userAgent: '*', disallow: '/' }],
            sitemap: absoluteUrl('/sitemap.xml'),
        };
    }

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin',
                    '/admin/',
                    '/api/',
                    '/dashboard',
                    '/dashboard/',
                    '/login',
                    '/signup',
                    '/forgot-password',
                    '/403',
                    '/search',
                    '/uploads/',
                    '/*?*page=',
                    '/*?*sort=',
                ],
            },
            // Crawlers that ignore crawl-delay and add no value for an Indian
            // education site. Blocking them keeps serverless invocations down.
            { userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'], disallow: '/' },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
        host: absoluteUrl('/').replace(/\/$/, ''),
    };
}
