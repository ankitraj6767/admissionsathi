import { z } from 'zod';
import { BOOKING_STATUSES } from '@/config/constants';
import { phoneSchema } from './auth.schema';

export const bookingFormSchema = z.object({
    counsellorSlug: z.string().max(140).optional().or(z.literal('')),
    type: z.enum(['career', 'college', 'course', 'loan', 'general']).default('general'),
    mode: z.string().max(40).default('Video Call'),
    name: z.string().trim().min(2, 'Enter your full name').max(120),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
    stateId: z.string().max(40).optional().or(z.literal('')),
    cityId: z.string().max(40).optional().or(z.literal('')),
    courseInterest: z.string().max(140).optional().or(z.literal('')),
    collegeSlug: z.string().max(140).optional().or(z.literal('')),
    examSlug: z.string().max(140).optional().or(z.literal('')),
    /** ISO date-time string from the slot picker. */
    scheduledAt: z.string().min(8, 'Choose a slot'),
    message: z.string().max(1000).optional().or(z.literal('')),
    consent: z.boolean().refine((v) => v, 'Please accept the consent to continue'),
    idempotencyKey: z.string().min(8).max(64),
    website: z.string().max(0).optional().or(z.literal('')),
});

export type BookingFormInput = z.infer<typeof bookingFormSchema>;
export type BookingFormValues = z.input<typeof bookingFormSchema>;

export const rescheduleBookingSchema = z.object({
    bookingId: z.string().min(1),
    scheduledAt: z.string().min(8),
    reason: z.string().max(400).optional(),
});

export const cancelBookingSchema = z.object({
    bookingId: z.string().min(1),
    reason: z.string().min(3, 'Tell us why so we can improve').max(400),
});

export const bookingFeedbackSchema = z.object({
    bookingId: z.string().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
});

/* ------------------------------ admin side ------------------------------- */

export const adminBookingUpdateSchema = z.object({
    bookingId: z.string().min(1),
    status: z.enum(BOOKING_STATUSES).optional(),
    counsellorId: z.string().optional().or(z.literal('')),
    scheduledAt: z.string().optional().or(z.literal('')),
    meetingLink: z.string().max(400).optional().or(z.literal('')),
    internalNotes: z.string().max(8000).optional(),
    studentSummary: z.string().max(4000).optional(),
    followUpAt: z.string().optional().or(z.literal('')),
});

export const counsellorUpsertSchema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2).max(140),
    slug: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens')
        .max(140),
    designation: z.string().max(140).optional(),
    bio: z.string().max(4000).optional(),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().max(20).optional(),
    languages: z.array(z.string().max(40)).max(10).default(['English', 'Hindi']),
    specializations: z.array(z.string().max(120)).max(15).default([]),
    experienceYears: z.coerce.number().int().min(0).max(60).optional(),
    freeSessionMinutes: z.coerce.number().int().min(5).max(240).default(30),
    paidSessionFee: z.coerce.number().min(0).max(100000).optional(),
    maxDailyBookings: z.coerce.number().int().min(1).max(50).default(8),
    isAcceptingLeads: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const COUNSELLING_TYPES = [
    { value: 'career', label: 'Career counselling', description: 'Stream and career direction' },
    { value: 'college', label: 'College counselling', description: 'Shortlisting and choice filling' },
    { value: 'course', label: 'Course counselling', description: 'Course and specialisation fit' },
    { value: 'loan', label: 'Loan & finance', description: 'Education loan and scholarships' },
    { value: 'general', label: 'General guidance', description: 'Anything else' },
] as const;
