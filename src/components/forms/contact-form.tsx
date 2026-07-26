'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import {
    CONTACT_SUBJECT_OPTIONS,
    contactFormSchema,
    type ContactFormValues,
} from '@/schemas/contact.schema';
import { submitContactAction } from '@/actions/contact.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, FieldError, Input, Label, Select, Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export interface ContactFormProps {
    consentText: string;
    className?: string;
}

/**
 * Public contact form.
 * Mirrors the counselling form contract: client-side Zod validation for fast
 * feedback, the same honeypot + time-trap spam guard, and the Server Action as
 * the single source of truth for what actually gets stored.
 */
export function ContactForm({ consentText, className }: ContactFormProps) {
    const mountedAt = useRef<number>(Date.now());
    const [success, setSuccess] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ContactFormValues>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            subject: 'admission_help',
            message: '',
            consent: false,
            website: '',
        },
    });

    useEffect(() => {
        mountedAt.current = Date.now();
    }, []);

    const onSubmit = async (values: ContactFormValues) => {
        setServerError(null);

        const result = await submitContactAction({
            ...values,
            elapsedMs: Date.now() - mountedAt.current,
        });

        if (result.ok) {
            setSuccess(result.message ?? 'Message sent. Our team will reply shortly.');
            reset();
            return;
        }

        if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                setError(field as keyof ContactFormValues, { message: messages[0] });
            });
        }
        setServerError(result.error);
    };

    if (success) {
        return (
            <div
                className={cn(
                    'rounded-panel border border-line bg-white p-5 text-center shadow-card md:p-6',
                    className,
                )}
                role="status"
                aria-live="polite"
            >
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green">
                    <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-3 text-[16px] font-bold text-ink">Message sent</h2>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-soft">{success}</p>
                <Button variant="outline" size="md" className="mt-4" onClick={() => setSuccess(null)}>
                    Send another message
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('rounded-panel border border-line bg-white p-4 shadow-card md:p-5', className)}>
            <div className="mb-4">
                <h2 className="text-[16px] font-extrabold leading-tight text-ink">Send us a message</h2>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                    Fill in the form and our support team will reply within one working day.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
                <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="contact-name" required>
                            Full name
                        </Label>
                        <Input
                            id="contact-name"
                            placeholder="e.g. Ananya Sharma"
                            autoComplete="name"
                            invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? 'contact-name-error' : undefined}
                            {...register('name')}
                        />
                        <FieldError id="contact-name-error" message={errors.name?.message} />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="contact-email" required>
                            Email address
                        </Label>
                        <Input
                            id="contact-email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? 'contact-email-error' : undefined}
                            {...register('email')}
                        />
                        <FieldError id="contact-email-error" message={errors.email?.message} />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="contact-phone">Mobile number (optional)</Label>
                        <Input
                            id="contact-phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="10-digit mobile number"
                            autoComplete="tel"
                            invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? 'contact-phone-error' : 'contact-phone-hint'}
                            {...register('phone')}
                        />
                        {errors.phone ? (
                            <FieldError id="contact-phone-error" message={errors.phone.message} />
                        ) : (
                            <p id="contact-phone-hint" className="text-[11.5px] text-ink-soft">
                                Add it if you would rather get a call back.
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="contact-subject" required>
                            What is this about?
                        </Label>
                        <Select
                            id="contact-subject"
                            options={CONTACT_SUBJECT_OPTIONS}
                            invalid={Boolean(errors.subject)}
                            aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                            {...register('subject')}
                        />
                        <FieldError id="contact-subject-error" message={errors.subject?.message} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="contact-message" required>
                        Your message
                    </Label>
                    <Textarea
                        id="contact-message"
                        rows={6}
                        placeholder="Share your question with as much detail as you can — course, exam, city or college names help us answer faster."
                        invalid={Boolean(errors.message)}
                        aria-describedby={errors.message ? 'contact-message-error' : undefined}
                        {...register('message')}
                    />
                    <FieldError id="contact-message-error" message={errors.message?.message} />
                </div>

                {/* Honeypot: visually hidden, not display:none, so bots still fill it */}
                <div aria-hidden className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden">
                    <label htmlFor="contact-website">Website</label>
                    <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
                </div>

                <div className="flex items-start gap-2.5 rounded-[10px] border border-line bg-muted/50 px-3 py-2.5">
                    <Checkbox
                        id="contact-consent"
                        className="h-5 w-5"
                        invalid={Boolean(errors.consent)}
                        aria-describedby={errors.consent ? 'contact-consent-error' : undefined}
                        {...register('consent')}
                    />
                    <label htmlFor="contact-consent" className="text-[11.5px] leading-relaxed text-ink-soft">
                        {consentText}
                    </label>
                </div>
                <FieldError id="contact-consent-error" message={errors.consent?.message} />

                {serverError ? (
                    <p role="alert" className="text-[12.5px] font-semibold text-red-alert">
                        {serverError}
                    </p>
                ) : null}

                <Button type="submit" variant="primary" size="lg" full loading={isSubmitting} loadingText="Sending…">
                    Send message
                    <Send className="h-4 w-4" aria-hidden />
                </Button>
            </form>
        </div>
    );
}
