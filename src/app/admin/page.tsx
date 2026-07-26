import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, IconTile } from '@/components/ui/primitives';
import { EventBarChart, LeadTrendChart, SourceBreakdownChart } from '@/components/admin/dashboard-charts';
import { requireStaffPage } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { getDashboardOverview, getEventCounts, getTopPages } from '@/services/analytics.service';
import { leadCountsBySource, leadTrend, listLeads } from '@/db/repositories/lead.repository';
import { listUpcomingExamDates } from '@/db/repositories/exam.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { connectToDatabase } from '@/db/connect';
import { College } from '@/db/models/college.model';
import { Article } from '@/db/models/content.model';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    const actor = await requireStaffPage();
    await connectToDatabase();

    const [overview, trend, sources, events, topPages, recentLeads, upcomingDates, recentColleges, recentArticles] =
        await Promise.all([
            getDashboardOverview(),
            leadTrend(14),
            leadCountsBySource(30),
            getEventCounts(30),
            getTopPages(30, 8),
            listLeads({ pageSize: 6 }).then((r) => toPlain(r.items)),
            listUpcomingExamDates(6).then(toPlain),
            College.find().sort({ updatedAt: -1 }).limit(5).select('name slug status updatedAt').lean().exec().then(toPlain),
            Article.find().sort({ updatedAt: -1 }).limit(5).select('title slug status updatedAt').lean().exec().then(toPlain),
        ]);

    const stats = [
        { label: 'Total users', value: overview.totals.users, icon: 'Users', href: '/admin/users', tone: 'navy' },
        { label: 'Colleges', value: overview.totals.colleges, icon: 'Building2', href: '/admin/colleges', tone: 'blue' },
        { label: 'Courses', value: overview.totals.courses, icon: 'GraduationCap', href: '/admin/courses', tone: 'teal' },
        { label: 'Exams', value: overview.totals.exams, icon: 'FileText', href: '/admin/exams', tone: 'purple' },
        { label: 'New leads', value: overview.leads.new, icon: 'Megaphone', href: '/admin/leads', tone: 'orange' },
        { label: 'Bookings', value: overview.bookings.total, icon: 'CalendarCheck', href: '/admin/counselling', tone: 'green' },
        { label: 'Predictor runs', value: overview.predictor.sessions, icon: 'Target', href: '/admin/predictors', tone: 'pink' },
        { label: 'Searches', value: overview.search.total, icon: 'Search', href: '/admin/search', tone: 'navy' },
    ];

    return (
        <>
            <AdminPageHeader
                title="Dashboard"
                description={`Signed in as ${actor.name} (${actor.roles.join(', ').replace(/_/g, ' ')}). Live platform metrics below.`}
                icon="LayoutDashboard"
            />

            <ul className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map((stat) => (
                    <li key={stat.label}>
                        <Link
                            href={stat.href}
                            className="flex h-full items-center gap-3 rounded-panel border border-line bg-white p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200"
                        >
                            <IconTile icon={stat.icon} tone={stat.tone} />
                            <span className="min-w-0">
                                <span className="block text-[19px] font-extrabold leading-none text-navy-800">
                                    {stat.value.toLocaleString('en-IN')}
                                </span>
                                <span className="mt-1 block truncate text-[11px] text-ink-soft">{stat.label}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <SectionCard
                    title="Leads — last 14 days"
                    icon="TrendingUp"
                    description={`${overview.leads.thisWeek} this week • ${overview.leads.conversionRate}% conversion rate`}
                >
                    <LeadTrendChart data={trend} />
                </SectionCard>

                <SectionCard title="Lead sources — last 30 days" icon="Share2">
                    {sources.length === 0 ? (
                        <p className="py-10 text-center text-[13px] text-ink-soft">No leads captured yet.</p>
                    ) : (
                        <SourceBreakdownChart data={sources} />
                    )}
                </SectionCard>
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <SectionCard
                    title="Recent leads"
                    icon="Users"
                    actions={
                        can(actor, 'lead.read') ? (
                            <Link href="/admin/leads" className="link-more">
                                All leads →
                            </Link>
                        ) : undefined
                    }
                >
                    {recentLeads.length === 0 ? (
                        <p className="py-8 text-center text-[13px] text-ink-soft">No leads yet.</p>
                    ) : (
                        <ul className="divide-y divide-line">
                            {recentLeads.map((lead) => (
                                <li key={String(lead._id)} className="flex items-center justify-between gap-2 py-2.5">
                                    <div className="min-w-0">
                                        <Link
                                            href={`/admin/leads/${String(lead._id)}`}
                                            className="block truncate text-[12.5px] font-bold text-ink hover:text-navy-700"
                                        >
                                            {lead.name}
                                        </Link>
                                        <p className="text-[11px] text-ink-soft">
                                            {lead.phone} • {lead.source.replace(/_/g, ' ')} • {formatRelativeTime(lead.createdAt)}
                                        </p>
                                    </div>
                                    <Badge tone={lead.status === 'new' ? 'orange' : lead.status === 'converted' ? 'green' : 'neutral'}>
                                        {lead.status.replace(/_/g, ' ')}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard title="Tracked events — last 30 days" icon="BarChart3">
                    {events.length === 0 ? (
                        <p className="py-8 text-center text-[13px] text-ink-soft">
                            No analytics events recorded yet. They appear as visitors use the site.
                        </p>
                    ) : (
                        <EventBarChart data={events.slice(0, 10)} />
                    )}
                </SectionCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <SectionCard title="Pending approvals" icon="ShieldCheck">
                    <ul className="space-y-2 text-[12.5px]">
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Reviews awaiting moderation</span>
                            <Link href="/admin/reviews?status=pending" className="font-bold text-navy-700 hover:text-orange">
                                {overview.pendingApprovals.reviews}
                            </Link>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Draft / in-review content</span>
                            <Link href="/admin/articles?status=draft" className="font-bold text-navy-700 hover:text-orange">
                                {overview.pendingApprovals.draftContent}
                            </Link>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Upcoming sessions</span>
                            <Link href="/admin/counselling" className="font-bold text-navy-700 hover:text-orange">
                                {overview.bookings.upcoming}
                            </Link>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                            <span className="text-ink-soft">Zero-result searches</span>
                            <Link href="/admin/search" className="font-bold text-navy-700 hover:text-orange">
                                {overview.search.zeroResults}
                            </Link>
                        </li>
                    </ul>
                </SectionCard>

                <SectionCard title="Recently updated content" icon="Pencil">
                    <ul className="space-y-1.5 text-[12.5px]">
                        {[...recentColleges.map((c) => ({
                            id: String(c._id),
                            label: c.name as string,
                            href: `/admin/colleges/${String(c._id)}`,
                            status: c.status as string,
                            updatedAt: String(c.updatedAt),
                        })),
                        ...recentArticles.map((a) => ({
                            id: String(a._id),
                            label: a.title as string,
                            href: `/admin/articles/${String(a._id)}`,
                            status: a.status as string,
                            updatedAt: String(a.updatedAt),
                        }))]
                            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                            .slice(0, 7)
                            .map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-2">
                                    <Link href={item.href} className="truncate font-semibold text-ink hover:text-navy-700">
                                        {item.label}
                                    </Link>
                                    <span className="shrink-0 text-[10.5px] text-ink-soft">{formatRelativeTime(item.updatedAt)}</span>
                                </li>
                            ))}
                    </ul>
                </SectionCard>

                <SectionCard title="Upcoming exam dates" icon="CalendarDays">
                    {upcomingDates.length === 0 ? (
                        <p className="py-8 text-center text-[13px] text-ink-soft">No upcoming dates recorded.</p>
                    ) : (
                        <ul className="space-y-1.5 text-[12.5px]">
                            {upcomingDates.map((date) => (
                                <li key={String(date._id)} className="flex items-center justify-between gap-2">
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold text-ink">{date.event}</span>
                                        <span className="block text-[10.5px] text-ink-soft">{date.examShortName}</span>
                                    </span>
                                    <span className="shrink-0 text-[11px] text-ink-soft">{formatDate(date.startDate)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>

            {topPages.length > 0 ? (
                <SectionCard className="mt-4" title="Top pages — last 30 days" icon="Eye">
                    <ul className="divide-y divide-line text-[12.5px]">
                        {topPages.map((page) => (
                            <li key={page._id} className="flex items-center justify-between gap-2 py-2">
                                <span className="truncate text-ink">{page._id}</span>
                                <span className="shrink-0 font-bold text-navy-700">{page.count.toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            ) : null}
        </>
    );
}
