'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { newsletterSchema } from '@/schemas/lead.schema';
import { subscribeNewsletterAction } from '@/actions/lead.actions';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { z } from 'zod';

type FormValues = z.infer<typeof newsletterSchema>;

export function NewsletterForm() {
    const [done, setDone] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: '' } });

    const onSubmit = async (values: FormValues) => {
        setServerError(null);
        const result = await subscribeNewsletterAction(values);
        if (result.ok) {
            setDone(result.message ?? 'Subscribed.');
            track({ name: ANALYTICS_EVENTS.newsletterSubscribe });
            reset();
        } else {
            setServerError(result.error);
        }
    };

    if (done) {
        return (
            <p className="flex items-center gap-2 rounded-[10px] border border-green/30 bg-green/10 px-3 py-3 text-[12.5px] font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-green" aria-hidden />
                {done}
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                </label>
                <input
                    id="newsletter-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'newsletter-email-error' : undefined}
                    className="h-11 flex-1 rounded-[10px] border border-white/20 bg-white/10 px-3.5 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/45 focus:ring-2 focus:ring-white/20"
                    {...register('email')}
                />
                <Button type="submit" variant="primary" size="md" loading={isSubmitting} className="sm:w-auto">
                    Subscribe
                    <Send className="h-4 w-4" aria-hidden />
                </Button>
            </div>
            {errors.email ? (
                <p id="newsletter-email-error" role="alert" className="text-[11.5px] font-medium text-orange-200">
                    {errors.email.message}
                </p>
            ) : null}
            {serverError ? (
                <p role="alert" className="text-[11.5px] font-medium text-orange-200">
                    {serverError}
                </p>
            ) : null}
        </form>
    );
}
