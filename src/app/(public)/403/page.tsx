import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo/metadata';
import { getCurrentActor } from '@/lib/auth/session';

export const metadata: Metadata = buildMetadata({
    title: 'Access denied',
    description: 'You do not have permission to view this page.',
    path: '/403',
    noIndex: true,
    noFollow: true,
});

/**
 * Shown when a signed-in user reaches a route their role does not cover.
 * Middleware and `requirePermissionPage()` both redirect here.
 */
export default async function ForbiddenPage() {
    const actor = await getCurrentActor();

    return (
        <div className="shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange">
                <ShieldAlert className="h-8 w-8" aria-hidden="true" />
            </span>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-ink-soft">Error 403</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">Access denied</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                {actor
                    ? 'Your account does not have permission to open this page. If you believe this is a mistake, ask an administrator to review your role.'
                    : 'Please sign in with an account that has access to this page.'}
            </p>

            {actor ? (
                <p className="mt-2 text-xs text-ink-soft">
                    Signed in as <span className="font-semibold text-ink">{actor.email}</span>
                    {actor.roles.length > 0 ? ` · ${actor.roles.join(', ')}` : ''}
                </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                    <Link href="/">Back to home</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={actor ? '/dashboard' : '/login'}>
                        {actor ? 'Go to my dashboard' : 'Sign in'}
                    </Link>
                </Button>
            </div>
        </div>
    );
}
