import { z } from 'zod';
import { phoneSchema } from './auth.schema';

/**
 * Contact topics.
 * Kept as a closed list so the support inbox can be routed and reported on —
 * free-text subjects made triage impossible in the lead inbox.
 */
export const CONTACT_SUBJECTS = [
    'admission_help',
    'counselling',
    'college_information',
    'exam_query',
    'education_loan',
    'scholarship',
    'data_correction',
    'partnership',
    'careers',
    'feedback',
    'other',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const CONTACT_SUBJECT_OPTIONS: { label: string; value: ContactSubject }[] = [
    { label: 'Admission help', value: 'admission_help' },
    { label: 'Free counselling', value: 'counselling' },
    { label: 'College information', value: 'college_information' },
    { label: 'Entrance exam query', value: 'exam_query' },
    { label: 'Education loan', value: 'education_loan' },
    { label: 'Scholarship', value: 'scholarship' },
    { label: 'Report incorrect data', value: 'data_correction' },
    { label: 'Partnership / tie-up', value: 'partnership' },
    { label: 'Careers at Admission Sathi', value: 'careers' },
    { label: 'Feedback or complaint', value: 'feedback' },
    { label: 'Something else', value: 'other' },
];

/** Human label for a stored subject key (admin inbox, notification bodies). */
export function contactSubjectLabel(value: string): string {
    return CONTACT_SUBJECT_OPTIONS.find((option) => option.value === value)?.label ?? 'General enquiry';
}

/** Public contact form. Shared by the client form and the Server Action. */
export const contactFormSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Enter your full name')
        .max(140, 'Name is too long'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: phoneSchema.optional().or(z.literal('')),
    subject: z.enum(CONTACT_SUBJECTS, { message: 'Select what your message is about' }),
    message: z
        .string()
        .trim()
        .min(10, 'Tell us a little more (at least 10 characters)')
        .max(4000, 'Please keep your message under 4000 characters'),
    consent: z.boolean().refine((v) => v === true, 'Please accept the consent to continue'),
    /** Honeypot — bots fill this, humans never see it. */
    website: z.string().max(0).optional().or(z.literal('')),
    /** Milliseconds between form mount and submit; sub-second submits are bots. */
    elapsedMs: z.number().min(0).optional(),
});

/** Parsed (server-side) shape — defaults applied. */
export type ContactFormInput = z.infer<typeof contactFormSchema>;
/** Raw (client-side) shape — what React Hook Form manages before parsing. */
export type ContactFormValues = z.input<typeof contactFormSchema>;
