import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
    title: 'Reset your password',
    description: 'Request a password reset link for your Admission Sathi account.',
    path: '/forgot-password',
    noIndex: true,
});

export default function ForgotPasswordPage() {
    return (
        <div>
            <h1 className="font-display text-[24px] font-extrabold text-navy-800">Reset your password</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
                Enter the email address on your account and we will send a reset link.
            </p>

            <ForgotPasswordForm />

            <p className="mt-5 text-center text-[12.5px] text-ink-soft">
                Remembered it?{' '}
                <Link href="/login" className="font-bold text-navy-600 hover:text-orange">
                    Back to sign in
                </Link>
            </p>
        </div>
    );
}
