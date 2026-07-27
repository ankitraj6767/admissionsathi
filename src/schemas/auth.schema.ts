import { z } from 'zod';

export const phoneSchema = z
    .string()
    .trim()
    .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const signUpSchema = z
    .object({
        name: z.string().trim().min(2, 'Enter your full name').max(120),
        email: z.string().trim().toLowerCase().email('Enter a valid email address'),
        phone: phoneSchema.optional().or(z.literal('')),
        password: z
            .string()
            .min(8, 'Use at least 8 characters')
            .max(72, 'Password is too long')
            .regex(/[A-Z]/, 'Add one uppercase letter')
            .regex(/[a-z]/, 'Add one lowercase letter')
            .regex(/[0-9]/, 'Add one number'),
        confirmPassword: z.string(),
        acceptTerms: z.coerce.boolean().refine((v) => v, 'You must accept the terms to continue'),
        marketingOptIn: z.coerce.boolean().default(false),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z.string().min(1, 'Enter your password'),
    callbackUrl: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const resetPasswordSchema = z
    .object({
        token: z.string().min(10),
        password: z
            .string()
            .min(8, 'Use at least 8 characters')
            .regex(/[A-Z]/, 'Add one uppercase letter')
            .regex(/[0-9]/, 'Add one number'),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(120),
    phone: phoneSchema.optional().or(z.literal('')),
    stateId: z.string().optional(),
    cityId: z.string().optional(),
    currentQualification: z.string().max(120).optional(),
    passingYear: z.coerce.number().int().min(1980).max(2100).optional(),
    gender: z.string().max(30).optional(),
    category: z.string().max(30).optional(),
});

export const notificationPreferencesSchema = z.object({
    channels: z.array(z.enum(['email', 'whatsapp', 'sms', 'in_app'])).default(['email', 'in_app']),
    examAlerts: z.coerce.boolean().default(true),
    admissionAlerts: z.coerce.boolean().default(true),
    savedCollegeUpdates: z.coerce.boolean().default(true),
    marketing: z.coerce.boolean().default(false),
});

/** Architecture placeholder for the OTP login flow (provider added later). */
export const requestOtpSchema = z.object({ phone: phoneSchema });
export const verifyOtpSchema = z.object({
    phone: phoneSchema,
    code: z.string().regex(/^\d{4,6}$/, 'Enter the 6-digit code'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
