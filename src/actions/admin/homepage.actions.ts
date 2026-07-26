'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/db/connect';
import { HomepageSection } from '@/db/models/site.model';
import {
    parseSectionConfig,
    reorderHomepageSectionsSchema,
    updateHomepageSectionSchema,
} from '@/schemas/homepage.schema';
import { HOMEPAGE_DRAFT_MAP } from '@/config/homepage-defaults';
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

        await connectToDatabase();

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

        const draft = HOMEPAGE_DRAFT_MAP[data.key];
        const previous = await HomepageSection.findOne({ key: data.key }).lean().exec();

        const update: Record<string, unknown> = {
            name: previous?.name ?? draft?.name ?? data.key,
            updatedBy: actor.id,
        };
        if (data.isEnabled !== undefined) update.isEnabled = data.isEnabled;
        if (data.heading !== undefined) update.heading = data.heading;
        if (data.subheading !== undefined) update.subheading = data.subheading;
        if (data.description !== undefined) update.description = data.description;
        if (data.ctaLabel !== undefined) update.ctaLabel = data.ctaLabel;
        if (data.ctaUrl !== undefined) update.ctaUrl = data.ctaUrl;

        if (config) {
            if (data.saveAsDraft) {
                update.draftConfig = config;
                update.hasUnpublishedChanges = true;
            } else {
                update.config = config;
                update.draftConfig = undefined;
                update.hasUnpublishedChanges = false;
                update.publishedAt = new Date();
            }
        }

        await HomepageSection.updateOne(
            { key: data.key },
            { $set: update, $setOnInsert: { displayOrder: draft?.displayOrder ?? 99, key: data.key } },
            { upsert: true },
        ).exec();

        await recordAudit({
            actor,
            action: data.saveAsDraft ? 'homepage.save_draft' : 'homepage.publish',
            entity: 'HomepageSection',
            entityId: data.key,
            entityLabel: update.name as string,
            previousValues: previous
                ? { heading: previous.heading, isEnabled: previous.isEnabled }
                : undefined,
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

        await connectToDatabase();

        await Promise.all(
            data.order.map((key, index) =>
                HomepageSection.updateOne(
                    { key },
                    { $set: { displayOrder: (index + 1) * 10, updatedBy: actor.id }, $setOnInsert: { key } },
                    { upsert: true },
                ).exec(),
            ),
        );

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
        await connectToDatabase();

        const draft = HOMEPAGE_DRAFT_MAP[key];
        await HomepageSection.updateOne(
            { key },
            {
                $set: { isEnabled, updatedBy: actor.id },
                $setOnInsert: { key, name: draft?.name ?? key, displayOrder: draft?.displayOrder ?? 99 },
            },
            { upsert: true },
        ).exec();

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
        await connectToDatabase();

        const section = await HomepageSection.findOne({ key }).exec();
        if (!section) throw new NotFoundError('Section not found.');
        if (!section.draftConfig) return fail('There is no draft to publish for this section.', 'CONFLICT');

        section.config = section.draftConfig;
        section.draftConfig = undefined;
        section.hasUnpublishedChanges = false;
        section.publishedAt = new Date();
        section.updatedBy = actor.id as never;
        await section.save();

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
        const draft = HOMEPAGE_DRAFT_MAP[key];
        if (!draft) throw new NotFoundError('Unknown section.');

        await connectToDatabase();
        await HomepageSection.updateOne(
            { key },
            {
                $set: {
                    name: draft.name,
                    isEnabled: draft.isEnabled,
                    displayOrder: draft.displayOrder,
                    heading: draft.heading,
                    subheading: draft.subheading,
                    description: draft.description,
                    ctaLabel: draft.ctaLabel,
                    ctaUrl: draft.ctaUrl,
                    config: draft.config,
                    draftConfig: undefined,
                    hasUnpublishedChanges: false,
                    updatedBy: actor.id,
                },
            },
            { upsert: true },
        ).exec();

        await recordAudit({ actor, action: 'homepage.reset', entity: 'HomepageSection', entityId: key });

        refreshHomepage();
        return succeed({ key }, 'Section reset to the default configuration.');
    });
}
