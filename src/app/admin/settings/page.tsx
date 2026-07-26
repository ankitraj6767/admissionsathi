import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SettingsForm, type SettingRow } from '@/components/admin/settings-form';
import { getAllSettings } from '@/db/repositories/settings.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'System settings' };

export default async function AdminSettingsPage() {
    await requirePermissionPage('settings.manage');
    const rows = toPlain(await getAllSettings());

    const settings: SettingRow[] = rows.map((row) => ({
        key: row.key,
        group: row.group,
        label: row.label,
        description: row.description,
        valueType: row.valueType,
        value: row.value,
        isSecret: row.isSecret,
    }));

    return (
        <>
            <AdminPageHeader
                title="System settings"
                description="Every editable value used across the public site — contact details, utility bar, WhatsApp panel, AI assistant, feature switches, SEO defaults and consent text."
                icon="Settings"
                breadcrumbs={[{ label: 'Settings' }]}
            />

            <SettingsForm settings={settings} />
        </>
    );
}
