'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import { leadFormSchema, PREFERRED_TIME_OPTIONS, type LeadFormValues } from '@/schemas/lead.schema';
import { submitLeadAction } from '@/actions/lead.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, FieldError, Input, Select } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { captureUtm, track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { cn } from '@/lib/utils';
import type { SelectOption } from '@/types/common';

export interface CounsellingFormProps {
    title: string;
    subtitle?: string;
    submitLabel?: string;
    badges?: { label: string; icon?: string }[];
    courses: SelectOption[];
    states?: SelectOption[];
    showEmail?: boolean;
    showState?: boolean;
    consentText: string;
    source?: LeadFormValues['source'];
    sourceDetail?: string;
    collegeSlug?: string;
    examSlug?: string;
    variant?: 'dark' | 'light';
    className?: string;
}

function newIdempotencyKey() {
    return `lead_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

/**
 * Free counselling lead form.
 * Same component powers the hero panel (dark), the /book-counselling page and
 * entity enquiry sheets (light) — only the palette and hidden tracking change.
 */
export function CounsellingForm({
    title,
    subtitle,
    submitLabel = 'Book My Counselling',
    badges = [],
    courses,
    states = [],
    showEmail = false,
    showState = true,
    consentText,
    source = 'homepage_counselling_form',
    sourceDetail,
    collegeSlug,
    examSlug,
    variant = 'dark',
    className,
}: CounsellingFormProps) {
    const dark = variant === 'dark';
    const mountedAt = useRef<number>(Date.now());
    const startedTracked = useRef(false);
    const [success, setSuccess] = useState<{ reference: string; message: string } | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const idempotencyKey = useMemo(() => newIdempotencyKey(), []);

    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<LeadFormValues>({
        resolver: zodResolver(leadFormSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            courseInterest: '',
            preferredTime: '',
            stateId: '',
            consent: false,
            source,
            sourceDetail,
            collegeSlug,
            examSlug,
            idempotencyKey,
            website: '',
        },
    });

    useEffect(() => {
        mountedAt.current = Date.now();
    }, []);

    const onFirstInteraction = () => {
        if (startedTracked.current) return;
        startedTracked.current = true;
        track({ name: ANALYTICS_EVENTS.counsellingFormStart, properties: { source } });
    };

    const onSubmit = async (values: LeadFormValues) => {
        setServerError(null);
        const utm = captureUtm();

        const result = await submitLeadAction({
            ...values,
            elapsedMs: Date.now() - mountedAt.current,
            utm: {
                source: utm.utm_source,
                medium: utm.utm_medium,
                campaign: utm.utm_campaign,
                term: utm.utm_term,
                content: utm.utm_content,
                gclid: utm.gclid,
                fbclid: utm.fbclid,
                referrer: utm.referrer,
                landingPage: utm.landing_page,
            },
        });

        if (result.ok) {
            setSuccess({ reference: result.data.reference, message: result.data.message });
            track({
                name: ANALYTICS_EVENTS.counsellingFormSubmit,
                properties: { source, reference: result.data.reference },
            });
            reset();
            return;
        }

        if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                setError(field as keyof LeadFormValues, { message: messages[0] });
            });
        }
        setServerError(result.error);
    };

    if (success) {
        return (
            <div
                className={cn(
                    'rounded-panel p-5 text-center',
                    dark ? 'bg-navy-800 text-white' : 'border border-line bg-white',
                    className,
                )}
            >
                <span
                    className={cn(
                        'mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full',
                        dark ? 'bg-green/20 text-green' : 'bg-green-50 text-green',
                    )}
                >
                    <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <h3 className={cn('mt-3 text-[16px] font-bold', dark && 'text-white')}>Request confirmed</h3>
                <p className={cn('mt-1 text-[13px]', dark ? 'text-white/75' : 'text-ink-soft')}>
                    {success.message}
                </p>
                <p className={cn('mt-2 text-[12px]', dark ? 'text-white/60' : 'text-ink-soft')}>
                    Reference: <span className="font-bold">{success.reference}</span>
                </p>
                <Button
                    variant={dark ? 'outlineWhite' : 'outline'}
                    size="sm"
                    className="mt-4"
                    onClick={() => setSuccess(null)}
                >
                    Submit another request
                </Button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-panel',
                dark
                    ? 'bg-navy-800 p-4 text-white shadow-[0_20px_45px_-25px_rgba(4,28,70,0.85)] md:p-5'
                    : 'border border-line bg-white p-4 shadow-card md:p-5',
                className,
            )}
        >
            <div className="mb-3.5">
                <h2 className={cn('text-[16px] font-extrabold leading-tight', dark ? 'text-white' : 'text-ink')}>
                    {title}
                </h2>
                {subtitle ? (
                    <p className={cn('mt-1 text-[12px]', dark ? 'text-white/70' : 'text-ink-soft')}>{subtitle}</p>
                ) : null}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} onFocus={onFirstInteraction} className="space-y-2.5" noValidate>
                <div>
                    <label htmlFor="lead-name" className="sr-only">
                        Your name
                    </label>
                    <Input
                        id="lead-name"
                        tone={dark ? 'dark' : 'light'}
                        placeholder="Your Name"
                        autoComplete="name"
                        invalid={Boolean(errors.name)}
                        {...register('name')}
                    />
                    <FieldError message={errors.name?.message} />
                </div>

                <div>
                    <label htmlFor="lead-phone" className="sr-only">
                        Mobile number
                    </label>
                    <Input
                        id="lead-phone"
                        type="tel"
                        inputMode="numeric"
                        tone={dark ? 'dark' : 'light'}
                        placeholder="Mobile Number"
                        autoComplete="tel"
                        invalid={Boolean(errors.phone)}
                        {...register('phone')}
                    />
                    <FieldError message={errors.phone?.message} />
                </div>

                {showEmail ? (
                    <div>
                        <label htmlFor="lead-email" className="sr-only">
                            Email address
                        </label>
                        <Input
                            id="lead-email"
                            type="email"
                            tone={dark ? 'dark' : 'light'}
                            placeholder="Email Address"
                            autoComplete="email"
                            invalid={Boolean(errors.email)}
                            {...register('email')}
                        />
                        <FieldError message={errors.email?.message} />
                    </div>
                ) : null}

                <div>
                    <label htmlFor="lead-course" className="sr-only">
                        Course of interest
                    </label>
                    <Select
                        id="lead-course"
                        tone={dark ? 'dark' : 'light'}
                        placeholder="Select Course of Interest"
                        options={courses.map((c) => ({ label: c.label, value: c.value }))}
                        invalid={Boolean(errors.courseInterest)}
                        {...register('courseInterest')}
                    />
                    <FieldError message={errors.courseInterest?.message} />
                </div>

                <div>
                    <label htmlFor="lead-time" className="sr-only">
                        Preferred time
                    </label>
                    <Select
                        id="lead-time"
                        tone={dark ? 'dark' : 'light'}
                        placeholder="Select Preferred Time"
                        options={PREFERRED_TIME_OPTIONS}
                        {...register('preferredTime')}
                    />
                </div>

                {showState && states.length > 0 ? (
                    <div>
                        <label htmlFor="lead-state" className="sr-only">
                            State
                        </label>
                        <Select
                            id="lead-state"
                            tone={dark ? 'dark' : 'light'}
                            placeholder="Select State"
                            options={states.map((s) => ({ label: s.label, value: s.value }))}
                            {...register('stateId')}
                        />
                    </div>
                ) : null}

                {/* Honeypot: visually hidden, not display:none, so bots still fill it */}
                <div aria-hidden className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden">
                    <label htmlFor="lead-website">Website</label>
                    <input id="lead-website" tabIndex={-1} autoComplete="off" {...register('website')} />
                </div>

                <div className="flex items-start gap-2 pt-0.5">
                    <Checkbox id="lead-consent" invalid={Boolean(errors.consent)} {...register('consent')} />
                    <label
                        htmlFor="lead-consent"
                        className={cn('text-[10.5px] leading-relaxed', dark ? 'text-white/65' : 'text-ink-soft')}
                    >
                        {consentText}
                    </label>
                </div>
                <FieldError message={errors.consent?.message} />

                {serverError ? (
                    <p role="alert" className={cn('text-[12px] font-semibold', dark ? 'text-orange-200' : 'text-red-alert')}>
                        {serverError}
                    </p>
                ) : null}

                <Button type="submit" variant="primary" size="lg" full loading={isSubmitting} loadingText="Submitting…">
                    {submitLabel}
                    <CalendarCheck className="h-4 w-4" aria-hidden />
                </Button>
            </form>

            {badges.length > 0 ? (
                <div
                    className={cn(
                        'mt-3 flex items-center justify-between gap-2 border-t pt-3',
                        dark ? 'border-white/10' : 'border-line',
                    )}
                >
                    {badges.map((badge) => (
                        <span
                            key={badge.label}
                            className={cn(
                                'flex items-center gap-1 text-[10.5px] font-semibold',
                                dark ? 'text-white/75' : 'text-ink-soft',
                            )}
                        >
                            <Icon name={badge.icon} className={cn('h-3 w-3', dark ? 'text-green' : 'text-green')} />
                            {badge.label}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
