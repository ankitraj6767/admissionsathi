import * as React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { displayHost, isExternalHref, safeHref } from '@/lib/url';
import { cn } from '@/lib/utils';

/**
 * Renders an admin-authored URL as a link, or renders nothing.
 *
 * Every editor-supplied URL on the public site goes through this. It does three
 * things a bare `<a href={value}>` does not:
 *
 * 1. Validates the scheme, so a stored `javascript:` URL cannot become a script
 *    sink. An unsafe value renders `fallback` (nothing by default) instead.
 * 2. Adds `target="_blank"` with `rel="noopener noreferrer"` for external links —
 *    `noopener` is what stops the opened page reaching back through
 *    `window.opener`.
 * 3. Tells the visitor the link leaves the site, which is both a usability and an
 *    accessibility expectation for new-tab links.
 */
export interface SafeLinkProps {
    href?: string | null;
    children?: React.ReactNode;
    className?: string;
    /** Rendered when the URL is missing or unsafe. */
    fallback?: React.ReactNode;
    /** Show the trailing "opens in a new tab" icon. */
    showIcon?: boolean;
    /** Use the URL's host as the label when no children are given. */
    labelFromHost?: boolean;
    'data-analytics'?: string;
}

export function SafeLink({
    href,
    children,
    className,
    fallback = null,
    showIcon = true,
    labelFromHost = false,
    'data-analytics': analytics,
}: SafeLinkProps) {
    const safe = safeHref(href);
    if (!safe) return <>{fallback}</>;

    const external = isExternalHref(safe);
    const label = children ?? (labelFromHost ? displayHost(safe) : safe);

    return (
        <a
            href={safe}
            className={cn('inline-flex items-center gap-1', className)}
            data-analytics={analytics}
            {...(external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
        >
            {label}
            {external && showIcon ? (
                <>
                    <ExternalLinkIcon className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                </>
            ) : null}
        </a>
    );
}
