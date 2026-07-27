import Link from 'next/link';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState, IconTile } from '@/components/ui/primitives';
import { requireAuthPage } from '@/lib/auth/session';
import { listSavedItems } from '@/services/saved.service';
import { getBookingsForUser } from '@/services/counselling.service';
import { listUserPredictionSessions } from '@/services/predictor.service';
import { listUserLoanCalculations } from '@/services/finance.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default async function DashboardOverviewPage() {
    const actor = await requireAuthPage();

    const [saved, bookings, predictions, loans] = await Promise.all([
        listSavedItems(actor.id, { limit: 6 }),
        getBookingsForUser(actor.id),
        listUserPredictionSessions(actor.id, 5),
        listUserLoanCalculations(actor.id, 5),
    ]);

    const upcoming = bookings.filter(
        (b) => b.scheduledAt && new Date(b.scheduledAt).getTime() > Date.now() && b.status !== 'cancelled',
    );

    const stats = [
        { label: 'Saved items', value: saved.length, icon: 'Bookmark', href: '/dashboard/saved' },
        { label: 'Bookings', value: bookings.length, icon: 'CalendarCheck', href: '/dashboard/bookings' },
        { label: 'Predictor runs', value: predictions.length, icon: 'Target', href: '/dashboard/predictions' },
        { label: 'Loan calculations', value: loans.length, icon: 'Calculator', href: '/dashboard/loans' },
    ];

    return (
        <div className="space-y-4">
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((stat) => (
                    <li key={stat.label}>
                        <Link
                            href={stat.href}
                            className="flex h-full items-center gap-3 rounded-panel border border-line bg-white p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200"
                        >
                            <IconTile icon={stat.icon} tone="navy" />
                            <span>
                                <span className="block text-[18px] font-extrabold leading-none text-navy-800">{stat.value}</span>
                                <span className="mt-1 block text-[11px] text-ink-soft">{stat.label}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            <SectionCard
                title="Upcoming sessions"
                icon="CalendarCheck"
                actions={
                    <Link href="/dashboard/bookings" className="link-more">
                        All bookings →
                    </Link>
                }
            >
                {upcoming.length === 0 ? (
                    <EmptyState
                        icon="CalendarCheck"
                        title="No upcoming sessions"
                        description="Book a free counselling session whenever you need guidance."
                        action={
                            <Link
                                href="/book-counselling"
                                className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white"
                            >
                                Book free counselling
                            </Link>
                        }
                    />
                ) : (
                    <ul className="space-y-2">
                        {upcoming.slice(0, 3).map((booking) => (
                            <li
                                key={String(booking._id)}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-bold text-ink">
                                        {booking.type} counselling
                                        {booking.counsellorName ? ` with ${booking.counsellorName}` : ''}
                                    </p>
                                    <p className="text-[11px] text-ink-soft">
                                        {formatDate(booking.scheduledAt, {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}{' '}
                                        • Ref {booking.reference}
                                    </p>
                                </div>
                                <Badge tone={booking.status === 'confirmed' ? 'green' : 'amber'}>{booking.status}</Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard
                    title="Recently saved"
                    icon="Bookmark"
                    actions={
                        <Link href="/dashboard/saved" className="link-more">
                            View all →
                        </Link>
                    }
                >
                    {saved.length === 0 ? (
                        <EmptyState icon="Bookmark" title="Nothing saved yet" className="py-8" />
                    ) : (
                        <ul className="space-y-1.5">
                            {saved.map((item) => (
                                <li key={item.id}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center justify-between gap-2 rounded-[9px] px-2 py-1.5 hover:bg-muted"
                                    >
                                        <span className="truncate text-[12.5px] font-semibold text-ink">{item.entityName}</span>
                                        <Badge tone="neutral">{item.entityType}</Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title="Latest predictor runs"
                    icon="Target"
                    actions={
                        <Link href="/dashboard/predictions" className="link-more">
                            View all →
                        </Link>
                    }
                >
                    {predictions.length === 0 ? (
                        <EmptyState icon="Target" title="No predictions yet" className="py-8" />
                    ) : (
                        <ul className="space-y-1.5">
                            {predictions.map((session) => (
                                <li
                                    key={String(session._id)}
                                    className="flex items-center justify-between gap-2 rounded-[9px] px-2 py-1.5"
                                >
                                    <span className="truncate text-[12.5px] font-semibold text-ink">
                                        {session.predictorSlug.replace(/-/g, ' ')}
                                    </span>
                                    <span className="shrink-0 text-[11px] text-ink-soft">
                                        {session.resultCount} results • {formatDate(session.createdAt)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>

            {loans.length > 0 ? (
                <SectionCard title="Loan calculations" icon="Calculator">
                    <ul className="space-y-1.5">
                        {loans.map((loan) => (
                            <li
                                key={String(loan._id)}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] border border-line px-3 py-2 text-[12px]"
                            >
                                <span className="font-semibold text-ink">
                                    {formatCurrency(loan.loanAmount)} @ {loan.interestRate}% for {loan.tenureMonths / 12} yrs
                                </span>
                                <span className="text-ink-soft">
                                    EMI {formatCurrency(loan.emi)} • total {formatCurrency(loan.totalRepayment)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            ) : null}
        </div>
    );
}
