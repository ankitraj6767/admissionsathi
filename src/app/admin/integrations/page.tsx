import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { requirePermissionPage } from '@/lib/auth/session';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Integrations' };

export default async function AdminIntegrationsPage() {
    await requirePermissionPage('integration.manage');

    const integrations = [
        {
            name: 'Database',
            provider: 'MongoDB Atlas (Mongoose)',
            configured: true,
            note: 'Server-only connection with a cached pool. The browser never connects directly.',
            envKeys: ['MONGODB_URI', 'MONGODB_DB_NAME'],
        },
        {
            name: 'Authentication',
            provider: 'Auth.js (credentials + Google)',
            configured: Boolean(env.AUTH_SECRET),
            note: env.AUTH_GOOGLE_ID ? 'Google OAuth is enabled.' : 'Google OAuth is not configured — email sign-in only.',
            envKeys: ['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'],
        },
        {
            name: 'Media storage',
            provider: env.STORAGE_PROVIDER,
            configured: env.STORAGE_PROVIDER !== 'local',
            note:
                env.STORAGE_PROVIDER === 'local'
                    ? 'Uploads are written to /public/uploads. Configure Cloudinary or S3 before production.'
                    : 'Signed uploads through the configured provider.',
            envKeys: ['STORAGE_PROVIDER', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
        },
        {
            name: 'Email',
            provider: env.EMAIL_PROVIDER,
            configured: env.EMAIL_PROVIDER !== 'console',
            note:
                env.EMAIL_PROVIDER === 'console'
                    ? 'Emails are logged to the server console instead of being delivered.'
                    : 'Live delivery enabled.',
            envKeys: ['EMAIL_PROVIDER', 'EMAIL_FROM', 'RESEND_API_KEY'],
        },
        {
            name: 'WhatsApp',
            provider: env.WHATSAPP_PROVIDER,
            configured: env.WHATSAPP_PROVIDER !== 'console',
            note:
                env.WHATSAPP_PROVIDER === 'console'
                    ? 'WhatsApp messages are logged instead of sent.'
                    : 'Live delivery through the configured business account.',
            envKeys: ['WHATSAPP_PROVIDER', 'WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
        },
        {
            name: 'SMS',
            provider: env.SMS_PROVIDER,
            configured: env.SMS_PROVIDER !== 'console',
            note: 'Used for OTP login once enabled and for booking reminders.',
            envKeys: ['SMS_PROVIDER', 'SMS_API_KEY', 'SMS_SENDER_ID'],
        },
        {
            name: 'AI assistant',
            provider: env.AI_PROVIDER,
            configured:
                (env.AI_PROVIDER === 'nvidia' && Boolean(env.NVIDIA_API_KEY)) ||
                (env.AI_PROVIDER === 'openai' && Boolean(env.OPENAI_API_KEY)) ||
                (env.AI_PROVIDER === 'anthropic' && Boolean(env.ANTHROPIC_API_KEY)),
            note:
                env.AI_PROVIDER === 'mock'
                    ? 'The assistant answers from platform content only, with no external model call.'
                    : `Model: ${env.AI_MODEL}. Missing credentials safely fall back to extractive platform answers.`,
            envKeys: [
                'AI_PROVIDER',
                'AI_MODEL',
                'NVIDIA_API_KEY',
                'NVIDIA_BASE_URL',
                'OPENAI_API_KEY',
                'ANTHROPIC_API_KEY',
            ],
        },
        {
            name: 'Analytics',
            provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDERS ?? 'first-party',
            configured: true,
            note: 'First-party collector always on. GA4, GTM and Meta Pixel load only when their IDs are set.',
            envKeys: ['NEXT_PUBLIC_ANALYTICS_PROVIDERS', 'NEXT_PUBLIC_GA_MEASUREMENT_ID', 'NEXT_PUBLIC_GTM_ID'],
        },
        {
            name: 'Rate limiting cache',
            provider: env.UPSTASH_REDIS_REST_URL ? 'Upstash Redis' : 'In-memory (single instance)',
            configured: Boolean(env.UPSTASH_REDIS_REST_URL),
            note: env.UPSTASH_REDIS_REST_URL
                ? 'Distributed rate limiting active.'
                : 'Set UPSTASH_REDIS_REST_URL in production so limits apply across instances.',
            envKeys: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
        },
    ];

    return (
        <>
            <AdminPageHeader
                title="Integrations"
                description="Adapter status for every external provider. Credentials are read from environment variables and are never displayed or stored in the database."
                icon="Cog"
                breadcrumbs={[{ label: 'Integrations' }]}
            />

            <ul className="grid gap-3 md:grid-cols-2">
                {integrations.map((integration) => (
                    <li key={integration.name}>
                        <SectionCard title={integration.name} icon="Cog">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge tone={integration.configured ? 'green' : 'amber'} size="lg">
                                    {integration.configured ? 'Configured' : 'Development default'}
                                </Badge>
                                <span className="text-[12px] font-semibold text-ink">{integration.provider}</span>
                            </div>
                            <p className="text-[12px] text-ink-soft">{integration.note}</p>
                            <p className="mt-2 flex flex-wrap gap-1.5">
                                {integration.envKeys.map((key) => (
                                    <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft">
                                        {key}
                                    </code>
                                ))}
                            </p>
                        </SectionCard>
                    </li>
                ))}
            </ul>
        </>
    );
}
