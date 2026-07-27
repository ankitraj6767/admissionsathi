import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { requireStaffPage } from '@/lib/auth/session';
import { getAdminBadgeCounts } from '@/services/admin/dashboard.service';
import { getSettings } from '@/services/settings.service';
import { resolveBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    const branding = resolveBranding(await getSettings());
    return {
        title: {
            default: `Admin — ${branding.name}`,
            template: `%s | ${branding.name} Admin`,
        },
        robots: { index: false, follow: false },
    };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const actor = await requireStaffPage();

    const [badges, settings] = await Promise.all([getAdminBadgeCounts(), getSettings()]);

    return (
        <AdminShell
            actor={{
                name: actor.name,
                email: actor.email,
                roles: actor.roles,
                permissions: actor.permissions,
            }}
            badges={badges}
            branding={resolveBranding(settings)}
        >
            {children}
        </AdminShell>
    );
}
