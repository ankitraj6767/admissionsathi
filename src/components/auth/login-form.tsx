'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { loginSchema } from '@/schemas/auth.schema';
import { googleSignInAction, loginAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import type { z } from 'zod';

type FormValues = z.input<typeof loginSchema>;

export function LoginForm({
    callbackUrl,
    googleEnabled,
}: {
    callbackUrl?: string;
    googleEnabled: boolean;
}) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '', callbackUrl },
    });

    const onSubmit = async (values: FormValues) => {
        setServerError(null);
        const result = await loginAction(values);
        if (result.ok) {
            router.push(result.data.redirectTo);
            router.refresh();
            return;
        }
        if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) =>
                setError(field as keyof FormValues, { message: messages[0] }),
            );
        }
        setServerError(result.error);
    };

    return (
        <div>
            <h1 className="font-display text-[24px] font-extrabold text-navy-800">Welcome back</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
                Sign in to track your saved colleges, predictions and counselling sessions.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5" noValidate>
                <input type="hidden" {...register('callbackUrl')} />

                <Field label="Email address" htmlFor="login-email" required error={errors.email?.message}>
                    <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        invalid={Boolean(errors.email)}
                        {...register('email')}
                    />
                </Field>

                <Field label="Password" htmlFor="login-password" required error={errors.password?.message}>
                    <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        invalid={Boolean(errors.password)}
                        {...register('password')}
                    />
                </Field>

                <div className="flex items-center justify-between">
                    <Link href="/forgot-password" className="text-[12px] font-semibold text-navy-600 hover:text-orange">
                        Forgot password?
                    </Link>
                </div>

                {serverError ? (
                    <p role="alert" className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-alert">
                        {serverError}
                    </p>
                ) : null}

                <Button type="submit" variant="primary" size="lg" full loading={isSubmitting} loadingText="Signing in…">
                    <LogIn className="h-4 w-4" aria-hidden />
                    Sign in
                </Button>
            </form>

            {googleEnabled ? (
                <>
                    <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-line" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">or</span>
                        <span className="h-px flex-1 bg-line" />
                    </div>

                    <form action={googleSignInAction}>
                        <Button type="submit" variant="outline" size="lg" full>
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                                <path
                                    fill="#4285F4"
                                    d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.3 3.8l-.1.1 3.4 2.6c2-1.8 3-4.5 3-8.4Z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 24c3.1 0 5.7-1 7.5-2.8l-3.6-2.7c-1 .7-2.3 1.2-3.9 1.2-3 0-5.6-2-6.5-4.8l-.1.1-3.5 2.7C3.7 21.3 7.6 24 12 24Z"
                                />
                                <path fill="#FBBC05" d="M5.5 14.9c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.6C1.1 9 .6 10.7.6 12.6c0 1.9.5 3.6 1.3 5l3.6-2.7Z" />
                                <path
                                    fill="#EA4335"
                                    d="M12 4.7c2.1 0 3.6.9 4.4 1.7l3.2-3.1C17.6 1.4 15.1.3 12 .3 7.6.3 3.7 3 1.9 7.6l3.6 2.7C6.4 7.5 9 4.7 12 4.7Z"
                                />
                            </svg>
                            Continue with Google
                        </Button>
                    </form>
                </>
            ) : null}

            <p className="mt-5 text-center text-[12.5px] text-ink-soft">
                New to Admission Sathi?{' '}
                <Link href="/signup" className="font-bold text-navy-600 hover:text-orange">
                    Create a free account
                </Link>
            </p>

            <p className="mt-4 rounded-[10px] border border-line bg-white px-3 py-2 text-[11px] text-ink-soft">
                Mobile OTP sign-in is architected and ready to enable once an SMS provider is configured.
            </p>
        </div>
    );
}
