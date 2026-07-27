'use server';

import { revalidatePath } from 'next/cache';
import { invalidateTag } from '@/lib/revalidate';
import { moderateReviewSchema, reviewFormSchema } from '@/schemas/review.schema';
import { markReviewHelpful, moderateReview, submitReview } from '@/services/review.service';
import { getCurrentActor, requirePermission } from '@/lib/auth/session';
import { RATE_LIMITS, clientFingerprint, rateLimit } from '@/lib/rate-limit';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS } from '@/lib/cache';
import type { ActionResult } from '@/types/common';

/** Public review submission. Always lands in moderation. */
export async function submitReviewAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'review.submit' }, async () => {
        const data = reviewFormSchema.parse(input);
        if (data.website) return succeed({ id: 'ignored' }, 'Thanks! Your review is under moderation.');

        const limited = await rateLimit({ ...RATE_LIMITS.reviewCreate, identifier: data.email });
        if (!limited.success) {
            return fail('You have submitted several reviews recently. Try again later.', 'RATE_LIMITED');
        }

        const actor = await getCurrentActor();
        const { ipHash } = await clientFingerprint();

        const outcome = await submitReview({ ...data, userId: actor?.id, ipHash });

        if (outcome.status === 'college_not_found') throw new NotFoundError('College not found.');
        if (outcome.status === 'duplicate') {
            return fail('You have already reviewed this college in the last 30 days.', 'DUPLICATE');
        }

        await recordAudit({
            actor,
            action: 'review.submit',
            entity: 'Review',
            entityId: outcome.id,
            entityLabel: `${outcome.collegeName} — ${data.title}`,
            newValues: { collegeSlug: outcome.collegeSlug, overall: data.ratings.overall },
        });

        revalidatePath(`/colleges/${outcome.collegeSlug}/reviews`);
        return succeed(
            { id: outcome.id },
            'Thanks! Your review has been submitted and will appear after moderation.',
        );
    });
}

/** Admin moderation: approve / reject / hide / feature, then recompute ratings. */
export async function moderateReviewAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'review.moderate' }, async () => {
        const actor = await requirePermission('review.moderate');
        const data = moderateReviewSchema.parse(input);

        const review = await moderateReview({ ...data, moderatorId: actor.id });
        if (!review) throw new NotFoundError('Review not found.');

        await recordAudit({
            actor,
            action: 'review.moderate',
            entity: 'Review',
            entityId: review.id,
            entityLabel: review.title,
            previousValues: { moderationStatus: review.previousStatus },
            newValues: { moderationStatus: data.moderationStatus },
        });

        invalidateTag(CACHE_TAGS.reviews);
        revalidatePath(`/colleges/${review.collegeSlug}/reviews`);
        revalidatePath('/admin/reviews');

        return succeed({ id: review.id }, 'Review updated.');
    });
}

export async function markReviewHelpfulAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'review.helpful' }, async () => {
        await markReviewHelpful(id);
        return succeed({ id }, 'Thanks for the feedback.');
    });
}
