import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/signup-form';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
    title: 'Create your account',
    description: 'Create a free Admission Sathi account to save colleges and track counselling.',
    path: '/signup',
    noIndex: true,
});

export default function SignupPage() {
    return <SignupForm />;
}
