'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { saveSettings } from '@/services/settings.service';
import {
    removeNavigationItem,
    reorderNavigationItems,
    saveNavigationItem,
} from '@/services/navigation.service';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS } from '@/lib/cache';
import { invalidateTags } from '@/lib/revalidate';
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

        // The service reads the bounded canonical definitions instead of trusting
        // submitted keys. That also lets the server accept payloads from
        // already-open versions of the old dotted-name form.
        const result = await saveSettings(data.values, actor.id);

        if (!result.ok) {
            return fail(`${result.label} contains invalid JSON.`, 'VALIDATION', {
                [result.key]: ['Invalid JSON'],
            });
        }

        if (result.updated === 0) {
            return fail('No editable settings were submitted.', 'VALIDATION');
        }

        await recordAudit({
            actor,
            action: 'settings.update',
            entity: 'SiteSetting',
            entityLabel: `${result.updated} settings`,
            previousValues: result.previous,
            newValues: result.next,
        });

        // Admin saves require read-after-write freshness. `revalidateTag(...,
        // 'max')` is stale-while-revalidate and can serve the old settings on
        // the first public request, so use the Server Action-only immediate API.
        updateTag(CACHE_TAGS.settings);
        updateTag(CACHE_TAGS.homepage);
        revalidatePath('/', 'layout');
        revalidatePath('/manifest.webmanifest');
        revalidatePath('/admin/settings');

        return succeed({ updated: result.updated }, `${result.updated} setting(s) saved.`);
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

        const saved = await saveNavigationItem({ ...data, actorId: actor.id });
        if (!saved) throw new NotFoundError(`Menu ${data.menuKey} not found.`);

        await recordAudit({
            actor,
            action: data.id ? 'navigation.update' : 'navigation.create',
            entity: 'NavigationItem',
            entityId: saved.id,
            entityLabel: `${data.menuKey}: ${data.label}`,
            newValues: { label: data.label, url: data.url, displayOrder: data.displayOrder },
        });

        refreshNavigation();
        return succeed({ id: saved.id }, 'Navigation item saved.');
    });
}

export async function deleteNavigationItemAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'admin.navigation.delete' }, async () => {
        const actor = await requirePermission('navigation.manage');

        // Children are removed with the parent so nothing is orphaned.
        const removed = await removeNavigationItem(id);
        if (!removed) throw new NotFoundError('Navigation item not found.');

        await recordAudit({
            actor,
            action: 'navigation.delete',
            entity: 'NavigationItem',
            entityId: id,
            entityLabel: `${removed.menuKey}: ${removed.label}`,
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

        const updated = await reorderNavigationItems(data.items, actor.id);

        refreshNavigation();
        return succeed({ updated }, 'Order saved.');
    });
}
