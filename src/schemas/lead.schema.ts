import { z } from 'zod';
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from '@/config/constants';
import { phoneSchema } from './auth.schema';

export const utmSchema = z
    .object({
        source: z.string().max(120).optional(),
        medium: z.string().max(120).optional(),
        campaign: z.string().max(160).optional(),
        term: z.string().max(160).optional(),
        content: z.string().max(160).optional(),
        gclid: z.string().max(200).optional(),
        fbclid: z.string().max(200).optional(),
        referrer: z.string().max(400).optional(),
        landingPage: z.string().max(400).optional(),
    })
    .partial()
    .optional();

/** Public counselling / enquiry form. Shared by the client form and the Server Action. */
export const leadFormSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Enter your full name')
        .max(120)
        .regex(/^[a-zA-Z\s.'-]+$/, 'Use letters only'),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
    courseInterest: z.string().max(140).optional().or(z.literal('')),
    preferredTime: z.string().max(60).optional().or(z.literal('')),
    stateId: z.string().max(40).optional().or(z.literal('')),
    cityId: z.string().max(40).optional().or(z.literal('')),
    message: z.string().max(1000).optional().or(z.literal('')),
    consent: z.boolean().refine((v) => v === true, 'Please accept the consent to continue'),

    // hidden tracking fields
    source: z.enum(LEAD_SOURCES).default('homepage_counselling_form'),
    sourceDetail: z.string().max(200).optional(),
    collegeSlug: z.string().max(140).optional(),
    examSlug: z.string().max(140).optional(),
    utm: utmSchema,
    /** Anti-duplicate token generated per form mount. */
    idempotencyKey: z.string().min(8).max(64),
    /**
     * Honeypot — hidden from humans, so any value at all means a bot.
     *
     * Deliberately *accepted* by the schema rather than rejected: the Server
     * Action answers a filled honeypot with a fake success, so a bot never learns
     * the field is a trap. Rejecting it here would leak that signal back.
     */
    website: z.string().max(200).optional().or(z.literal('')),
    /** Milliseconds between form mount and submit; sub-second submits are bots. */
    elapsedMs: z.number().min(0).optional(),
});

/** Parsed (server-side) shape — defaults applied. */
export type LeadFormInput = z.infer<typeof leadFormSchema>;
/** Raw (client-side) shape — what React Hook Form manages before parsing. */
export type LeadFormValues = z.input<typeof leadFormSchema>;

export const PREFERRED_TIME_OPTIONS = [
    { label: 'Morning (9 AM – 12 PM)', value: 'morning' },
    { label: 'Afternoon (12 PM – 4 PM)', value: 'afternoon' },
    { label: 'Evening (4 PM – 8 PM)', value: 'evening' },
    { label: 'Anytime', value: 'anytime' },
];

export const newsletterSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    name: z.string().trim().max(120).optional(),
});

/* ------------------------------- admin side ------------------------------ */

export const adminLeadUpdateSchema = z.object({
    id: z.string().min(1),
    status: z.enum(LEAD_STATUSES).optional(),
    priority: z.enum(LEAD_PRIORITIES).optional(),
    assignedTo: z.string().optional().or(z.literal('')),
    followUpAt: z.string().optional().or(z.literal('')),
    lostReason: z.string().max(400).optional(),
    note: z.string().max(4000).optional(),
    callOutcome: z
        .enum(['connected', 'not_answered', 'busy', 'wrong_number', 'switched_off'])
        .optional(),
});

export type AdminLeadUpdateInput = z.infer<typeof adminLeadUpdateSchema>;

export const CALL_OUTCOMES = [
    'connected',
    'not_answered',
    'busy',
    'wrong_number',
    'switched_off',
] as const;

export const adminLeadCreateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
    stateId: z.string().optional().or(z.literal('')),
    cityId: z.string().optional().or(z.literal('')),
    courseInterest: z.string().optional().or(z.literal('')),
    source: z.enum(LEAD_SOURCES).default('admin_manual'),
    priority: z.enum(LEAD_PRIORITIES).default('medium'),
    assignedTo: z.string().optional().or(z.literal('')),
    message: z.string().max(2000).optional(),
});

export type AdminLeadCreateInput = z.infer<typeof adminLeadCreateSchema>;

export const leadFilterSchema = z.object({
    q: z.string().max(120).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    priority: z.enum(LEAD_PRIORITIES).optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    assignedTo: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type LeadFilterInput = z.infer<typeof leadFilterSchema>;

export const bulkLeadUpdateSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(LEAD_STATUSES).optional(),
    assignedTo: z.string().optional(),
    priority: z.enum(LEAD_PRIORITIES).optional(),
});

export type BulkLeadUpdateInput = z.infer<typeof bulkLeadUpdateSchema>;
