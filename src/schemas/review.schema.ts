import { z } from 'zod';
import { MODERATION_STATUSES } from '@/config/constants';

const ratingField = z.coerce.number().min(1, 'Select a rating').max(5);

export const reviewFormSchema = z.object({
    collegeId: z.string().min(1),
    collegeSlug: z.string().min(1).max(160),
    authorName: z.string().trim().min(2, 'Enter your name').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    isAnonymous: z.boolean().default(false),
    courseName: z.string().max(160).optional().or(z.literal('')),
    passingYear: z.coerce.number().int().min(1980).max(2100).optional(),
    title: z.string().trim().min(6, 'Add a short headline').max(200),
    reviewText: z
        .string()
        .trim()
        .min(40, 'Write at least 40 characters so the review is useful')
        .max(6000),
    pros: z.string().max(1500).optional().or(z.literal('')),
    cons: z.string().max(1500).optional().or(z.literal('')),
    ratings: z.object({
        overall: ratingField,
        placement: ratingField,
        faculty: ratingField,
        infrastructure: ratingField,
        campusLife: ratingField,
        valueForMoney: ratingField,
    }),
    consent: z.boolean().refine((v) => v, 'Please confirm the declaration'),
    website: z.string().max(0).optional().or(z.literal('')),
});

export type ReviewFormInput = z.infer<typeof reviewFormSchema>;
export type ReviewFormValues = z.input<typeof reviewFormSchema>;

export const moderateReviewSchema = z.object({
    id: z.string().min(1),
    moderationStatus: z.enum(MODERATION_STATUSES),
    moderationNote: z.string().max(600).optional(),
    isFeatured: z.boolean().optional(),
});

export const RATING_FIELDS = [
    { key: 'overall', label: 'Overall experience' },
    { key: 'placement', label: 'Placements' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'infrastructure', label: 'Infrastructure' },
    { key: 'campusLife', label: 'Campus life' },
    { key: 'valueForMoney', label: 'Value for money' },
] as const;
