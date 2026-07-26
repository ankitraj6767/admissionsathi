'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Portal } from '@/components/ui/portal';
import { SearchBox } from './search-box';

/** Header search trigger + full-width dialog (⌘K / Ctrl-K). */
export function HeaderSearch() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Search"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink-soft transition-colors hover:border-navy-200 hover:text-navy-700"
            >
                <Search className="h-4 w-4" aria-hidden />
            </button>

            {/*
             * Portalled to <body> for the same reason as the mobile drawer: the
             * header's `backdrop-blur-md` makes it the containing block for
             * fixed-position descendants, which pinned this dialog inside the
             * header strip instead of centring it in the viewport.
             */}
            {open ? (
                <Portal>
                    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Site search">
                        <button
                            type="button"
                            aria-label="Close search"
                            onClick={() => setOpen(false)}
                            className="absolute inset-0 bg-navy-900/45 backdrop-blur-[2px]"
                        />
                        <div className="absolute left-1/2 top-[12vh] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 rounded-panel border border-line bg-white p-4 shadow-pop">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-[13px] font-bold text-ink">Search Admission Sathi</p>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Close search"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-muted"
                                >
                                    <X className="h-4 w-4" aria-hidden />
                                </button>
                            </div>
                            <SearchBox autoFocus onNavigate={() => setOpen(false)} />
                            <p className="mt-3 text-[11px] text-ink-soft">
                                Tip: press <kbd className="rounded border border-line bg-muted px-1">Esc</kbd> to close,{' '}
                                <kbd className="rounded border border-line bg-muted px-1">↑</kbd>{' '}
                                <kbd className="rounded border border-line bg-muted px-1">↓</kbd> to move,{' '}
                                <kbd className="rounded border border-line bg-muted px-1">Enter</kbd> to open.
                            </p>
                        </div>
                    </div>
                </Portal>
            ) : null}
        </>
    );
}
