import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Article, Review } from '@/db/models/content.model';
import {
    aggregateApprovedReviews,
    countDraftArticles,
    countPendingReviews,
    listApprovedReviews,
    listRecentlyUpdatedArticles,
    listReviewedColleges,
} from '@/db/repositories/content.repository';

const COLLEGE_ID = new Types.ObjectId();

const RATINGS = {
    overall: 4,
    placement: 4,
    faculty: 4,
    infrastructure: 4,
    campusLife: 4,
    valueForMoney: 4,
};

async function seedReview(overrides: Record<string, unknown> = {}) {
    return Review.create({
        college: COLLEGE_ID,
        collegeName: 'IIT Bombay',
        collegeSlug: 'iit-bombay',
        authorName: 'Riya Sharma',
        email: 'riya@example.com',
        ipHash: 'a1b2c3d4',
        title: 'Great four years on campus',
        reviewText: 'The labs, faculty and placement support were consistently strong all four years.',
        ratings: RATINGS,
        moderationStatus: 'approved',
        ...overrides,
    });
}

async function seedArticle(overrides: Record<string, unknown> = {}) {
    return Article.create({
        title: 'How to pick a branch',
        slug: 'how-to-pick-a-branch',
        contentHtml: '<p>Guidance</p>',
        category: 'admissions',
        status: 'published',
        ...overrides,
    });
}

/** Timestamps are written by Mongoose, so ordering fixtures set them explicitly. */
async function setUpdatedAt(id: Types.ObjectId, updatedAt: Date) {
    await Article.updateOne({ _id: id }, { $set: { updatedAt } }, { timestamps: false }).exec();
}

describe('listApprovedReviews', () => {
    it('returns approved reviews only', async () => {
        await seedReview({ title: 'Approved review headline' });
        await seedReview({ title: 'Pending review headline', moderationStatus: 'pending' });
        await seedReview({ title: 'Rejected review headline', moderationStatus: 'rejected' });
        await seedReview({ title: 'Hidden review headline', moderationStatus: 'hidden' });

        const result = await listApprovedReviews();

        expect(result.items.map((review) => review.title)).toEqual(['Approved review headline']);
    });

    it('never leaks the email or ipHash PII fields', async () => {
        await seedReview();

        const [review] = (await listApprovedReviews()).items;

        expect(review).toBeDefined();
        expect(review?.email).toBeUndefined();
        expect(review?.ipHash).toBeUndefined();
    });

    it('excludes soft-deleted reviews', async () => {
        await seedReview();
        await seedReview({ title: 'Deleted review headline', isDeleted: true });

        expect((await listApprovedReviews()).total).toBe(1);
    });

    it('filters by college slug', async () => {
        await seedReview();
        await seedReview({ collegeSlug: 'nit-trichy', collegeName: 'NIT Trichy' });

        const result = await listApprovedReviews({ collegeSlug: 'nit-trichy' });

        expect(result.items.map((review) => review.collegeSlug)).toEqual(['nit-trichy']);
    });

    it('filters by minimum overall rating', async () => {
        await seedReview({ title: 'Low rated review', ratings: { ...RATINGS, overall: 2 } });
        await seedReview({ title: 'High rated review', ratings: { ...RATINGS, overall: 5 } });

        const result = await listApprovedReviews({ minRating: 4 });

        expect(result.items.map((review) => review.title)).toEqual(['High rated review']);
    });

    it('sorts by rating when asked', async () => {
        await seedReview({ title: 'Three star review', ratings: { ...RATINGS, overall: 3 } });
        await seedReview({ title: 'Five star review', ratings: { ...RATINGS, overall: 5 } });

        const result = await listApprovedReviews({ sort: 'rating-high' });

        expect(result.items.map((review) => review.title)).toEqual([
            'Five star review',
            'Three star review',
        ]);
    });

    it('sorts by helpful votes when asked', async () => {
        await seedReview({ title: 'Barely helpful review', helpfulCount: 1 });
        await seedReview({ title: 'Very helpful review', helpfulCount: 42 });

        const result = await listApprovedReviews({ sort: 'helpful' });

        expect(result.items.map((review) => review.title)).toEqual([
            'Very helpful review',
            'Barely helpful review',
        ]);
    });

    it('pages ten reviews at a time by default', async () => {
        await Promise.all(
            Array.from({ length: 12 }, (_, index) => seedReview({ title: `Review number ${index}` })),
        );

        const result = await listApprovedReviews();

        expect(result).toMatchObject({ pageSize: 10, total: 12, hasNext: true, hasPrev: false });
        expect(result.items).toHaveLength(10);
    });
});

describe('aggregateApprovedReviews', () => {
    it('reports zeroes when there are no approved reviews', async () => {
        await seedReview({ moderationStatus: 'pending' });

        const stats = await aggregateApprovedReviews();

        expect(stats.total).toBe(0);
        expect(stats.average).toBe(0);
        expect(stats.distribution.map((bucket) => bucket.count)).toEqual([0, 0, 0, 0, 0]);
    });

    it('averages the overall rating across approved reviews', async () => {
        await seedReview({ ratings: { ...RATINGS, overall: 5 } });
        await seedReview({ ratings: { ...RATINGS, overall: 4 } });

        const stats = await aggregateApprovedReviews();

        expect(stats.total).toBe(2);
        expect(stats.average).toBe(4.5);
    });

    it('buckets reviews into the 1–5 star distribution, highest first', async () => {
        await seedReview({ ratings: { ...RATINGS, overall: 5 } });
        await seedReview({ ratings: { ...RATINGS, overall: 5 } });
        await seedReview({ ratings: { ...RATINGS, overall: 3 } });
        await seedReview({ ratings: { ...RATINGS, overall: 1 } });

        const stats = await aggregateApprovedReviews();

        expect(stats.distribution).toEqual([
            { rating: 5, count: 2 },
            { rating: 4, count: 0 },
            { rating: 3, count: 1 },
            { rating: 2, count: 0 },
            { rating: 1, count: 1 },
        ]);
    });

    it('ignores pending, rejected, hidden and soft-deleted reviews', async () => {
        await seedReview({ ratings: { ...RATINGS, overall: 5 } });
        await seedReview({ moderationStatus: 'pending', ratings: { ...RATINGS, overall: 1 } });
        await seedReview({ moderationStatus: 'rejected', ratings: { ...RATINGS, overall: 1 } });
        await seedReview({ moderationStatus: 'hidden', ratings: { ...RATINGS, overall: 1 } });
        await seedReview({ isDeleted: true, ratings: { ...RATINGS, overall: 1 } });

        const stats = await aggregateApprovedReviews();

        expect(stats).toMatchObject({ total: 1, average: 5 });
    });
});

describe('listReviewedColleges', () => {
    it('lists only colleges that have approved reviews, most reviewed first', async () => {
        await seedReview();
        await seedReview();
        await seedReview({ collegeSlug: 'nit-trichy', collegeName: 'NIT Trichy' });
        await seedReview({
            collegeSlug: 'vit-vellore',
            collegeName: 'VIT Vellore',
            moderationStatus: 'pending',
        });

        const rows = await listReviewedColleges();

        expect(rows).toEqual([
            { slug: 'iit-bombay', name: 'IIT Bombay', count: 2 },
            { slug: 'nit-trichy', name: 'NIT Trichy', count: 1 },
        ]);
    });

    it('breaks a count tie alphabetically by name', async () => {
        await seedReview({ collegeSlug: 'zeta-college', collegeName: 'Zeta College' });
        await seedReview({ collegeSlug: 'alpha-college', collegeName: 'Alpha College' });

        const rows = await listReviewedColleges();

        expect(rows.map((row) => row.name)).toEqual(['Alpha College', 'Zeta College']);
    });

    it('respects the requested limit', async () => {
        await Promise.all(
            Array.from({ length: 4 }, (_, index) =>
                seedReview({ collegeSlug: `college-${index}`, collegeName: `College ${index}` }),
            ),
        );

        expect(await listReviewedColleges(2)).toHaveLength(2);
    });
});

describe('article counts and recency', () => {
    it('counts draft and in-review articles as pending editorial work', async () => {
        await seedArticle({ slug: 'draft-piece', status: 'draft' });
        await seedArticle({ slug: 'review-piece', status: 'in_review' });
        await seedArticle({ slug: 'live-piece', status: 'published' });
        await seedArticle({ slug: 'archived-piece', status: 'archived' });

        expect(await countDraftArticles()).toBe(2);
    });

    it('counts pending reviews only', async () => {
        await seedReview({ moderationStatus: 'pending' });
        await seedReview({ moderationStatus: 'pending' });
        await seedReview({ moderationStatus: 'approved' });
        await seedReview({ moderationStatus: 'rejected' });

        expect(await countPendingReviews()).toBe(2);
    });

    it('orders recently updated articles newest first', async () => {
        const oldest = await seedArticle({ slug: 'oldest-piece', title: 'Oldest' });
        const middle = await seedArticle({ slug: 'middle-piece', title: 'Middle' });
        const newest = await seedArticle({ slug: 'newest-piece', title: 'Newest' });

        await setUpdatedAt(oldest._id, new Date('2026-01-01T00:00:00.000Z'));
        await setUpdatedAt(middle._id, new Date('2026-02-01T00:00:00.000Z'));
        await setUpdatedAt(newest._id, new Date('2026-03-01T00:00:00.000Z'));

        const rows = await listRecentlyUpdatedArticles();

        expect(rows.map((article) => article.title)).toEqual(['Newest', 'Middle', 'Oldest']);
    });

    it('includes unpublished articles and honours the limit', async () => {
        const draft = await seedArticle({ slug: 'draft-recent', title: 'Draft', status: 'draft' });
        const live = await seedArticle({ slug: 'live-recent', title: 'Live' });

        await setUpdatedAt(draft._id, new Date('2026-04-01T00:00:00.000Z'));
        await setUpdatedAt(live._id, new Date('2026-01-01T00:00:00.000Z'));

        const rows = await listRecentlyUpdatedArticles(1);

        expect(rows.map((article) => article.title)).toEqual(['Draft']);
    });

    it('projects only the admin listing fields', async () => {
        await seedArticle({ contentHtml: '<p>a very long body</p>' });

        const [article] = await listRecentlyUpdatedArticles();

        expect(article?.slug).toBe('how-to-pick-a-branch');
        expect(article?.contentHtml).toBeUndefined();
    });
});
