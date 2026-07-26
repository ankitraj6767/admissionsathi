'use server';

import { revalidatePath } from 'next/cache';
import { invalidateTag } from '@/lib/revalidate';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import { College } from '@/db/models/college.model';
import { Review } from '@/db/models/content.model';
import { moderateReviewSchema, reviewFormSchema } from '@/schemas/review.schema';
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

        await connectToDatabase();
        const college = await College.findById(data.collegeId).select('name slug').lean().exec();
        if (!college) throw new NotFoundError('College not found.');

        const actor = await getCurrentActor();
        const { ipHash } = await clientFingerprint();

        const duplicate = await Review.findOne({
            college: college._id,
            email: data.email,
            createdAt: { $gte: new Date(Date.now() - 30 * 86_400_000) },
        })
            .select('_id')
            .lean()
            .exec();

        if (duplicate) {
            return fail('You have already reviewed this college in the last 30 days.', 'DUPLICATE');
        }

        const review = await Review.create({
            college: college._id,
            collegeName: college.name,
            collegeSlug: college.slug,
            user: actor?.id,
            authorName: data.isAnonymous ? 'Anonymous student' : data.authorName,
            isAnonymous: data.isAnonymous,
            email: data.email,
            courseName: data.courseName || undefined,
            passingYear: data.passingYear,
            title: data.title,
            reviewText: data.reviewText,
            pros: data.pros || undefined,
            cons: data.cons || undefined,
            ratings: data.ratings,
            verificationStatus: actor ? 'email_verified' : 'unverified',
            moderationStatus: 'pending',
            ipHash,
            createdBy: actor?.id,
        });

        await recordAudit({
            actor,
            action: 'review.submit',
            entity: 'Review',
            entityId: String(review._id),
            entityLabel: `${college.name} — ${data.title}`,
            newValues: { collegeSlug: college.slug, overall: data.ratings.overall },
        });

        revalidatePath(`/colleges/${college.slug}/reviews`);
        return succeed(
            { id: String(review._id) },
            'Thanks! Your review has been submitted and will appear after moderation.',
        );
    });
}

/** Admin moderation: approve / reject / hide / feature, then recompute ratings. */
export async function moderateReviewAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'review.moderate' }, async () => {
        const actor = await requirePermission('review.moderate');
        const data = moderateReviewSchema.parse(input);

        await connectToDatabase();
        const review = await Review.findById(data.id).exec();
        if (!review) throw new NotFoundError('Review not found.');

        const previous = review.moderationStatus;
        review.moderationStatus = data.moderationStatus;
        review.moderationNote = data.moderationNote;
        review.moderatedBy = actor.id as never;
        review.moderatedAt = new Date();
        if (data.isFeatured !== undefined) review.isFeatured = data.isFeatured;
        await review.save();

        await recomputeCollegeRating(String(review.college));

        await recordAudit({
            actor,
            action: 'review.moderate',
            entity: 'Review',
            entityId: String(review._id),
            entityLabel: review.title,
            previousValues: { moderationStatus: previous },
            newValues: { moderationStatus: data.moderationStatus },
        });

        invalidateTag(CACHE_TAGS.reviews);
        revalidatePath(`/colleges/${review.collegeSlug}/reviews`);
        revalidatePath('/admin/reviews');

        return succeed({ id: String(review._id) }, 'Review updated.');
    });
}

/** Recalculates the denormalised rating breakdown from approved reviews. */
export async function recomputeCollegeRating(collegeId: string): Promise<void> {
    await connectToDatabase();
    const rows = await Review.aggregate<{
        _id: null;
        overall: number;
        placement: number;
        faculty: number;
        infrastructure: number;
        campusLife: number;
        valueForMoney: number;
        count: number;
    }>([
        { $match: { college: new Types.ObjectId(collegeId), moderationStatus: 'approved' } },
        {
            $group: {
                _id: null,
                overall: { $avg: '$ratings.overall' },
                placement: { $avg: '$ratings.placement' },
                faculty: { $avg: '$ratings.faculty' },
                infrastructure: { $avg: '$ratings.infrastructure' },
                campusLife: { $avg: '$ratings.campusLife' },
                valueForMoney: { $avg: '$ratings.valueForMoney' },
                count: { $sum: 1 },
            },
        },
    ]).exec();

    const stats = rows[0];
    await College.updateOne(
        { _id: collegeId },
        {
            $set: {
                rating: {
                    overall: Number((stats?.overall ?? 0).toFixed(2)),
                    placement: Number((stats?.placement ?? 0).toFixed(2)),
                    faculty: Number((stats?.faculty ?? 0).toFixed(2)),
                    infrastructure: Number((stats?.infrastructure ?? 0).toFixed(2)),
                    campusLife: Number((stats?.campusLife ?? 0).toFixed(2)),
                    valueForMoney: Number((stats?.valueForMoney ?? 0).toFixed(2)),
                    count: stats?.count ?? 0,
                },
            },
        },
    ).exec();
}

export async function markReviewHelpfulAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'review.helpful' }, async () => {
        await connectToDatabase();
        await Review.updateOne({ _id: id, moderationStatus: 'approved' }, { $inc: { helpfulCount: 1 } }).exec();
        return succeed({ id }, 'Thanks for the feedback.');
    });
}
