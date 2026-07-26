'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Menu, X } from 'lucide-react';
import { ADMIN_NAV } from '@/config/admin-nav';
import { Icon } from '@/components/ui/icon';
import { BrandLogo } from '@/components/layout/brand-logo';
import { signOutAction } from '@/actions/auth.actions';
import { cn, initials } from '@/lib/utils';

export interface AdminShellProps {
    actor: { name: string; email: string; roles: string[]; permissions: string[] };
    badges: { newLeads: number; pendingReviews: number; draftContent: number };
    children: React.ReactNode;
}

/** Collapsible admin sidebar + topbar. Nav items are permission-filtered. */
export function AdminShell({ actor, badges, children }: AdminShellProps) {
    const pathname = usePathname() ?? '/admin';
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => setMobileOpen(false), [pathname]);

    useEffect(() => {
        const stored = window.localStorage.getItem('as_admin_sidebar');
        if (stored === 'collapsed') setCollapsed(true);
    }, []);

    const toggleCollapsed = () => {
        setCollapsed((value) => {
            window.localStorage.setItem('as_admin_sidebar', value ? 'expanded' : 'collapsed');
            return !value;
        });
    };

    const canSee = (permission?: string) => !permission || actor.permissions.includes(permission);

    const groups = ADMIN_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => canSee(item.permission)),
    })).filter((group) => group.items.length > 0);

    const sidebar = (
        <nav aria-label="Admin" className="flex h-full flex-col">
            <div className={cn('flex items-center gap-2 border-b border-navy-900/50 px-3 py-3', collapsed && 'justify-center')}>
                {collapsed ? (
                    <Link href="/admin" aria-label="Admin home" className="text-white">
                        <Icon name="Shield" className="h-6 w-6" />
                    </Link>
                ) : (
                    <BrandLogo variant="dark" showTagline={false} href="/admin" />
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3">
                {groups.map((group) => (
                    <div key={group.label} className="mb-3">
                        {!collapsed ? (
                            <p className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-wider text-white/40">
                                {group.label}
                            </p>
                        ) : null}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                const badge = item.badgeKey ? badges[item.badgeKey] : 0;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            aria-current={active ? 'page' : undefined}
                                            title={collapsed ? item.label : undefined}
                                            className={cn(
                                                'flex min-h-[36px] items-center gap-2.5 rounded-[9px] px-2.5 text-[12.5px] font-medium transition-colors',
                                                active ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white',
                                                collapsed && 'justify-center px-0',
                                            )}
                                        >
                                            <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                                            {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                                            {!collapsed && badge > 0 ? (
                                                <span className="rounded-pill bg-orange px-1.5 text-[9.5px] font-bold text-white">
                                                    {badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="border-t border-navy-900/50 p-2">
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    className="hidden w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-[12px] font-semibold text-white/60 hover:bg-white/8 hover:text-white lg:flex"
                >
                    <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} aria-hidden />
                    {!collapsed ? 'Collapse' : null}
                </button>
            </div>
        </nav>
    );

    return (
        <div className="min-h-dvh bg-page">
            {/* Desktop sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 hidden bg-navy-800 lg:block',
                    collapsed ? 'w-[62px]' : 'w-[228px]',
                )}
            >
                {sidebar}
            </aside>

            {/* Mobile drawer */}
            {mobileOpen ? (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-navy-900/50"
                    />
                    <div className="absolute inset-y-0 left-0 w-[248px] animate-[slideInRight_.2s_var(--ease-premium)] bg-navy-800">
                        {sidebar}
                    </div>
                </div>
            ) : null}

            <div className={cn('flex min-h-dvh flex-col', collapsed ? 'lg:pl-[62px]' : 'lg:pl-[228px]')}>
                {/* Topbar */}
                <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
                    <div className="flex h-14 items-center gap-3 px-3 md:px-5">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open admin menu"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line lg:hidden"
                        >
                            <Menu className="h-4 w-4" aria-hidden />
                        </button>

                        <form action="/admin/search" className="hidden max-w-sm flex-1 md:block">
                            <label htmlFor="admin-search" className="sr-only">
                                Search admin
                            </label>
                            <div className="relative">
                                <Icon
                                    name="Search"
                                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
                                />
                                <input
                                    id="admin-search"
                                    name="q"
                                    placeholder="Search colleges, leads, articles…"
                                    className="h-9 w-full rounded-[9px] border border-line bg-page pl-9 pr-3 text-[12.5px] outline-none focus:border-navy-300"
                                />
                            </div>
                        </form>

                        <div className="ml-auto flex items-center gap-2">
                            <Link
                                href="/"
                                aria-label="Go to public website"
                                title="Go to public website"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line text-ink hover:border-navy-200 sm:hidden"
                            >
                                <Icon name="ExternalLink" className="h-3.5 w-3.5" />
                            </Link>

                            <Link
                                href="/"
                                target="_blank"
                                className="hidden h-9 items-center gap-1.5 rounded-[9px] border border-line px-3 text-[12px] font-semibold text-ink hover:border-navy-200 sm:inline-flex"
                            >
                                <Icon name="ExternalLink" className="h-3.5 w-3.5" />
                                View site
                            </Link>

                            <Link
                                href="/admin/notifications"
                                className="relative inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line text-ink-soft hover:text-navy-700"
                                aria-label="Notifications"
                            >
                                <Icon name="BellRing" className="h-4 w-4" />
                                {badges.newLeads > 0 ? (
                                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[9px] font-bold text-white">
                                        {badges.newLeads}
                                    </span>
                                ) : null}
                            </Link>

                            <div className="flex items-center gap-2 rounded-[9px] border border-line px-2 py-1">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[10.5px] font-bold text-white">
                                    {initials(actor.name)}
                                </span>
                                <span className="hidden leading-tight sm:block">
                                    <span className="block max-w-[120px] truncate text-[12px] font-bold text-ink">
                                        {actor.name}
                                    </span>
                                    <span className="block text-[10px] text-ink-soft">{actor.roles[0]?.replace('_', ' ')}</span>
                                </span>
                                <form action={signOutAction}>
                                    <button
                                        type="submit"
                                        aria-label="Sign out"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-soft hover:bg-red-50 hover:text-red-alert"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-3 py-4 md:px-5 md:py-6">{children}</main>
            </div>
        </div>
    );
}
