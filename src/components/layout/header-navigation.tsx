'use client';

import { CalendarCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { isStaff } from '@/lib/auth/rbac';
import type { BrandingConfig } from '@/lib/branding';
import { filterNavForViewer, type NavNode } from '@/types/navigation';
import { HeaderSearch } from '@/components/search/header-search';
import { IntentLink as Link } from '@/components/ui/intent-link';
import { BrandLogo } from './brand-logo';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

export function HeaderNavigation({
    items,
    phone,
    branding,
}: {
    items: NavNode[];
    phone: string;
    branding: BrandingConfig;
}) {
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated';
    const roles = session?.user?.roles ?? [];
    const viewerIsStaff = isAuthenticated && isStaff({ roles });
    const viewer = {
        isAuthenticated,
        isStaff: viewerIsStaff,
        permissions: isAuthenticated ? session?.user?.permissions ?? [] : [],
    };
    const visibleItems = filterNavForViewer(items, viewer);
    const actor = isAuthenticated && session?.user
        ? {
            name: session.user.name ?? session.user.email?.split('@')[0] ?? 'User',
            email: session.user.email ?? '',
            image: session.user.image,
            isStaff: viewerIsStaff,
        }
        : null;

    return (
        <div className="header-shell flex h-16 items-center justify-between gap-3">
            <BrandLogo branding={branding} />

            <DesktopNav items={visibleItems} />

            <div className="flex shrink-0 items-center gap-2">
                <HeaderSearch />

                <UserMenu actor={actor} isLoading={status === 'loading'} />

                <Link
                    href="/book-counselling"
                    className="hidden h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-navy px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_18px_-12px_rgba(7,49,116,0.9)] transition-colors hover:bg-navy-800 min-[1440px]:inline-flex 2xl:px-4 2xl:text-[13px]"
                >
                    Book Free Counselling
                    <CalendarCheck className="h-4 w-4" aria-hidden />
                </Link>

                <MobileNav
                    items={visibleItems}
                    phone={phone}
                    isAuthenticated={isAuthenticated}
                    isStaff={viewerIsStaff}
                    isSessionLoading={status === 'loading'}
                    branding={branding}
                />
            </div>
        </div>
    );
}
