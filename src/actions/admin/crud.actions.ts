'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ADMIN_RESOURCES, getAdminResource } from '@/config/admin-resources';
import type { Permission } from '@/config/permissions';
import {
    bulkUpdateStatus,
    buildResourceSchema,
    createResourceDoc,
    deleteResourceDoc,
    getReferenceOptions,
    restoreResourceDoc,
    updateResourceDoc,
} from '@/services/admin/crud.service';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { NotFoundError, fail, runAction, succeed, zodFieldErrors } from '@/lib/action-helpers';
import { invalidateTags } from '@/lib/revalidate';
import { CACHE_TAGS } from '@/lib/cache';
import type { ActionResult } from '@/types/common';

/**
 * Models reachable only through a reference picker (no `/admin/[resource]` screen).
 * Anything not listed here and not in ADMIN_RESOURCES cannot be enumerated.
 */
const REFERENCE_ONLY_PERMISSIONS: Record<string, Permission | undefined> = {
    State: 'college.read',
    City: 'college.read',
    CourseCategory: 'course.read',
    Specialization: 'course.read',
    CollegeCourse: 'college.read',
    Role: 'users.read',
    MediaAsset: 'media.read',
};

function resourceOrThrow(key: string) {
    const resource = getAdminResource(key);
    if (!resource) throw new NotFoundError(`Unknown admin resource: ${key}`);
    return resource;
}

function revalidateResource(key: string, tags?: string[]) {
    revalidatePath(`/admin/${key}`);
    // `adminCounts` covers the cached sidebar badges, dashboard tiles and listing
    // status chips, so a write is reflected in them immediately instead of after
    // their short TTL expires.
    invalidateTags([...(tags ?? []), CACHE_TAGS.adminCounts]);
}

/** Create a document for any registered admin resource. */
export async function createResourceAction(
    resourceKey: string,
    values: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: `admin.${resourceKey}.create` }, async () => {
        const resource = resourceOrThrow(resourceKey);
        const actor = await requirePermission(resource.permissions.create);

        const parsed = buildResourceSchema(resource).safeParse(values);
        if (!parsed.success) {
            return fail('Please correct the highlighted fields.', 'VALIDATION', zodFieldErrors(parsed.error));
        }

        const { id, label } = await createResourceDoc(resource, parsed.data, actor.id);

        await recordAudit({
            actor,
            action: `${resource.model}.create`,
            entity: resource.model,
            entityId: id,
            entityLabel: label,
            newValues: parsed.data as Record<string, unknown>,
        });

        revalidateResource(resourceKey, resource.revalidateTags);
        return succeed({ id }, `${resource.labelSingular} created.`);
    });
}

/** Update a document for any registered admin resource. */
export async function updateResourceAction(
    resourceKey: string,
    id: string,
    values: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: `admin.${resourceKey}.update`, context: { id } }, async () => {
        const resource = resourceOrThrow(resourceKey);
        const actor = await requirePermission(resource.permissions.update);

        const parsed = buildResourceSchema(resource).safeParse(values);
        if (!parsed.success) {
            return fail('Please correct the highlighted fields.', 'VALIDATION', zodFieldErrors(parsed.error));
        }

        const { label, previous } = await updateResourceDoc(resource, id, parsed.data, actor.id);

        const changedKeys = Object.keys(parsed.data).filter(
            (key) => JSON.stringify(previous[key]) !== JSON.stringify((parsed.data as Record<string, unknown>)[key]),
        );

        await recordAudit({
            actor,
            action: `${resource.model}.update`,
            entity: resource.model,
            entityId: id,
            entityLabel: label,
            previousValues: Object.fromEntries(changedKeys.map((key) => [key, previous[key]])),
            newValues: Object.fromEntries(
                changedKeys.map((key) => [key, (parsed.data as Record<string, unknown>)[key]]),
            ),
        });

        revalidateResource(resourceKey, resource.revalidateTags);
        revalidatePath(`/admin/${resourceKey}/${id}`);
        if (resource.publicPath) revalidatePath(resource.publicPath(previous));

        return succeed({ id }, `${resource.labelSingular} updated.`);
    });
}

export async function deleteResourceAction(
    resourceKey: string,
    id: string,
): Promise<ActionResult<{ id: string; softDeleted: boolean }>> {
    return runAction({ action: `admin.${resourceKey}.delete`, context: { id } }, async () => {
        const resource = resourceOrThrow(resourceKey);
        const actor = await requirePermission(resource.permissions.delete);

        const result = await deleteResourceDoc(resource, id, actor.id);

        await recordAudit({
            actor,
            action: `${resource.model}.${result.softDeleted ? 'soft_delete' : 'delete'}`,
            entity: resource.model,
            entityId: id,
            entityLabel: result.label,
        });

        revalidateResource(resourceKey, resource.revalidateTags);
        return succeed(
            { id, softDeleted: result.softDeleted },
            result.softDeleted
                ? `${resource.labelSingular} archived. It can be restored from the archive filter.`
                : `${resource.labelSingular} deleted.`,
        );
    });
}

export async function restoreResourceAction(
    resourceKey: string,
    id: string,
): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: `admin.${resourceKey}.restore`, context: { id } }, async () => {
        const resource = resourceOrThrow(resourceKey);
        const actor = await requirePermission(resource.permissions.update);

        await restoreResourceDoc(resource, id);
        await recordAudit({
            actor,
            action: `${resource.model}.restore`,
            entity: resource.model,
            entityId: id,
        });

        revalidateResource(resourceKey, resource.revalidateTags);
        return succeed({ id }, `${resource.labelSingular} restored.`);
    });
}

const bulkSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    status: z.string().min(1).max(40),
});

export async function bulkStatusAction(
    resourceKey: string,
    input: unknown,
): Promise<ActionResult<{ updated: number }>> {
    return runAction({ action: `admin.${resourceKey}.bulk_status` }, async () => {
        const resource = resourceOrThrow(resourceKey);
        const actor = await requirePermission(resource.permissions.update);
        const data = bulkSchema.parse(input);

        const updated = await bulkUpdateStatus(resource, data.ids, data.status, actor.id);

        await recordAudit({
            actor,
            action: `${resource.model}.bulk_status`,
            entity: resource.model,
            entityLabel: `${updated} records`,
            newValues: { status: data.status, ids: data.ids.length },
        });

        revalidateResource(resourceKey, resource.revalidateTags);
        return succeed({ updated }, `${updated} record(s) updated.`);
    });
}

/**
 * Used by the reference picker inputs.
 *
 * The guard is derived from whichever resource owns `refModel`, so a user who
 * can only manage exams cannot enumerate the lead or user collections through a
 * picker. An unregistered model is refused outright rather than defaulting to a
 * permissive check.
 */
export async function searchReferenceAction(
    refModel: string,
    labelField: string,
    search: string,
): Promise<ActionResult<{ options: { label: string; value: string }[] }>> {
    return runAction({ action: 'admin.reference.search', context: { refModel } }, async () => {
        const owner = Object.values(ADMIN_RESOURCES).find((resource) => resource.model === refModel);

        if (owner) {
            await requirePermission(owner.permissions.read);
        } else if (REFERENCE_ONLY_PERMISSIONS[refModel]) {
            // Taxonomy models that have no admin CRUD screen of their own.
            await requirePermission(REFERENCE_ONLY_PERMISSIONS[refModel]!);
        } else {
            throw new NotFoundError(`Unknown reference model: ${refModel}`);
        }

        const options = await getReferenceOptions(refModel, labelField, search);
        return succeed({ options });
    });
}
