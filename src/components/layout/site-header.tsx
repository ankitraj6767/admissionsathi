import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { HeaderShell } from './header-shell';
import { BrandLogo } from './brand-logo';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';
import { UtilityBar } from './utility-bar';
import { HeaderSearch } from '@/components/search/header-search';
import { filterNavForViewer, getMenu } from '@/services/navigation.service';
import { getSettings, readString } from '@/services/settings.service';
import { getCurrentActor } from '@/lib/auth/session';
import { isStaff } from '@/lib/auth/rbac';

/**
 * Public site header.
 * Navigation, logo and contact details all come from MongoDB so the admin can
 * change them without a deploy.
 */
export async function SiteHeader() {
    const [settings, headerMenu, actor] = await Promise.all([
        getSettings(),
        getMenu('header'),
        getCurrentActor(),
    ]);

    const viewer = {
        isAuthenticated: Boolean(actor),
        isStaff: isStaff(actor),
        permissions: actor?.permissions ?? [],
    };

    const items = filterNavForViewer(headerMenu, viewer);
    const phone = readString(settings, 'contact.phone', '');

    return (
        <header className="sticky top-0 z-50">
            <UtilityBar settings={settings} />

            <HeaderShell>
                <div className="header-shell flex h-16 items-center justify-between gap-3">
                    <BrandLogo />

                    <DesktopNav items={items} />

                    <div className="flex shrink-0 items-center gap-2">
                        <HeaderSearch />

                        <UserMenu
                            actor={
                                actor
                                    ? {
                                        name: actor.name,
                                        email: actor.email,
                                        image: actor.image,
                                        isStaff: viewer.isStaff,
                                    }
                                    : null
                            }
                        />

                        <Link
                            href="/book-counselling"
                            className="hidden h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-navy px-3.5 text-[12.5px] font-bold text-white shadow-[0_8px_18px_-12px_rgba(7,49,116,0.9)] transition-colors hover:bg-navy-800 min-[1440px]:inline-flex 2xl:px-4 2xl:text-[13px]"
                        >
                            Book Free Counselling
                            <CalendarCheck className="h-4 w-4" aria-hidden />
                        </Link>

                        <MobileNav
                            items={items}
                            phone={phone}
                            isAuthenticated={viewer.isAuthenticated}
                            isStaff={viewer.isStaff}
                        />
                    </div>
                </div>
            </HeaderShell>
        </header>
    );
}
