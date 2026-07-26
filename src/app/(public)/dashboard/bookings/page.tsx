import Link from 'next/link';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { BookingActions } from '@/components/dashboard/booking-actions';
import { requireAuthPage } from '@/lib/auth/session';
import { getBookingsForUser } from '@/services/counselling.service';
import { formatDate } from '@/lib/utils';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'neutral' | 'navy'> = {
    confirmed: 'green',
    requested: 'amber',
    rescheduled: 'amber',
    completed: 'navy',
    cancelled: 'red',
    no_show: 'red',
};

export default async function BookingsPage() {
    const actor = await requireAuthPage();
    const bookings = await getBookingsForUser(actor.id);

    if (bookings.length === 0) {
        return (
            <SectionCard title="My bookings" icon="CalendarCheck">
                <EmptyState
                    icon="CalendarCheck"
                    title="No counselling sessions yet"
                    description="Book a free session — our counsellors work on live admissions every season."
                    action={
                        <Link
                            href="/book-counselling"
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white"
                        >
                            Book free counselling
                        </Link>
                    }
                />
            </SectionCard>
        );
    }

    return (
        <SectionCard title="My bookings" icon="CalendarCheck" description={`${bookings.length} sessions`}>
            <ul className="space-y-3">
                {bookings.map((booking) => {
                    const upcoming =
                        booking.scheduledAt &&
                        new Date(booking.scheduledAt).getTime() > Date.now() &&
                        !['cancelled', 'completed'].includes(booking.status);

                    return (
                        <li key={String(booking._id)} className="rounded-[12px] border border-line p-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-extrabold capitalize text-ink">
                                        {booking.type} counselling
                                        {booking.counsellorName ? ` • ${booking.counsellorName}` : ''}
                                    </p>
                                    <p className="mt-0.5 text-[11.5px] text-ink-soft">
                                        {formatDate(booking.scheduledAt, {
                                            weekday: 'short',
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}{' '}
                                        • {booking.durationMinutes} min • {booking.mode}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-ink-soft">Reference {booking.reference}</p>
                                </div>
                                <Badge tone={STATUS_TONE[booking.status] ?? 'neutral'}>{booking.status.replace('_', ' ')}</Badge>
                            </div>

                            {booking.studentSummary ? (
                                <p className="mt-2 rounded-[9px] bg-muted/60 px-3 py-2 text-[12px] text-ink">
                                    <span className="font-bold">Counsellor summary: </span>
                                    {booking.studentSummary}
                                </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {upcoming && booking.meetingLink ? (
                                    <a
                                        href={booking.meetingLink}
                                        className="inline-flex h-9 items-center rounded-[9px] bg-navy px-3.5 text-[12px] font-bold text-white hover:bg-navy-800"
                                    >
                                        Join session
                                    </a>
                                ) : null}
                                <BookingActions
                                    bookingId={String(booking._id)}
                                    canModify={Boolean(upcoming)}
                                    canReview={booking.status === 'completed' && !booking.feedback?.rating}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </SectionCard>
    );
}
