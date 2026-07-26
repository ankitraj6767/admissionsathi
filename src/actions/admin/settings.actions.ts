'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { connectToDatabase } from '@/db/connect';
import { NavigationItem, NavigationMenu, SiteSetting } from '@/db/models/site.model';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS } from '@/lib/cache';
import { invalidateTags } from '@/lib/revalidate';
import { readSubmittedSettingValue } from '@/lib/settings-payload';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

/* -------------------------------- settings -------------------------------- */

const settingsUpdateSchema = z.object({
    values: z.record(z.string().min(1).max(120), z.unknown()),
});

/** Persists a batch of settings, coercing each value to its declared type. */
export async function updateSettingsAction(input: unknown): Promise<ActionResult<{ updated: number }>> {
    return runAction({ action: 'admin.settings.update' }, async () => {
        const actor = await requirePermission('settings.manage');
        const data = settingsUpdateSchema.parse(input);

        await connectToDatabase();

        // Read the bounded canonical definitions instead of trusting submitted
        // keys. This also lets the server accept payloads from already-open
        // versions of the old dotted-name form.
        const definitions = await SiteSetting.find({ isSecret: false }).limit(500).lean().exec();

        let updated = 0;
        const previous: Record<string, unknown> = {};
        const next: Record<string, unknown> = {};

        for (const definition of definitions) {
            const submitted = readSubmittedSettingValue(data.values, definition.key);
            if (!submitted.found) continue;

            const key = definition.key;
            const raw = submitted.value;

            let value: unknown = raw;
            if (definition.valueType === 'boolean') value = raw === true || raw === 'true' || raw === 'on';
            else if (definition.valueType === 'number') value = Number(raw);
            else if (definition.valueType === 'json' && typeof raw === 'string') {
                try {
                    value = JSON.parse(raw) as unknown;
                } catch {
                    return fail(`${definition.label} contains invalid JSON.`, 'VALIDATION', {
                        [key]: ['Invalid JSON'],
                    });
                }
            } else value = typeof raw === 'string' ? raw : String(raw ?? '');

            previous[key] = definition.value;
            next[key] = value;

            await SiteSetting.updateOne({ key }, { $set: { value, updatedBy: actor.id } }).exec();
            updated += 1;
        }

        if (updated === 0) {
            return fail('No editable settings were submitted.', 'VALIDATION');
        }

        await recordAudit({
            actor,
            action: 'settings.update',
            entity: 'SiteSetting',
            entityLabel: `${updated} settings`,
            previousValues: previous,
            newValues: next,
        });

        // Admin saves require read-after-write freshness. `revalidateTag(...,
        // 'max')` is stale-while-revalidate and can serve the old settings on
        // the first public request, so use the Server Action-only immediate API.
        updateTag(CACHE_TAGS.settings);
        updateTag(CACHE_TAGS.homepage);
        revalidatePath('/', 'layout');
        revalidatePath('/manifest.webmanifest');
        revalidatePath('/admin/settings');

        return succeed({ updated }, `${updated} setting(s) saved.`);
    });
}

/* ------------------------------- navigation ------------------------------- */

const navItemSchema = z.object({
    id: z.string().optional(),
    menuKey: z.string().min(1).max(40),
    parentId: z.string().optional().or(z.literal('')),
    label: z.string().trim().min(1).max(120),
    url: z.string().trim().min(1).max(400),
    icon: z.string().max(60).optional().or(z.literal('')),
    description: z.string().max(240).optional().or(z.literal('')),
    itemType: z.enum(['link', 'dropdown', 'mega', 'heading', 'button']).default('link'),
    columnGroup: z.string().max(80).optional().or(z.literal('')),
    badge: z.string().max(20).optional().or(z.literal('')),
    hasNewBadge: z.coerce.boolean().default(false),
    isFeatured: z.coerce.boolean().default(false),
    openInNewTab: z.coerce.boolean().default(false),
    visibility: z.enum(['public', 'authenticated', 'guest', 'staff']).default('public'),
    displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
    status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

function refreshNavigation() {
    invalidateTags([CACHE_TAGS.navigation]);
    revalidatePath('/', 'layout');
    revalidatePath('/admin/navigation');
}

export async function upsertNavigationItemAction(
    input: unknown,
): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'admin.navigation.upsert' }, async () => {
        const actor = await requirePermission('navigation.manage');
        const data = navItemSchema.parse(input);

        await connectToDatabase();
        const menu = await NavigationMenu.findOne({ key: data.menuKey }).lean().exec();
        if (!menu) throw new NotFoundError(`Menu ${data.menuKey} not found.`);

        const payload = {
            menu: menu._id,
            menuKey: data.menuKey,
            parent: data.parentId || null,
            label: data.label,
            url: data.url,
            icon: data.icon || undefined,
            description: data.description || undefined,
            itemType: data.itemType,
            columnGroup: data.columnGroup || undefined,
            badge: data.badge || undefined,
            hasNewBadge: data.hasNewBadge,
            isFeatured: data.isFeatured,
            openInNewTab: data.openInNewTab,
            visibility: data.visibility,
            displayOrder: data.displayOrder,
            status: data.status,
            updatedBy: actor.id,
        };

        let id = data.id;
        if (id) {
            await NavigationItem.updateOne({ _id: id }, { $set: payload }).exec();
        } else {
            const created = await NavigationItem.create({ ...payload, createdBy: actor.id });
            id = String(created._id);
        }

        await recordAudit({
            actor,
            action: data.id ? 'navigation.update' : 'navigation.create',
            entity: 'NavigationItem',
            entityId: id,
            entityLabel: `${data.menuKey}: ${data.label}`,
            newValues: { label: data.label, url: data.url, displayOrder: data.displayOrder },
        });

        refreshNavigation();
        return succeed({ id: id! }, 'Navigation item saved.');
    });
}

export async function deleteNavigationItemAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'admin.navigation.delete' }, async () => {
        const actor = await requirePermission('navigation.manage');
        await connectToDatabase();

        const item = await NavigationItem.findById(id).lean().exec();
        if (!item) throw new NotFoundError('Navigation item not found.');

        // Children would otherwise be orphaned.
        await NavigationItem.deleteMany({ parent: id }).exec();
        await NavigationItem.deleteOne({ _id: id }).exec();

        await recordAudit({
            actor,
            action: 'navigation.delete',
            entity: 'NavigationItem',
            entityId: id,
            entityLabel: `${item.menuKey}: ${item.label}`,
        });

        refreshNavigation();
        return succeed({ id }, 'Navigation item deleted.');
    });
}

export async function reorderNavigationAction(
    input: unknown,
): Promise<ActionResult<{ updated: number }>> {
    return runAction({ action: 'admin.navigation.reorder' }, async () => {
        const actor = await requirePermission('navigation.manage');
        const data = z
            .object({ items: z.array(z.object({ id: z.string(), displayOrder: z.number().int() })).max(500) })
            .parse(input);

        await connectToDatabase();
        await Promise.all(
            data.items.map((item) =>
                NavigationItem.updateOne(
                    { _id: item.id },
                    { $set: { displayOrder: item.displayOrder, updatedBy: actor.id } },
                ).exec(),
            ),
        );

        refreshNavigation();
        return succeed({ updated: data.items.length }, 'Order saved.');
    });
}
