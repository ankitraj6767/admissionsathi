'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Portal } from '@/components/ui/portal';
import { BrandLogo } from './brand-logo';
import type { NavNode } from '@/services/navigation.service';
import type { BrandingConfig } from '@/lib/branding';

/** Mobile drawer navigation with accordion sub-menus and a locked body scroll. */
export function MobileNav({
    items,
    phone,
    isAuthenticated,
    isStaff,
    branding,
}: {
    items: NavNode[];
    phone?: string;
    isAuthenticated: boolean;
    isStaff: boolean;
    branding: BrandingConfig;
}) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white text-navy-700 xl:hidden"
            >
                <Menu className="h-5 w-5" aria-hidden />
            </button>

            {/*
             * Portalled to <body>. Declared inside the header, this overlay was
             * trapped by the header's `backdrop-blur-md` (a backdrop-filter makes
             * an element the containing block for fixed descendants), so
             * `fixed inset-0` covered only the header strip and the drawer body
             * was clipped to nothing.
             */}
            {open ? (
                <Portal>
                    <div className="fixed inset-0 z-[70] xl:hidden">
                        <button
                            type="button"
                            aria-label="Close menu"
                            onClick={() => setOpen(false)}
                            className="absolute inset-0 bg-navy-900/45 backdrop-blur-[2px]"
                        />
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Site menu"
                            className="absolute right-0 top-0 flex h-full w-[86vw] max-w-[380px] animate-[slideInRight_.24s_var(--ease-premium)] flex-col bg-white shadow-pop"
                        >
                            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
                                <BrandLogo showTagline={false} branding={branding} />
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Close menu"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-line text-ink"
                                >
                                    <X className="h-5 w-5" aria-hidden />
                                </button>
                            </div>

                            <nav aria-label="Mobile" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                                <ul className="space-y-1">
                                    {items.map((item) => {
                                        const hasChildren = item.children.length > 0;
                                        const isOpen = expanded === item.id;
                                        return (
                                            <li key={item.id}>
                                                {hasChildren ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpanded(isOpen ? null : item.id)}
                                                            aria-expanded={isOpen}
                                                            className="flex min-h-[46px] w-full items-center justify-between rounded-[10px] px-3 text-[14px] font-semibold text-ink hover:bg-muted"
                                                        >
                                                            {item.label}
                                                            <ChevronDown
                                                                className={cn(
                                                                    'h-4 w-4 text-ink-soft transition-transform',
                                                                    isOpen && 'rotate-180',
                                                                )}
                                                                aria-hidden
                                                            />
                                                        </button>
                                                        {isOpen ? (
                                                            <ul className="mb-1 ml-2 border-l border-line pl-2">
                                                                {item.children.map((child) => (
                                                                    <li key={child.id}>
                                                                        <Link
                                                                            href={child.url}
                                                                            className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium text-ink-soft hover:bg-muted hover:text-navy-700"
                                                                        >
                                                                            {child.icon ? (
                                                                                <Icon
                                                                                    name={child.icon}
                                                                                    className="h-4 w-4 shrink-0"
                                                                                />
                                                                            ) : null}
                                                                            <span className="truncate">{child.label}</span>
                                                                            {child.isNew ? (
                                                                                <span className="rounded-pill bg-orange-50 px-1.5 text-[9px] font-bold uppercase text-orange-700">
                                                                                    New
                                                                                </span>
                                                                            ) : null}
                                                                        </Link>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <Link
                                                        href={item.url}
                                                        className="flex min-h-[46px] items-center rounded-[10px] px-3 text-[14px] font-semibold text-ink hover:bg-muted"
                                                    >
                                                        {item.label}
                                                    </Link>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="mt-4 space-y-2 border-t border-line pt-4">
                                    <Button asChild variant="primary" full size="md">
                                        <Link href="/book-counselling">Book Free Counselling</Link>
                                    </Button>
                                    {isStaff ? (
                                        <Button asChild variant="navy" full size="md">
                                            <Link href="/admin">
                                                <Icon name="Shield" className="h-4 w-4" />
                                                Admin Dashboard
                                            </Link>
                                        </Button>
                                    ) : null}
                                    <Button asChild variant="outline" full size="md">
                                        <Link href={isAuthenticated ? '/dashboard' : '/login'}>
                                            {isAuthenticated ? (
                                                <>
                                                    <Icon name="LayoutDashboard" className="h-4 w-4" />
                                                    {isStaff ? 'User Dashboard' : 'My Dashboard'}
                                                </>
                                            ) : (
                                                'Login / Sign up'
                                            )}
                                        </Link>
                                    </Button>
                                    {phone ? (
                                        <a
                                            href={`tel:${phone.replace(/\s/g, '')}`}
                                            className="flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-green-50 text-[13px] font-bold text-green"
                                        >
                                            <Phone className="h-4 w-4" aria-hidden />
                                            {phone}
                                        </a>
                                    ) : null}
                                </div>
                            </nav>
                        </div>
                    </div>
                </Portal>
            ) : null}
        </>
    );
}
