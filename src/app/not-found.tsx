import Link from 'next/link';
import { Compass, GraduationCap, Building2, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Suspense } from 'react';

export const metadata: Metadata = {
    title: 'Page not found',
    robots: { index: false, follow: false },
};

const SUGGESTIONS = [
    { href: '/colleges', label: 'Browse colleges', icon: Building2 },
    { href: '/courses', label: 'Explore courses', icon: GraduationCap },
    { href: '/exams', label: 'Entrance exams', icon: FileText },
    { href: '/predictors', label: 'College predictors', icon: Compass },
];

/**
 * Root 404. Renders the full site chrome so visitors landing on a dead link
 * (old URL, mistyped slug) can navigate on rather than bounce.
 */
export default function NotFound() {
    return (
        <div className="flex min-h-dvh flex-col bg-page">
            <Suspense fallback={<div className="h-16 border-b border-line bg-white" />}>
                <SiteHeader />
            </Suspense>

            <main id="main-content" className="flex-1">
                <div className="shell flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Error 404</p>
                    <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
                        We could not find that page
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                        The link may be outdated or the page may have moved. Try a search, or start from one of
                        the sections below.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Button asChild>
                            <Link href="/">Back to home</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/search">Search the site</Link>
                        </Button>
                    </div>

                    <ul className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                        {SUGGESTIONS.map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className="flex h-full min-h-[44px] flex-col items-center gap-2 rounded-[14px] border border-line bg-white p-4 text-xs font-semibold text-ink transition-colors hover:border-navy-200 hover:bg-navy-50/50"
                                >
                                    <Icon className="h-5 w-5 text-navy-600" aria-hidden="true" />
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>

            <Suspense fallback={<div className="h-80 bg-navy-800" />}>
                <SiteFooter />
            </Suspense>
        </div>
    );
}
