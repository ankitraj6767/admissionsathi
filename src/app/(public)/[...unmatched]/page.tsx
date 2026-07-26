import { notFound, permanentRedirect, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { resolveRedirect, recordRedirectHit } from '@/services/redirect.service';

export const metadata: Metadata = {
    title: 'Page not found',
    robots: { index: false, follow: false },
};

/**
 * Lowest-priority catch-all for the public site.
 *
 * Next.js matches every concrete route before a catch-all, so this only runs
 * for URLs nothing else claims. It gives the admin-managed Redirect collection
 * a chance to rescue the request (old campaign URLs, restructured sections)
 * before falling through to the 404 page.
 */
export default async function UnmatchedPublicRoute({
    params,
}: {
    params: Promise<{ unmatched: string[] }>;
}) {
    const { unmatched } = await params;
    const pathname = `/${(unmatched ?? []).join('/')}`;

    const rule = await resolveRedirect(pathname);

    if (rule) {
        recordRedirectHit(pathname);
        if (rule.permanent) permanentRedirect(rule.destination);
        redirect(rule.destination);
    }

    notFound();
}
