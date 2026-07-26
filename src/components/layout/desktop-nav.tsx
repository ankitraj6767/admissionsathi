'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import type { NavNode } from '@/services/navigation.service';

function groupChildren(children: NavNode[]) {
    const groups = new Map<string, NavNode[]>();
    children.forEach((child) => {
        const key = child.columnGroup ?? '';
        groups.set(key, [...(groups.get(key) ?? []), child]);
    });
    return Array.from(groups.entries());
}

/** Desktop primary navigation with keyboard-accessible dropdowns and mega menus. */
export function DesktopNav({ items }: { items: NavNode[] }) {
    const pathname = usePathname();
    const [openId, setOpenId] = useState<string | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => setOpenId(null), [pathname]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenId(null);
        };
        const onClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClickOutside);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClickOutside);
        };
    }, []);

    const scheduleClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpenId(null), 160);
    };
    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };

    const isActive = (node: NavNode) => {
        if (node.url === '/') return pathname === '/';
        if (node.url === '#') return false;
        return pathname === node.url || pathname.startsWith(`${node.url}/`);
    };

    return (
        <nav ref={navRef} aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
            {items.map((item) => {
                const hasChildren = item.children.length > 0;
                const open = openId === item.id;
                const active = isActive(item) || item.children.some((c) => isActive(c));

                return (
                    <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={() => {
                            cancelClose();
                            if (hasChildren) setOpenId(item.id);
                        }}
                        onMouseLeave={scheduleClose}
                    >
                        {hasChildren ? (
                            <button
                                type="button"
                                aria-expanded={open}
                                aria-haspopup="true"
                                onClick={() => setOpenId(open ? null : item.id)}
                                className={cn(
                                    'flex h-16 items-center gap-1 px-2 text-[13px] font-semibold transition-colors 2xl:px-2.5 2xl:text-[13.5px]',
                                    active || open ? 'text-navy-700' : 'text-ink hover:text-navy-700',
                                )}
                            >
                                {item.label}
                                <ChevronDown
                                    className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
                                    aria-hidden
                                />
                                {active ? (
                                    <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-navy-700" aria-hidden />
                                ) : null}
                            </button>
                        ) : (
                            <Link
                                href={item.url}
                                className={cn(
                                    'relative flex h-16 items-center px-2 text-[13px] font-semibold transition-colors 2xl:px-2.5 2xl:text-[13.5px]',
                                    active ? 'text-navy-700' : 'text-ink hover:text-navy-700',
                                )}
                            >
                                {item.label}
                                {active ? (
                                    <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-navy-700" aria-hidden />
                                ) : null}
                            </Link>
                        )}

                        {hasChildren && open ? (
                            item.itemType === 'mega' ? (
                                <MegaPanel item={item} onNavigate={() => setOpenId(null)} />
                            ) : (
                                <DropdownPanel item={item} onNavigate={() => setOpenId(null)} />
                            )
                        ) : null}
                    </div>
                );
            })}
        </nav>
    );
}

function DropdownPanel({ item, onNavigate }: { item: NavNode; onNavigate: () => void }) {
    return (
        <div
            role="menu"
            aria-label={item.label}
            className="absolute left-0 top-full z-50 w-[272px] origin-top-left animate-[fadeIn_.16s_ease] rounded-panel border border-line bg-white p-2 shadow-pop"
        >
            {item.children.map((child) => (
                <Link
                    key={child.id}
                    href={child.url}
                    role="menuitem"
                    onClick={onNavigate}
                    target={child.openInNewTab ? '_blank' : undefined}
                    rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                    className={cn(
                        'flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-navy-50/70 hover:text-navy-700',
                        child.isFeatured && 'text-navy-700',
                    )}
                >
                    {child.icon ? <Icon name={child.icon} className="h-4 w-4 text-navy-600" /> : null}
                    <span className="flex-1 truncate">{child.label}</span>
                    {child.isNew ? (
                        <span className="rounded-pill bg-orange-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-orange-700">
                            New
                        </span>
                    ) : null}
                </Link>
            ))}
        </div>
    );
}

function MegaPanel({ item, onNavigate }: { item: NavNode; onNavigate: () => void }) {
    const groups = groupChildren(item.children);

    return (
        <div
            role="menu"
            aria-label={item.label}
            className="fixed left-1/2 top-[var(--mega-top,104px)] z-50 w-[min(1080px,calc(100vw-48px))] -translate-x-1/2 animate-[fadeIn_.18s_ease] rounded-panel border border-line bg-white p-5 shadow-pop"
            style={{ ['--mega-top' as string]: '104px' }}
        >
            <div
                className={cn(
                    'grid gap-x-6 gap-y-4',
                    groups.length >= 4 ? 'grid-cols-4' : groups.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
                )}
            >
                {groups.map(([groupName, children]) => (
                    <div key={groupName || 'default'}>
                        {groupName ? (
                            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-soft">
                                {groupName}
                            </p>
                        ) : null}
                        <ul className="space-y-0.5">
                            {children.map((child) => (
                                <li key={child.id}>
                                    <Link
                                        href={child.url}
                                        role="menuitem"
                                        onClick={onNavigate}
                                        className="group flex items-start gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-navy-50/70"
                                    >
                                        {child.icon ? (
                                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-navy-50 text-navy-700 group-hover:bg-white">
                                                <Icon name={child.icon} className="h-3.5 w-3.5" />
                                            </span>
                                        ) : null}
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-1.5">
                                                <span className="truncate text-[13px] font-semibold text-ink group-hover:text-navy-700">
                                                    {child.label}
                                                </span>
                                                {child.isNew ? (
                                                    <span className="rounded-pill bg-orange-50 px-1.5 text-[9px] font-bold uppercase text-orange-700">
                                                        New
                                                    </span>
                                                ) : null}
                                            </span>
                                            {child.description ? (
                                                <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">
                                                    {child.description}
                                                </span>
                                            ) : null}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <p className="text-[11.5px] text-ink-soft">
                    Not sure what to pick? Our counsellors help you shortlist for free.
                </p>
                <Link
                    href="/book-counselling"
                    onClick={onNavigate}
                    className="text-[12px] font-bold text-orange hover:underline"
                >
                    Book Free Counselling →
                </Link>
            </div>
        </div>
    );
}
