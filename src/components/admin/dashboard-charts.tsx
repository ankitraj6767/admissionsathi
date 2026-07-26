'use client';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const COLORS = ['#073174', '#FF6B17', '#0AA39A', '#7048D8', '#21A663', '#E54786', '#2563EB'];

const axisStyle = { fontSize: 11, fill: '#667085' } as const;

export function LeadTrendChart({ data }: { data: { date: string; count: number }[] }) {
    return (
        <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                        <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF6B17" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#FF6B17" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                    <XAxis dataKey="date" tick={axisStyle} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={axisStyle} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E5EAF2' }}
                        labelStyle={{ fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#FF6B17" strokeWidth={2} fill="url(#leadGradient)" name="Leads" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function SourceBreakdownChart({ data }: { data: { source: string; count: number }[] }) {
    return (
        <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E5EAF2' }} />
                    <Legend
                        wrapperStyle={{ fontSize: 10.5 }}
                        formatter={(value: string) => value.replace(/_/g, ' ')}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function EventBarChart({ data }: { data: { name: string; count: number }[] }) {
    return (
        <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={axisStyle}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                        tickFormatter={(v: string) => v.replace(/_/g, ' ').slice(0, 14)}
                    />
                    <YAxis tick={axisStyle} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E5EAF2' }} />
                    <Bar dataKey="count" fill="#073174" radius={[6, 6, 0, 0]} name="Events" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
