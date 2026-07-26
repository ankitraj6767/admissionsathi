'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { signOutAction } from '@/actions/auth.actions';

export interface UserMenuActor {
    name: string;
    email: string;
    image?: string | null;
    isStaff: boolean;
}

const STUDENT_LINKS = [
    { label: 'My Dashboard', url: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Saved Colleges', url: '/dashboard/saved', icon: 'Bookmark' },
    { label: 'My Bookings', url: '/dashboard/bookings', icon: 'CalendarCheck' },
    { label: 'Predictor History', url: '/dashboard/predictions', icon: 'Target' },
    { label: 'Profile Settings', url: '/dashboard/profile', icon: 'Settings' },
];

export function UserMenu({ actor }: { actor: UserMenuActor | null }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    if (!actor) {
        return (
            <Link
                href="/login"
                className="hidden h-10 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[13px] font-semibold text-ink transition-colors hover:border-navy-200 hover:text-navy-700 lg:inline-flex"
            >
                <User className="h-4 w-4" aria-hidden />
                Login
            </Link>
        );
    }

    return (
        <div ref={ref} className="relative hidden lg:block">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line bg-white pl-1 pr-2 transition-colors hover:border-navy-200"
            >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                    {initials(actor.name)}
                </span>
                <span className="max-w-[92px] truncate text-[13px] font-semibold text-ink">
                    {actor.name.split(' ')[0]}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-ink-soft transition-transform', open && 'rotate-180')} aria-hidden />
            </button>

            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[248px] rounded-panel border border-line bg-white p-2 shadow-pop"
                >
                    <div className="border-b border-line px-2.5 pb-2.5">
                        <p className="truncate text-[13px] font-bold text-ink">{actor.name}</p>
                        <p className="truncate text-[11.5px] text-ink-soft">{actor.email}</p>
                    </div>

                    <div className="py-1">
                        {actor.isStaff ? (
                            <Link
                                href="/admin"
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-navy-700 hover:bg-navy-50"
                            >
                                <Icon name="Shield" className="h-4 w-4" />
                                Admin Dashboard
                            </Link>
                        ) : null}
                        {STUDENT_LINKS.map((link) => (
                            <Link
                                key={link.url}
                                href={link.url}
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-ink hover:bg-muted"
                            >
                                <Icon name={link.icon} className="h-4 w-4 text-ink-soft" />
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <form action={signOutAction} className="border-t border-line pt-1">
                        <button
                            type="submit"
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-red-alert hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" aria-hidden />
                            Sign out
                        </button>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
