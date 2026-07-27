import { describe, expect, it } from 'vitest';
import { leadFormSchema, newsletterSchema } from '@/schemas/lead.schema';
import { bookingFormSchema, cancelBookingSchema } from '@/schemas/counselling.schema';
import { reviewFormSchema } from '@/schemas/review.schema';
import { predictorLeadSchema, predictorRunSchema } from '@/schemas/predictor.schema';
import { loginSchema, phoneSchema, signUpSchema } from '@/schemas/auth.schema';

/** Collapses a ZodError into `{ 'path.to.field': 'message' }` for readable assertions. */
function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
    const out: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path.map(String).join('.');
        if (!(key in out)) out[key] = issue.message;
    }
    return out;
}

const validLead = {
    name: 'Ankit Raj',
    phone: '9876543210',
    email: 'ankit@example.com',
    consent: true,
    idempotencyKey: 'lead-key-12345678',
};

describe('phoneSchema', () => {
    it.each(['9876543210', '+919876543210', '+91 9876543210', '91-9876543210', ' 8123456789 '])(
        'accepts %s',
        (input) => {
            expect(phoneSchema.safeParse(input).success).toBe(true);
        },
    );

    it.each(['1234567890', '98765', '98765432101', 'abcdefghij', '', '+1 5551234567'])(
        'rejects %s',
        (input) => {
            expect(phoneSchema.safeParse(input).success).toBe(false);
        },
    );

    it('reports a helpful message', () => {
        const result = phoneSchema.safeParse('12345');
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toBe(
                'Enter a valid 10-digit Indian mobile number',
            );
        }
    });
});

describe('leadFormSchema', () => {
    it('accepts a minimal valid submission and applies the default source', () => {
        const result = leadFormSchema.safeParse(validLead);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.source).toBe('homepage_counselling_form');
            expect(result.data.email).toBe('ankit@example.com');
        }
    });

    it('lowercases and trims the email', () => {
        const result = leadFormSchema.safeParse({ ...validLead, email: '  Ankit@Example.COM ' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.email).toBe('ankit@example.com');
    });

    it('allows an empty email (phone-only lead)', () => {
        expect(leadFormSchema.safeParse({ ...validLead, email: '' }).success).toBe(true);
    });

    it('rejects an invalid email', () => {
        const result = leadFormSchema.safeParse({ ...validLead, email: 'not-an-email' });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error).email).toBeDefined();
    });

    it('rejects an invalid phone with a field-level message', () => {
        const result = leadFormSchema.safeParse({ ...validLead, phone: '1234567890' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).phone).toBe('Enter a valid 10-digit Indian mobile number');
        }
    });

    it('rejects a missing consent with a field-level message', () => {
        const result = leadFormSchema.safeParse({ ...validLead, consent: false });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).consent).toBe('Please accept the consent to continue');
        }
    });

    it('rejects a name with digits and reports the letters-only rule', () => {
        const result = leadFormSchema.safeParse({ ...validLead, name: 'Ankit 123' });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error).name).toBe('Use letters only');
    });

    it('rejects a one-character name', () => {
        const result = leadFormSchema.safeParse({ ...validLead, name: 'A' });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error).name).toBe('Enter your full name');
    });

    /**
     * The honeypot parses successfully on purpose. `submitLeadAction` inspects
     * `website` and answers a filled one with a fake success, so a bot never
     * learns the field is a trap — a validation error would leak exactly that.
     */
    it('accepts a filled honeypot so the action can answer with a fake success', () => {
        const result = leadFormSchema.safeParse({ ...validLead, website: 'http://spam.example' });

        expect(result.success).toBe(true);
        if (result.success) expect(result.data.website).toBe('http://spam.example');
    });

    it('treats an empty honeypot as a normal human submission', () => {
        const result = leadFormSchema.safeParse({ ...validLead, website: '' });

        expect(result.success).toBe(true);
        if (result.success) expect(result.data.website).toBe('');
    });

    it('rejects a short idempotency key', () => {
        expect(leadFormSchema.safeParse({ ...validLead, idempotencyKey: 'short' }).success).toBe(false);
    });

    it('rejects an unknown lead source', () => {
        expect(leadFormSchema.safeParse({ ...validLead, source: 'telepathy' }).success).toBe(false);
    });

    it('accepts optional utm tracking data', () => {
        const result = leadFormSchema.safeParse({
            ...validLead,
            utm: { source: 'google', medium: 'cpc', campaign: 'btech-2025' },
            elapsedMs: 4200,
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.utm?.source).toBe('google');
    });
});

describe('newsletterSchema', () => {
    it('accepts a valid email and rejects a bad one', () => {
        expect(newsletterSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
        const bad = newsletterSchema.safeParse({ email: 'nope' });
        expect(bad.success).toBe(false);
        if (!bad.success) expect(bad.error.issues[0]?.message).toBe('Enter a valid email address');
    });
});

const validBooking = {
    name: 'Ankit Raj',
    phone: '9876543210',
    scheduledAt: '2025-06-01T10:00:00.000Z',
    consent: true,
    idempotencyKey: 'booking-key-1234',
};

describe('bookingFormSchema', () => {
    it('accepts a valid booking and applies type/mode defaults', () => {
        const result = bookingFormSchema.safeParse(validBooking);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.type).toBe('general');
            expect(result.data.mode).toBe('Video Call');
        }
    });

    it('rejects a missing slot', () => {
        const result = bookingFormSchema.safeParse({ ...validBooking, scheduledAt: '' });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error).scheduledAt).toBe('Choose a slot');
    });

    it('rejects a missing consent', () => {
        const result = bookingFormSchema.safeParse({ ...validBooking, consent: false });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).consent).toBe('Please accept the consent to continue');
        }
    });

    it('rejects an invalid phone and an invalid counselling type', () => {
        expect(bookingFormSchema.safeParse({ ...validBooking, phone: '5551234567' }).success).toBe(false);
        expect(bookingFormSchema.safeParse({ ...validBooking, type: 'astrology' }).success).toBe(false);
    });

    it('accepts an empty optional email but rejects a malformed one', () => {
        expect(bookingFormSchema.safeParse({ ...validBooking, email: '' }).success).toBe(true);
        expect(bookingFormSchema.safeParse({ ...validBooking, email: 'bad@' }).success).toBe(false);
    });
});

describe('cancelBookingSchema', () => {
    it('requires a reason of at least three characters', () => {
        expect(cancelBookingSchema.safeParse({ bookingId: 'b1', reason: 'Clash with exam' }).success).toBe(
            true,
        );
        const result = cancelBookingSchema.safeParse({ bookingId: 'b1', reason: 'no' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).reason).toBe('Tell us why so we can improve');
        }
    });
});

const validReview = {
    collegeId: 'c1',
    collegeSlug: 'iit-bombay',
    authorName: 'Ankit Raj',
    email: 'ankit@example.com',
    title: 'Great campus life',
    reviewText: 'x'.repeat(40),
    ratings: {
        overall: 5,
        placement: 4,
        faculty: 4,
        infrastructure: 5,
        campusLife: 5,
        valueForMoney: 3,
    },
    consent: true,
};

describe('reviewFormSchema', () => {
    it('accepts a complete review and defaults isAnonymous to false', () => {
        const result = reviewFormSchema.safeParse(validReview);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.isAnonymous).toBe(false);
    });

    it('rejects a review body shorter than 40 characters', () => {
        const result = reviewFormSchema.safeParse({ ...validReview, reviewText: 'too short' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).reviewText).toBe(
                'Write at least 40 characters so the review is useful',
            );
        }
    });

    it('rejects a short headline', () => {
        const result = reviewFormSchema.safeParse({ ...validReview, title: 'Ok' });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error).title).toBe('Add a short headline');
    });

    it('rejects an out-of-range rating', () => {
        const result = reviewFormSchema.safeParse({
            ...validReview,
            ratings: { ...validReview.ratings, overall: 0 },
        });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error)['ratings.overall']).toBe('Select a rating');
    });

    it('coerces numeric strings from the rating inputs', () => {
        const result = reviewFormSchema.safeParse({
            ...validReview,
            ratings: { ...validReview.ratings, overall: '4' },
            passingYear: '2024',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ratings.overall).toBe(4);
            expect(result.data.passingYear).toBe(2024);
        }
    });

    it('rejects a missing declaration and an invalid email', () => {
        const noConsent = reviewFormSchema.safeParse({ ...validReview, consent: false });
        expect(noConsent.success).toBe(false);
        if (!noConsent.success) {
            expect(fieldErrors(noConsent.error).consent).toBe('Please confirm the declaration');
        }
        expect(reviewFormSchema.safeParse({ ...validReview, email: 'oops' }).success).toBe(false);
    });
});

describe('predictorRunSchema', () => {
    it('applies defaults for category, round, branches and states', () => {
        const result = predictorRunSchema.safeParse({
            predictorSlug: 'jee-main-college-predictor',
            metricValue: 15_000,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.category).toBe('General');
            expect(result.data.round).toBe(1);
            expect(result.data.branches).toEqual([]);
            expect(result.data.preferredStates).toEqual([]);
        }
    });

    it('coerces the metric value and the round from strings', () => {
        const result = predictorRunSchema.safeParse({
            predictorSlug: 'neug-predictor',
            metricValue: '25000',
            round: '3',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.metricValue).toBe(25_000);
            expect(result.data.round).toBe(3);
        }
    });

    it('rejects a negative metric value, an out-of-range round and an unknown category', () => {
        const base = { predictorSlug: 'jee-main-college-predictor', metricValue: 1_000 };
        expect(predictorRunSchema.safeParse({ ...base, metricValue: -1 }).success).toBe(false);
        expect(predictorRunSchema.safeParse({ ...base, round: 13 }).success).toBe(false);
        expect(predictorRunSchema.safeParse({ ...base, category: 'Unknown' }).success).toBe(false);
    });

    it('accepts every reservation category it advertises', () => {
        for (const category of ['General', 'General-EWS', 'OBC-NCL', 'SC', 'ST', 'PwD']) {
            expect(
                predictorRunSchema.safeParse({
                    predictorSlug: 'jee-main-college-predictor',
                    metricValue: 5_000,
                    category,
                }).success,
            ).toBe(true);
        }
    });

    it('rejects a too-short predictor slug and more than ten branches', () => {
        expect(predictorRunSchema.safeParse({ predictorSlug: 'a', metricValue: 1 }).success).toBe(false);
        expect(
            predictorRunSchema.safeParse({
                predictorSlug: 'jee-main-college-predictor',
                metricValue: 1,
                branches: Array.from({ length: 11 }, (_, i) => `branch-${i}`),
            }).success,
        ).toBe(false);
    });
});

describe('predictorLeadSchema', () => {
    it('accepts a valid capture and rejects missing consent', () => {
        const valid = {
            sessionId: 's1',
            name: 'Ankit Raj',
            phone: '9876543210',
            consent: true,
            idempotencyKey: 'predictor-key-01',
        };
        expect(predictorLeadSchema.safeParse(valid).success).toBe(true);

        const result = predictorLeadSchema.safeParse({ ...valid, consent: false });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).consent).toBe('Please accept the consent to continue');
        }
    });
});

describe('signUpSchema', () => {
    const validSignUp = {
        name: 'Ankit Raj',
        email: 'ankit@example.com',
        password: 'Str0ngPass',
        confirmPassword: 'Str0ngPass',
        acceptTerms: true,
    };

    it('accepts a valid signup and defaults marketingOptIn to false', () => {
        const result = signUpSchema.safeParse(validSignUp);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.marketingOptIn).toBe(false);
    });

    it('rejects mismatched passwords on the confirmPassword path', () => {
        const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'Different1' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).confirmPassword).toBe('Passwords do not match');
        }
    });

    it.each([
        ['short1A', 'Use at least 8 characters'],
        ['alllowercase1', 'Add one uppercase letter'],
        ['ALLUPPERCASE1', 'Add one lowercase letter'],
        ['NoDigitsHere', 'Add one number'],
    ])('rejects the weak password %s', (password, message) => {
        const result = signUpSchema.safeParse({
            ...validSignUp,
            password,
            confirmPassword: password,
        });
        expect(result.success).toBe(false);
        if (!result.success) expect(fieldErrors(result.error).password).toBe(message);
    });

    it('rejects an unaccepted terms checkbox', () => {
        const result = signUpSchema.safeParse({ ...validSignUp, acceptTerms: false });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(fieldErrors(result.error).acceptTerms).toBe(
                'You must accept the terms to continue',
            );
        }
    });

    it('rejects an invalid email and allows an empty optional phone', () => {
        expect(signUpSchema.safeParse({ ...validSignUp, email: 'nope' }).success).toBe(false);
        expect(signUpSchema.safeParse({ ...validSignUp, phone: '' }).success).toBe(true);
        expect(signUpSchema.safeParse({ ...validSignUp, phone: '12345' }).success).toBe(false);
    });
});

describe('loginSchema', () => {
    it('normalises the email and requires a password', () => {
        const result = loginSchema.safeParse({ email: ' User@Example.com ', password: 'x' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.email).toBe('user@example.com');

        const empty = loginSchema.safeParse({ email: 'user@example.com', password: '' });
        expect(empty.success).toBe(false);
        if (!empty.success) expect(fieldErrors(empty.error).password).toBe('Enter your password');
    });
});
