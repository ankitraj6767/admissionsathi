import { HeaderShell } from './header-shell';
import { HeaderNavigation } from './header-navigation';
import { UtilityBar } from './utility-bar';
import { AuthSessionProvider } from '@/components/auth/session-provider';
import { getMenu } from '@/services/navigation.service';
import { getSettings, readString } from '@/services/settings.service';
import { resolveBranding } from '@/lib/branding';

/**
 * Public site header.
 * Navigation, logo and contact details all come from MongoDB so the admin can
 * change them without a deploy.
 */
export async function SiteHeader() {
    const [settings, headerMenu] = await Promise.all([
        getSettings(),
        getMenu('header'),
    ]);
    const phone = readString(settings, 'contact.phone', '');
    const branding = resolveBranding(settings);

    return (
        <header className="sticky top-0 z-50">
            <UtilityBar settings={settings} />

            <HeaderShell>
                <AuthSessionProvider>
                    <HeaderNavigation items={headerMenu} phone={phone} branding={branding} />
                </AuthSessionProvider>
            </HeaderShell>
        </header>
    );
}
