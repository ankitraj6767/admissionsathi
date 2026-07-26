import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { NavigationManager, type NavMenu } from '@/components/admin/navigation-manager';
import { SectionCard } from '@/components/shared/content-blocks';
import { connectToDatabase } from '@/db/connect';
import { NavigationItem, NavigationMenu } from '@/db/models/site.model';
import { toPlain } from '@/db/repositories/base.repository';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Navigation menus' };

export default async function AdminNavigationPage() {
    await requirePermissionPage('navigation.manage');
    await connectToDatabase();

    const [menus, items] = await Promise.all([
        NavigationMenu.find().sort({ location: 1, name: 1 }).lean().exec().then(toPlain),
        NavigationItem.find().sort({ displayOrder: 1 }).limit(600).lean().exec().then(toPlain),
    ]);

    const payload: NavMenu[] = menus.map((menu) => ({
        key: menu.key,
        name: menu.name,
        location: menu.location,
        items: items
            .filter((item) => item.menuKey === menu.key)
            .map((item) => ({
                id: String(item._id),
                parentId: item.parent ? String(item.parent) : null,
                label: item.label,
                url: item.url,
                icon: item.icon,
                description: item.description,
                itemType: item.itemType,
                columnGroup: item.columnGroup,
                badge: item.badge,
                hasNewBadge: Boolean(item.hasNewBadge),
                isFeatured: Boolean(item.isFeatured),
                openInNewTab: Boolean(item.openInNewTab),
                visibility: item.visibility,
                displayOrder: item.displayOrder,
                status: item.status,
            })),
    }));

    return (
        <>
            <AdminPageHeader
                title="Navigation menus"
                description="Header, mega menus, mobile drawer, footer columns, legal links and the utility bar — all editable here."
                icon="Link2"
                breadcrumbs={[{ label: 'Navigation' }]}
            />

            <NavigationManager menus={payload} />

            <SectionCard className="mt-4" title="Menu behaviour" icon="Info">
                <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                    <li>
                        <strong className="text-ink">mega</strong> renders a wide panel; children are grouped by the
                        mega-menu column value.
                    </li>
                    <li>
                        <strong className="text-ink">dropdown</strong> renders a simple list; icons are optional Lucide
                        names.
                    </li>
                    <li>
                        Visibility <strong className="text-ink">staff</strong> or a required permission hides the item from
                        students — enforced when the menu is built on the server.
                    </li>
                    <li>Footer top-level items act as column headings; their children become the column links.</li>
                </ul>
            </SectionCard>
        </>
    );
}
