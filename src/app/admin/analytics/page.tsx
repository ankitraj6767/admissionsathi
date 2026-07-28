import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { EventBarChart, LeadTrendChart, SourceBreakdownChart } from '@/components/admin/dashboard-charts-lazy';
import { Badge, EmptyState, IconTile } from '@/components/ui/primitives';
import {
    getDashboardOverview,
    getEventCounts,
    getEventTrend,
    getTopPages,
} from '@/services/analytics.service';
import { leadCountsBySource, leadCountsByStatus, leadTrend } from '@/db/repositories/lead.repository';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { LEAD_STATUS_LABELS, type LeadStatus } from '@/config/constants';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AdminAnalyticsPage() {
    await requirePermissionPage('analytics.view');

    const [overview, trend, sources, statuses, events, pageViews, topPages] = await Promise.all([
        getDashboardOverview(),
        leadTrend(30),
        leadCountsBySource(30),
        leadCountsByStatus(),
        getEventCounts(30),
        getEventTrend(ANALYTICS_EVENTS.pageView, 30),
        getTopPages(30, 12),
    ]);

    const funnel = [
        { label: 'Page views (30d)', value: pageViews.reduce((sum, row) => sum + row.count, 0), icon: 'Eye' },
        { label: 'Searches', value: overview.search.total, icon: 'Search' },
        { label: 'Predictor runs', value: overview.predictor.sessions, icon: 'Target' },
        { label: 'Leads', value: overview.leads.total, icon: 'Megaphone' },
        { label: 'Bookings', value: overview.bookings.total, icon: 'CalendarCheck' },
        { label: 'Converted', value: overview.leads.converted, icon: 'CheckCircle2' },
    ];

    return (
        <>
            <AdminPageHeader
                title="Analytics"
                description="First-party analytics captured by the platform. Third-party providers (GA4, GTM, Meta) run in parallel through the analytics adapter when configured."
                icon="BarChart3"
                breadcrumbs={[{ label: 'Analytics' }]}
            />

            <ul className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {funnel.map((step) => (
                    <li key={step.label} className="rounded-panel border border-line bg-white p-3.5 shadow-card">
                        <IconTile icon={step.icon} tone="navy" size="sm" />
                        <p className="mt-2 text-[18px] font-extrabold leading-none text-navy-800">
                            {step.value.toLocaleString('en-IN')}
                        </p>
                        <p className="mt-1 text-[10.5px] text-ink-soft">{step.label}</p>
                    </li>
                ))}
            </ul>

            <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <SectionCard title="Lead volume — last 30 days" icon="TrendingUp">
                    <LeadTrendChart data={trend} />
                </SectionCard>
                <SectionCard title="Lead sources" icon="Share2">
                    {sources.length === 0 ? (
                        <EmptyState icon="Share2" title="No lead data yet" className="py-8" />
                    ) : (
                        <SourceBreakdownChart data={sources} />
                    )}
                </SectionCard>
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-2">
                <SectionCard title="Tracked events — last 30 days" icon="BarChart3">
                    {events.length === 0 ? (
                        <EmptyState
                            icon="BarChart3"
                            title="No events recorded yet"
                            description="Events are collected as visitors search, view colleges, run predictors and submit forms."
                            className="py-8"
                        />
                    ) : (
                        <EventBarChart data={events.slice(0, 12)} />
                    )}
                </SectionCard>

                <SectionCard title="Lead pipeline" icon="Users">
                    <ul className="divide-y divide-line text-[12.5px]">
                        {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((status) => (
                            <li key={status} className="flex items-center justify-between gap-2 py-2">
                                <span className="text-ink">{LEAD_STATUS_LABELS[status]}</span>
                                <Badge tone={status === 'converted' ? 'green' : status === 'lost' ? 'red' : 'neutral'}>
                                    {statuses[status] ?? 0}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-[12px] text-ink-soft">
                        Conversion rate: <span className="font-bold text-ink">{overview.leads.conversionRate}%</span>
                    </p>
                </SectionCard>
            </div>

            <SectionCard title="Top pages — last 30 days" icon="Eye">
                {topPages.length === 0 ? (
                    <EmptyState icon="Eye" title="No page views recorded yet" className="py-8" />
                ) : (
                    <ul className="divide-y divide-line text-[12.5px]">
                        {topPages.map((page) => (
                            <li key={page._id} className="flex items-center justify-between gap-2 py-2">
                                <span className="truncate text-ink">{page._id}</span>
                                <span className="shrink-0 font-bold text-navy-700">{page.count.toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>
        </>
    );
}
