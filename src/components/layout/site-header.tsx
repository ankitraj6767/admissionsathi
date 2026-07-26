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
        <header>
            <UtilityBar settings={settings} />

            <HeaderShell>
                <div className="shell flex h-16 items-center justify-between gap-3">
                    <BrandLogo />

                    <DesktopNav items={items} />

                    <div className="flex items-center gap-2">
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
                            className="hidden h-10 items-center gap-2 rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_-12px_rgba(7,49,116,0.9)] transition-colors hover:bg-navy-800 md:inline-flex"
                        >
                            Book Free Counselling
                            <CalendarCheck className="h-4 w-4" aria-hidden />
                        </Link>

                        <MobileNav items={items} phone={phone} isAuthenticated={viewer.isAuthenticated} />
                    </div>
                </div>
            </HeaderShell>
        </header>
    );
}
