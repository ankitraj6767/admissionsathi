'use server';

import { revalidatePath } from 'next/cache';
import {
    parseSectionConfig,
    reorderHomepageSectionsSchema,
    updateHomepageSectionSchema,
} from '@/schemas/homepage.schema';
import {
    publishSectionDraft,
    reorderHomepageSections,
    resetHomepageSection,
    saveHomepageSection,
    setHomepageSectionEnabled,
} from '@/services/homepage.service';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS } from '@/lib/cache';
import { invalidateTag } from '@/lib/revalidate';
import { NotFoundError, fail, runAction, succeed, zodFieldErrors } from '@/lib/action-helpers';
import type { HomepageSectionKey } from '@/config/constants';
import type { ActionResult } from '@/types/common';

function refreshHomepage() {
    invalidateTag(CACHE_TAGS.homepage);
    revalidatePath('/');
    revalidatePath('/admin/homepage');
}

/** Update copy + validated section config. `saveAsDraft` stores a preview version. */
export async function updateHomepageSectionAction(
    input: unknown,
): Promise<ActionResult<{ key: string }>> {
    return runAction({ action: 'admin.homepage.update' }, async () => {
        const actor = await requirePermission('homepage.manage');

        const parsed = updateHomepageSectionSchema.safeParse(input);
        if (!parsed.success) {
            return fail('Please correct the highlighted fields.', 'VALIDATION', zodFieldErrors(parsed.error));
        }
        const data = parsed.data;

        // Validate the section-specific config against its schema before writing.
        let config: Record<string, unknown> | undefined;
        if (data.config) {
            try {
                config = parseSectionConfig(
                    data.key as keyof typeof import('@/schemas/homepage.schema').HOMEPAGE_CONFIG_SCHEMAS,
                    data.config,
                ) as Record<string, unknown>;
            } catch (error) {
                return fail(
                    `Section configuration is invalid: ${error instanceof Error ? error.message.slice(0, 200) : 'unknown error'}`,
                    'VALIDATION',
                    { config: ['Invalid configuration'] },
                );
            }
        }

        const saved = await saveHomepageSection({
            key: data.key,
            isEnabled: data.isEnabled,
            heading: data.heading,
            subheading: data.subheading,
            description: data.description,
            ctaLabel: data.ctaLabel,
            ctaUrl: data.ctaUrl,
            config,
            saveAsDraft: data.saveAsDraft,
            actorId: actor.id,
        });

        await recordAudit({
            actor,
            action: data.saveAsDraft ? 'homepage.save_draft' : 'homepage.publish',
            entity: 'HomepageSection',
            entityId: data.key,
            entityLabel: saved.name,
            previousValues: saved.previous,
            newValues: { heading: data.heading, isEnabled: data.isEnabled },
        });

        refreshHomepage();

        return succeed(
            { key: data.key },
            data.saveAsDraft ? 'Draft saved. Preview it before publishing.' : 'Section published.',
        );
    });
}

/** Drag-and-drop reordering. */
export async function reorderHomepageSectionsAction(
    input: unknown,
): Promise<ActionResult<{ order: string[] }>> {
    return runAction({ action: 'admin.homepage.reorder' }, async () => {
        const actor = await requirePermission('homepage.manage');
        const data = reorderHomepageSectionsSchema.parse(input);

        await reorderHomepageSections([...data.order], actor.id);

        await recordAudit({
            actor,
            action: 'homepage.reorder',
            entity: 'HomepageSection',
            newValues: { order: data.order },
        });

        refreshHomepage();
        return succeed({ order: [...data.order] }, 'Section order saved.');
    });
}

export async function toggleHomepageSectionAction(
    key: HomepageSectionKey,
    isEnabled: boolean,
): Promise<ActionResult<{ key: string }>> {
    return runAction({ action: 'admin.homepage.toggle' }, async () => {
        const actor = await requirePermission('homepage.manage');

        await setHomepageSectionEnabled(key, isEnabled, actor.id);

        await recordAudit({
            actor,
            action: 'homepage.toggle',
            entity: 'HomepageSection',
            entityId: key,
            newValues: { isEnabled },
        });

        refreshHomepage();
        return succeed({ key }, isEnabled ? 'Section enabled.' : 'Section disabled.');
    });
}

/** Publishes a saved draft config. */
export async function publishHomepageDraftAction(
    key: HomepageSectionKey,
): Promise<ActionResult<{ key: string }>> {
    return runAction({ action: 'admin.homepage.publish_draft' }, async () => {
        const actor = await requirePermission('homepage.manage');

        const outcome = await publishSectionDraft(key, actor.id);
        if (outcome === 'not_found') throw new NotFoundError('Section not found.');
        if (outcome === 'no_draft') {
            return fail('There is no draft to publish for this section.', 'CONFLICT');
        }

        await recordAudit({
            actor,
            action: 'homepage.publish_draft',
            entity: 'HomepageSection',
            entityId: key,
        });

        refreshHomepage();
        return succeed({ key }, 'Draft published to the live homepage.');
    });
}

export async function resetHomepageSectionAction(
    key: HomepageSectionKey,
): Promise<ActionResult<{ key: string }>> {
    return runAction({ action: 'admin.homepage.reset' }, async () => {
        const actor = await requirePermission('homepage.manage');

        const reset = await resetHomepageSection(key, actor.id);
        if (!reset) throw new NotFoundError('Unknown section.');

        await recordAudit({ actor, action: 'homepage.reset', entity: 'HomepageSection', entityId: key });

        refreshHomepage();
        return succeed({ key }, 'Section reset to the default configuration.');
    });
}
