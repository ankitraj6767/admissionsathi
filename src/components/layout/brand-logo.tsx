'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DEFAULT_BRANDING, type BrandingConfig } from '@/lib/branding';
import { cn } from '@/lib/utils';

/**
 * Shared dynamic site wordmark. The configured asset fills the emblem slot,
 * while the site name and tagline remain live text sourced from settings.
 * The inline emblem is a resilient fallback when an asset cannot be loaded.
 */
export function BrandLogo({
    className,
    variant = 'light',
    showTagline = true,
    href = '/',
    branding = DEFAULT_BRANDING,
}: {
    className?: string;
    variant?: 'light' | 'dark';
    showTagline?: boolean;
    href?: string | null;
    branding?: BrandingConfig;
}) {
    const assetUrl = variant === 'dark' ? branding.logoDarkUrl : branding.logoUrl;
    const [failedAsset, setFailedAsset] = useState<string | null>(null);
    const navy = variant === 'light' ? '#073174' : '#FFFFFF';
    const soft = variant === 'light' ? '#667085' : 'rgba(255,255,255,0.72)';
    const words = branding.name.trim().split(/\s+/);
    const accent = words.length > 1 ? words.pop() : '';
    const primary = words.join(' ') || branding.name;

    const content = (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            {assetUrl && failedAsset !== assetUrl ? (
                // Branding URLs are administrator-controlled and may point to
                // any HTTPS media host allowed by the deployment CSP.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={assetUrl}
                    alt=""
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 rounded-full bg-white object-cover"
                    decoding="async"
                    onError={() => setFailedAsset(assetUrl)}
                />
            ) : (
                <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <svg viewBox="0 0 44 44" className="h-12 w-12" aria-hidden="true">
                        <circle cx="22" cy="22" r="20.5" fill={variant === 'light' ? '#EEF4FF' : 'rgba(255,255,255,0.12)'} />
                        <path d="M22 9.5 34 15l-12 5.5L10 15l12-5.5Z" fill={variant === 'light' ? '#073174' : '#FFFFFF'} />
                        <path d="M22 22.6 31 18.5v5.4c0 3.6-3.9 6.6-9 6.6s-9-3-9-6.6v-5.4l9 4.1Z" fill="#FF6B17" />
                        <circle cx="33.4" cy="20.4" r="2" fill="#0AA39A" />
                        <path d="M33.4 22.4v5.2" stroke="#0AA39A" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M14 33.5h16" stroke={variant === 'light' ? '#073174' : '#FFFFFF'} strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                </span>
            )}

            <span className="flex min-w-0 flex-col leading-none">
                <span className="flex items-baseline gap-1 font-display text-[17px] font-extrabold tracking-tight">
                    <span className="truncate uppercase" style={{ color: navy }}>{primary}</span>
                    {accent ? <span className="shrink-0 uppercase text-orange">{accent}</span> : null}
                </span>
                {showTagline ? (
                    <span className="mt-1 truncate text-[10px] font-medium tracking-wide" style={{ color: soft }}>
                        {branding.tagline}
                    </span>
                ) : null}
            </span>
        </span>
    );

    if (!href) return content;

    return (
        <Link href={href} className="inline-flex shrink-0 items-center" aria-label={`${branding.name} home`}>
            {content}
        </Link>
    );
}
