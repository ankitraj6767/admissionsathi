import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { authProviders } from '@/lib/auth';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
    title: 'Sign in',
    description: 'Sign in to your Admission Sathi account.',
    path: '/login',
    noIndex: true,
});

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const { callbackUrl } = await searchParams;
    return <LoginForm callbackUrl={callbackUrl} googleEnabled={authProviders.google} />;
}
