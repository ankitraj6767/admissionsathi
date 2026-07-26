'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { signOutAction } from '@/actions/auth.actions';
import { cn } from '@/lib/utils';

const LINKS = [
    { href: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    { href: '/dashboard/saved', label: 'Saved items', icon: 'Bookmark' },
    { href: '/dashboard/bookings', label: 'My bookings', icon: 'CalendarCheck' },
    { href: '/dashboard/predictions', label: 'Predictor history', icon: 'Target' },
    { href: '/dashboard/loans', label: 'Loan calculations', icon: 'Calculator' },
    { href: '/dashboard/notifications', label: 'Notifications', icon: 'BellRing' },
    { href: '/dashboard/profile', label: 'Profile & privacy', icon: 'Settings' },
];

export function DashboardNav() {
    const pathname = usePathname();

    return (
        <aside className="min-w-0 max-w-full lg:sticky lg:top-24 lg:self-start">
            <nav
                aria-label="Dashboard"
                className="w-full min-w-0 max-w-full overflow-hidden rounded-panel border border-line bg-white p-2 shadow-card"
            >
                <ul className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
                    {LINKS.map((link) => {
                        const active = pathname === link.href;
                        return (
                            <li key={link.href} className="shrink-0 lg:shrink">
                                <Link
                                    href={link.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-semibold transition-colors',
                                        active ? 'bg-navy text-white' : 'text-ink hover:bg-muted',
                                    )}
                                >
                                    <Icon name={link.icon} className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <form action={signOutAction} className="mt-1 hidden border-t border-line pt-1 lg:block">
                    <button
                        type="submit"
                        className="flex min-h-[40px] w-full items-center gap-2 rounded-[10px] px-3 text-[12.5px] font-semibold text-red-alert hover:bg-red-50"
                    >
                        <Icon name="LogOut" className="h-4 w-4" />
                        Sign out
                    </button>
                </form>
            </nav>
        </aside>
    );
}
