import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { HomepageBuilder, type BuilderSection } from '@/components/admin/homepage-builder';
import { SectionCard } from '@/components/shared/content-blocks';
import { getHomepageSectionRows } from '@/services/homepage.service';
import { requirePermissionPage } from '@/lib/auth/session';
import type { HomepageSectionKey } from '@/config/constants';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Homepage builder' };

export default async function AdminHomepagePage() {
    await requirePermissionPage('homepage.manage');
    const rows = await getHomepageSectionRows();

    const sections: BuilderSection[] = rows
        .map((row) => ({
            key: row.key as HomepageSectionKey,
            name: row.name,
            isEnabled: row.isEnabled,
            displayOrder: row.displayOrder,
            heading: row.heading,
            subheading: row.subheading,
            description: row.description,
            ctaLabel: row.ctaLabel,
            ctaUrl: row.ctaUrl,
            config: (row.config ?? {}) as Record<string, unknown>,
            hasUnpublishedChanges: Boolean(row.hasUnpublishedChanges),
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder);

    return (
        <>
            <AdminPageHeader
                title="Homepage builder"
                description="Enable, reorder and edit every homepage section. Content, headings, CTAs, featured selections and statistics all come from here."
                icon="Home"
                breadcrumbs={[{ label: 'Homepage builder' }]}
            />

            <HomepageBuilder sections={sections} />

            <SectionCard className="mt-4" title="How sections resolve" icon="Info">
                <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                    <li>
                        Each section has a stable key (<code className="font-mono text-[11.5px]">hero</code>,{' '}
                        <code className="font-mono text-[11.5px]">top_courses</code>, …) and a schema-validated config.
                    </li>
                    <li>
                        Featured content selections accept slugs. Leave the array empty to fall back to automatic
                        selection (featured flag + display order).
                    </li>
                    <li>Disabled sections are skipped entirely — no empty gaps on the live page.</li>
                    <li>Saving publishes immediately; “Save as draft” stores a preview version instead.</li>
                </ul>
            </SectionCard>
        </>
    );
}
