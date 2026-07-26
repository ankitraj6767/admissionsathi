import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { requireAuthPage } from '@/lib/auth/session';
import { listUserNotifications } from '@/services/notification.service';
import { toPlain } from '@/db/repositories/base.repository';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default async function NotificationsPage() {
    const actor = await requireAuthPage();
    const notifications = toPlain(await listUserNotifications(actor.id, 40));

    return (
        <SectionCard title="Notifications" icon="BellRing" description="In-app alerts for your account">
            {notifications.length === 0 ? (
                <EmptyState
                    icon="BellRing"
                    title="No notifications yet"
                    description="Booking confirmations, reminders and exam alerts will appear here."
                />
            ) : (
                <ul className="space-y-2">
                    {notifications.map((notification) => (
                        <li
                            key={String(notification._id)}
                            className="rounded-[10px] border border-line px-3 py-2.5"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-bold text-ink">{notification.title}</p>
                                    <p className="mt-0.5 text-[12px] text-ink-soft">{notification.body}</p>
                                </div>
                                <span className="flex shrink-0 items-center gap-2">
                                    {!notification.readAt ? <Badge tone="orange">New</Badge> : null}
                                    <span className="text-[11px] text-ink-soft">
                                        {formatRelativeTime(notification.createdAt)}
                                    </span>
                                </span>
                            </div>
                            {notification.actionUrl ? (
                                <Link
                                    href={notification.actionUrl}
                                    className="mt-1.5 inline-block text-[11.5px] font-bold text-navy-600 hover:text-orange"
                                >
                                    Open →
                                </Link>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}
