'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { forgotPasswordSchema } from '@/schemas/auth.schema';
import { requestPasswordResetAction } from '@/actions/account.actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import type { z } from 'zod';

type FormValues = z.input<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

    const onSubmit = async (values: FormValues) => {
        setError(null);
        const result = await requestPasswordResetAction(values);
        if (result.ok) setMessage(result.message ?? 'Check your inbox for the reset link.');
        else setError(result.error);
    };

    if (message) {
        return (
            <p className="mt-6 rounded-[10px] border border-green/30 bg-green-50 px-3 py-3 text-[12.5px] font-semibold text-green">
                {message}
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5" noValidate>
            <Field label="Email address" htmlFor="fp-email" required error={errors.email?.message}>
                <Input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    invalid={Boolean(errors.email)}
                    {...register('email')}
                />
            </Field>

            {error ? (
                <p role="alert" className="text-[12.5px] font-semibold text-red-alert">
                    {error}
                </p>
            ) : null}

            <Button type="submit" variant="primary" size="lg" full loading={isSubmitting} loadingText="Sending…">
                <Mail className="h-4 w-4" aria-hidden />
                Send reset link
            </Button>
        </form>
    );
}
