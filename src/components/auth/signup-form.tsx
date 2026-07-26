'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { signUpSchema } from '@/schemas/auth.schema';
import { loginAction, signUpAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';
import type { z } from 'zod';

type FormValues = z.input<typeof signUpSchema>;

export function SignupForm() {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
            marketingOptIn: true,
        },
    });

    const onSubmit = async (values: FormValues) => {
        setServerError(null);
        const result = await signUpAction(values);

        if (!result.ok) {
            if (result.fieldErrors) {
                Object.entries(result.fieldErrors).forEach(([field, messages]) =>
                    setError(field as keyof FormValues, { message: messages[0] }),
                );
            }
            setServerError(result.error);
            return;
        }

        setDone(true);

        // Sign the new user straight in.
        const login = await loginAction({
            email: values.email,
            password: values.password,
            callbackUrl: '/dashboard',
        });
        if (login.ok) {
            router.push(login.data.redirectTo);
            router.refresh();
        }
    };

    if (done) {
        return (
            <div className="rounded-panel border border-green/30 bg-green-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green" aria-hidden />
                <h1 className="mt-2 text-[18px] font-extrabold text-navy-800">Account created</h1>
                <p className="mt-1 text-[13px] text-ink-soft">
                    Signing you in… If nothing happens,{' '}
                    <Link href="/login" className="font-bold text-navy-600">
                        sign in here
                    </Link>
                    .
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="font-display text-[24px] font-extrabold text-navy-800">Create your free account</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
                Save colleges, run predictors and manage your counselling sessions.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5" noValidate>
                <Field label="Full name" htmlFor="su-name" required error={errors.name?.message}>
                    <Input id="su-name" autoComplete="name" invalid={Boolean(errors.name)} {...register('name')} />
                </Field>

                <Field label="Email address" htmlFor="su-email" required error={errors.email?.message}>
                    <Input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        invalid={Boolean(errors.email)}
                        {...register('email')}
                    />
                </Field>

                <Field label="Mobile number" htmlFor="su-phone" error={errors.phone?.message} hint="Optional, used for counselling calls">
                    <Input id="su-phone" type="tel" inputMode="numeric" autoComplete="tel" {...register('phone')} />
                </Field>

                <Field
                    label="Password"
                    htmlFor="su-password"
                    required
                    error={errors.password?.message}
                    hint="At least 8 characters with one uppercase letter and one number"
                >
                    <Input
                        id="su-password"
                        type="password"
                        autoComplete="new-password"
                        invalid={Boolean(errors.password)}
                        {...register('password')}
                    />
                </Field>

                <Field label="Confirm password" htmlFor="su-confirm" required error={errors.confirmPassword?.message}>
                    <Input
                        id="su-confirm"
                        type="password"
                        autoComplete="new-password"
                        invalid={Boolean(errors.confirmPassword)}
                        {...register('confirmPassword')}
                    />
                </Field>

                <label className="flex items-start gap-2 text-[11.5px] text-ink-soft">
                    <Checkbox invalid={Boolean(errors.acceptTerms)} {...register('acceptTerms')} />
                    <span>
                        I accept the{' '}
                        <Link href="/terms-of-use" className="font-semibold text-navy-600 hover:text-orange">
                            terms of use
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy-policy" className="font-semibold text-navy-600 hover:text-orange">
                            privacy policy
                        </Link>
                        .
                    </span>
                </label>
                {errors.acceptTerms ? (
                    <p role="alert" className="text-[11.5px] font-semibold text-red-alert">
                        {errors.acceptTerms.message}
                    </p>
                ) : null}

                <label className="flex items-start gap-2 text-[11.5px] text-ink-soft">
                    <Checkbox {...register('marketingOptIn')} />
                    Send me exam alerts and admission deadline reminders.
                </label>

                {serverError ? (
                    <p role="alert" className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-alert">
                        {serverError}
                    </p>
                ) : null}

                <Button type="submit" variant="primary" size="lg" full loading={isSubmitting} loadingText="Creating account…">
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Create free account
                </Button>
            </form>

            <p className="mt-5 text-center text-[12.5px] text-ink-soft">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-navy-600 hover:text-orange">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
