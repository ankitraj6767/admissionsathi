import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getNotificationQueue } from '@/services/notification.service';
import { requirePermissionPage } from '@/lib/auth/session';
import { formatRelativeTime } from '@/lib/utils';
import { Pagination } from '@/components/shared/pagination';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Notification queue' };

export default async function AdminNotificationsPage({
    searchParams,
}: {
    searchParams: Promise<{ state?: string; channel?: string; page?: string }>;
}) {
    await requirePermissionPage('notification.manage');
    const params = await searchParams;

    const { result, counts } = await getNotificationQueue(params);

    return (
        <>
            <AdminPageHeader
                title="Notification queue"
                description="Every queued, sent and failed message. Delivery is processed by the cron worker with exponential backoff — nothing blocks a user request."
                icon="BellRing"
                breadcrumbs={[{ label: 'Notifications' }]}
                actions={
                    <Link
                        href="/admin/email-templates"
                        className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13px] font-bold text-ink"
                    >
                        Manage templates
                    </Link>
                }
            />

            <div className="mb-3 flex flex-wrap gap-1.5">
                <Link href="/admin/notifications">
                    <Badge tone={!params.state ? 'solidNavy' : 'neutral'} size="lg">
                        All {result.total}
                    </Badge>
                </Link>
                {counts.map((row) => (
                    <Link key={row._id} href={`/admin/notifications?state=${row._id}`}>
                        <Badge
                            tone={
                                params.state === row._id
                                    ? 'solidNavy'
                                    : row._id === 'sent'
                                        ? 'green'
                                        : row._id === 'failed'
                                            ? 'red'
                                            : 'amber'
                            }
                            size="lg"
                        >
                            {row._id} {row.count}
                        </Badge>
                    </Link>
                ))}
            </div>

            <SectionCard title="Queue" icon="Send">
                {result.items.length === 0 ? (
                    <EmptyState
                        icon="BellRing"
                        title="Queue is empty"
                        description="Notifications appear here when leads, bookings and reminders are created."
                    />
                ) : (
                    <ul className="divide-y divide-line">
                        {result.items.map((notification) => (
                            <li key={String(notification._id)} className="py-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        tone={
                                            notification.state === 'sent'
                                                ? 'green'
                                                : notification.state === 'failed'
                                                    ? 'red'
                                                    : 'amber'
                                        }
                                    >
                                        {notification.state}
                                    </Badge>
                                    <Badge tone="neutral">{notification.channel}</Badge>
                                    <span className="font-mono text-[11px] text-navy-700">{notification.event}</span>
                                    <span className="ml-auto text-[11px] text-ink-soft">
                                        attempts {notification.attempts} • {formatRelativeTime(notification.createdAt)}
                                    </span>
                                </div>
                                <p className="mt-1 text-[12.5px] font-bold text-ink">{notification.title}</p>
                                <p className="text-[12px] text-ink-soft">{notification.body}</p>
                                {notification.lastError ? (
                                    <p className="mt-1 text-[11px] font-semibold text-red-alert">{notification.lastError}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination
                    className="mt-4"
                    basePath="/admin/notifications"
                    params={params as Record<string, string | undefined>}
                    page={result.page}
                    totalPages={result.totalPages}
                    total={result.total}
                    pageSize={result.pageSize}
                />
            </SectionCard>

            <SectionCard className="mt-4" title="Background worker" icon="Cog">
                <p className="text-[12.5px] text-ink-soft">
                    The worker endpoint is <code className="font-mono text-[11.5px]">POST /api/cron/notifications</code>{' '}
                    protected by the <code className="font-mono text-[11.5px]">CRON_SECRET</code> bearer token. On Vercel it
                    is scheduled by <code className="font-mono text-[11.5px]">vercel.json</code>; locally you can trigger it
                    manually with curl.
                </p>
            </SectionCard>
        </>
    );
}
