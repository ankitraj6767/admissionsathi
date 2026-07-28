import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy.
 * `unsafe-inline` for styles is required by Next.js streaming style injection.
 * Scripts allow `unsafe-inline` only in development (React refresh + devtools).
 */
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    // `i.ytimg.com` and `i.vimeocdn.com` serve the poster frames for gallery
    // videos; without them every video tile renders as a broken image.
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://i.ytimg.com https://i.vimeocdn.com https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://api.cloudinary.com https://api.openai.com",
    // Gallery videos embed from the privacy-preserving YouTube host and Vimeo's
    // player. Both are required in addition to youtube.com for legacy embeds.
    "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    // Direct .mp4/.webm gallery items play through a native <video> element.
    "media-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    serverExternalPackages: ['mongoose', 'bcryptjs', 'cloudinary'],
    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts'],
        /*
         * Client router cache. Every route here renders dynamically (the header
         * reads the session), and without this the router discards a segment's
         * payload almost immediately, so going back to a list page re-runs its
         * queries. Holding dynamic payloads for 5 minutes makes back/forward and
         * repeat visits paint from memory with no server work at all.
         */
        staleTimes: {
            dynamic: 300,
            static: 600,
        },
        /*
         * Prefetch the real RSC payload of a dynamic route on hover/touch-start,
         * instead of only its loading boundary. Combined with the `loading.tsx`
         * files this is what makes a click feel instant: by the time the pointer
         * lands, the page is usually already in the router cache.
         */
        dynamicOnHover: true,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: '*.s3.amazonaws.com' },
        ],
        deviceSizes: [360, 390, 430, 640, 768, 1024, 1280, 1440, 1536, 1920],
    },
    typedRoutes: false,
    async headers() {
        return [{ source: '/(.*)', headers: securityHeaders }];
    },
};

export default nextConfig;
