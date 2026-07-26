'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Adds the "scrolled" treatment (compact height + stronger shadow) once the user
 * scrolls past the utility bar. Kept as a tiny client wrapper so the header
 * content itself stays a Server Component.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div
            data-scrolled={scrolled}
            className={cn(
                'sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md transition-shadow duration-300',
                scrolled ? 'border-line shadow-[0_6px_20px_-14px_rgba(16,32,64,0.35)]' : 'border-transparent',
            )}
        >
            {children}
        </div>
    );
}
