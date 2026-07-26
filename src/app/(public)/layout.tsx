import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Skeleton } from '@/components/ui/primitives';

function HeaderFallback() {
    return (
        <div className="sticky top-0 z-50 border-b border-line bg-white">
            <div className="header-shell flex h-16 items-center justify-between">
                <Skeleton className="h-9 w-44" />
                <Skeleton className="h-7 w-[420px] max-w-[40vw]" />
                <Skeleton className="h-10 w-40" />
            </div>
        </div>
    );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-page">
            <Suspense fallback={<HeaderFallback />}>
                <SiteHeader />
            </Suspense>

            <main id="main-content" className="flex-1">
                {children}
            </main>

            <Suspense fallback={<div className="h-80 bg-navy-800" />}>
                <SiteFooter />
            </Suspense>
        </div>
    );
}
