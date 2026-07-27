import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { College } from '@/db/models/college.model';
import { Review } from '@/db/models/content.model';
import {
    moderateReview,
    recomputeCollegeRating,
    submitReview,
} from '@/services/review.service';

const MODERATOR_ID = String(new Types.ObjectId());

const RATINGS = {
    overall: 4,
    placement: 4,
    faculty: 4,
    infrastructure: 4,
    campusLife: 4,
    valueForMoney: 4,
};

async function seedCollege(overrides: Record<string, unknown> = {}) {
    return College.create({
        name: 'IIT Bombay',
        slug: 'iit-bombay',
        state: new Types.ObjectId(),
        stateName: 'Maharashtra',
        city: new Types.ObjectId(),
        cityName: 'Mumbai',
        ownership: 'Government',
        status: 'published',
        ...overrides,
    });
}

function reviewInput(collegeId: string, overrides: Record<string, unknown> = {}) {
    return {
        collegeId,
        collegeSlug: 'iit-bombay',
        authorName: 'Riya Sharma',
        email: 'riya@example.com',
        isAnonymous: false,
        title: 'Strong placements and faculty',
        reviewText: 'Four years of solid teaching, good labs and consistent placement support.',
        ratings: RATINGS,
        consent: true,
        ...overrides,
    };
}

async function seedReview(collegeId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
    return Review.create({
        college: collegeId,
        collegeName: 'IIT Bombay',
        collegeSlug: 'iit-bombay',
        authorName: 'Riya Sharma',
        email: 'riya@example.com',
        title: 'Strong placements and faculty',
        reviewText: 'Four years of solid teaching, good labs and consistent placement support.',
        ratings: RATINGS,
        moderationStatus: 'approved',
        ...overrides,
    });
}

describe('submitReview', () => {
    it('reports college_not_found for an unknown college', async () => {
        const outcome = await submitReview(reviewInput(String(new Types.ObjectId())));

        expect(outcome).toEqual({ status: 'college_not_found' });
        expect(await Review.countDocuments({})).toBe(0);
    });

    it('creates a pending review and stamps the college name and slug', async () => {
        const college = await seedCollege();

        const outcome = await submitReview(reviewInput(String(college._id)));

        expect(outcome).toMatchObject({
            status: 'created',
            collegeName: 'IIT Bombay',
            collegeSlug: 'iit-bombay',
        });

        const stored = await Review.findOne({}).lean();
        expect(stored?.moderationStatus).toBe('pending');
        expect(stored?.collegeSlug).toBe('iit-bombay');
        expect(stored?.verificationStatus).toBe('unverified');
    });

    it('marks a signed-in submission as email verified', async () => {
        const college = await seedCollege();
        const userId = String(new Types.ObjectId());

        await submitReview({ ...reviewInput(String(college._id)), userId });

        expect((await Review.findOne({}).lean())?.verificationStatus).toBe('email_verified');
    });

    it('replaces the author name when the review is anonymous', async () => {
        const college = await seedCollege();

        await submitReview({ ...reviewInput(String(college._id)), isAnonymous: true });

        expect((await Review.findOne({}).lean())?.authorName).toBe('Anonymous student');
    });

    it('refuses a second review from the same email inside the 30-day window', async () => {
        const college = await seedCollege();
        await seedReview(college._id, { moderationStatus: 'pending' });

        const outcome = await submitReview(reviewInput(String(college._id)));

        expect(outcome).toEqual({ status: 'duplicate' });
        expect(await Review.countDocuments({})).toBe(1);
    });

    it('accepts a review again once the window has passed', async () => {
        const college = await seedCollege();
        const old = await seedReview(college._id);
        await Review.collection.updateOne(
            { _id: old._id },
            { $set: { createdAt: new Date(Date.now() - 40 * 86_400_000) } },
        );

        const outcome = await submitReview(reviewInput(String(college._id)));

        expect(outcome.status).toBe('created');
        expect(await Review.countDocuments({})).toBe(2);
    });

    it('does not treat a different email as a duplicate', async () => {
        const college = await seedCollege();
        await seedReview(college._id);

        const outcome = await submitReview(
            reviewInput(String(college._id), { email: 'other@example.com' }),
        );

        expect(outcome.status).toBe('created');
    });

    it('accepts a review for a college that is not published yet', async () => {
        const college = await seedCollege({ status: 'draft' });

        expect((await submitReview(reviewInput(String(college._id)))).status).toBe('created');
    });
});

describe('moderateReview', () => {
    it('returns null for an unknown review', async () => {
        const result = await moderateReview({
            id: String(new Types.ObjectId()),
            moderationStatus: 'approved',
            moderatorId: MODERATOR_ID,
        });

        expect(result).toBeNull();
    });

    it('applies the decision and reports the previous status', async () => {
        const college = await seedCollege();
        const review = await seedReview(college._id, { moderationStatus: 'pending' });

        const result = await moderateReview({
            id: String(review._id),
            moderationStatus: 'approved',
            moderationNote: 'Looks genuine',
            moderatorId: MODERATOR_ID,
        });

        expect(result).toMatchObject({ previousStatus: 'pending', collegeSlug: 'iit-bombay' });

        const stored = await Review.findById(review._id).lean();
        expect(stored?.moderationStatus).toBe('approved');
        expect(stored?.moderationNote).toBe('Looks genuine');
        expect(String(stored?.moderatedBy)).toBe(MODERATOR_ID);
        expect(stored?.moderatedAt).toBeInstanceOf(Date);
    });

    it('recomputes the college rating from the approved reviews', async () => {
        const college = await seedCollege();
        const review = await seedReview(college._id, {
            moderationStatus: 'pending',
            ratings: { ...RATINGS, overall: 5, placement: 3 },
        });

        await moderateReview({
            id: String(review._id),
            moderationStatus: 'approved',
            moderatorId: MODERATOR_ID,
        });

        const rating = (await College.findById(college._id).lean())?.rating;
        expect(rating).toMatchObject({ overall: 5, placement: 3, count: 1 });
    });

    it('drops a hidden review back out of the published average', async () => {
        const college = await seedCollege();
        const keep = await seedReview(college._id, { ratings: { ...RATINGS, overall: 4 } });
        const hide = await seedReview(college._id, {
            email: 'second@example.com',
            ratings: { ...RATINGS, overall: 2 },
        });

        await moderateReview({
            id: String(keep._id),
            moderationStatus: 'approved',
            moderatorId: MODERATOR_ID,
        });
        expect((await College.findById(college._id).lean())?.rating.overall).toBe(3);

        await moderateReview({
            id: String(hide._id),
            moderationStatus: 'hidden',
            moderatorId: MODERATOR_ID,
        });

        const rating = (await College.findById(college._id).lean())?.rating;
        expect(rating).toMatchObject({ overall: 4, count: 1 });
    });

    it('can feature a review as part of the decision', async () => {
        const college = await seedCollege();
        const review = await seedReview(college._id);

        await moderateReview({
            id: String(review._id),
            moderationStatus: 'approved',
            isFeatured: true,
            moderatorId: MODERATOR_ID,
        });

        expect((await Review.findById(review._id).lean())?.isFeatured).toBe(true);
    });
});

describe('recomputeCollegeRating', () => {
    it('averages every criterion over the approved reviews', async () => {
        const college = await seedCollege();
        await seedReview(college._id, { ratings: { ...RATINGS, overall: 5, faculty: 5 } });
        await seedReview(college._id, {
            email: 'second@example.com',
            ratings: { ...RATINGS, overall: 4, faculty: 2 },
        });

        await recomputeCollegeRating(String(college._id));

        expect((await College.findById(college._id).lean())?.rating).toMatchObject({
            overall: 4.5,
            faculty: 3.5,
            count: 2,
        });
    });

    it('resets the whole block to zero when no approved review remains', async () => {
        const college = await seedCollege({
            rating: {
                overall: 4.5,
                placement: 4,
                faculty: 4,
                infrastructure: 4,
                campusLife: 4,
                valueForMoney: 4,
                count: 9,
            },
        });
        await seedReview(college._id, { moderationStatus: 'rejected' });

        await recomputeCollegeRating(String(college._id));

        expect((await College.findById(college._id).lean())?.rating).toMatchObject({
            overall: 0,
            placement: 0,
            faculty: 0,
            infrastructure: 0,
            campusLife: 0,
            valueForMoney: 0,
            count: 0,
        });
    });

    it('ignores reviews belonging to another college', async () => {
        const college = await seedCollege();
        const other = await seedCollege({ name: 'NIT Trichy', slug: 'nit-trichy' });
        await seedReview(other._id, { ratings: { ...RATINGS, overall: 1 } });

        await recomputeCollegeRating(String(college._id));

        expect((await College.findById(college._id).lean())?.rating.count).toBe(0);
    });
});
