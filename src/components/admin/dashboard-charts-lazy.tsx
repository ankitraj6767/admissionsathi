'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side entry point for the dashboard charts.
 *
 * Recharts is the single largest dependency in the admin bundle, and it was a
 * static import in `/admin` and `/admin/analytics` — the two pages staff land on
 * first. The charts sit below the stat tiles, so nothing above the fold needs
 * them, and they render no meaningful HTML on the server anyway (an SVG chart
 * without measurements). Loading them after hydration takes recharts off the
 * critical path for both pages without changing a single chart.
 */

function ChartFallback() {
    return <div className="skeleton h-[220px] w-full rounded-[12px]" aria-hidden />;
}

export const LeadTrendChart = dynamic(
    () => import('./dashboard-charts').then((m) => m.LeadTrendChart),
    { ssr: false, loading: ChartFallback },
);

export const EventBarChart = dynamic(
    () => import('./dashboard-charts').then((m) => m.EventBarChart),
    { ssr: false, loading: ChartFallback },
);

export const SourceBreakdownChart = dynamic(
    () => import('./dashboard-charts').then((m) => m.SourceBreakdownChart),
    { ssr: false, loading: ChartFallback },
);
