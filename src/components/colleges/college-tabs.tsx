'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COLLEGE_TABS } from '@/config/constants';

/** Re-exported for existing importers; the list itself lives in config/constants. */
export { COLLEGE_TABS };

/** Horizontally scrollable tab bar for the college detail sub-routes. */
export function CollegeTabs({ base }: { base: string }) {
    const pathname = usePathname() ?? base;
    const active = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : '';

    return (
        <nav aria-label="College sections" className="mt-5 -mb-6 overflow-x-auto no-scrollbar">
            <ul className="flex min-w-max items-center gap-1 border-b border-white/10">
                {COLLEGE_TABS.map((tab) => {
                    const href = tab.segment ? `${base}/${tab.segment}` : base;
                    const isActive = active === tab.segment;
                    return (
                        <li key={tab.label}>
                            <Link
                                href={href}
                                aria-current={isActive ? 'page' : undefined}
                                className={`inline-flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-[12.5px] font-semibold transition-colors ${isActive ? 'border-orange text-white' : 'border-transparent text-white/65 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
