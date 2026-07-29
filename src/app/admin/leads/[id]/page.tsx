import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { LeadWorkflowForm } from '@/components/admin/lead-workflow-form';
import { KeyValueGrid, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { getLeadDetailData } from '@/services/admin/lead-admin.service';
import { getEntityAuditTrail } from '@/services/audit.service';
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES } from '@/config/lead-board';
import { requirePermissionPage } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const data = await getLeadDetailData(id).catch(() => null);
    return { title: data ? `${data.lead.reference} — ${data.lead.name}` : 'Lead' };
}

const ACTIVITY_ICONS: Record<string, string> = {
    created: 'Sparkles',
    status_change: 'ArrowRight',
    assignment: 'UserCheck',
    note: 'MessageCircle',
    call: 'Phone',
    email: 'Mail',
    whatsapp: 'MessageCircle',
    sms: 'MessageCircle',
    booking: 'CalendarCheck',
    follow_up: 'BellRing',
    system: 'Cog',
};

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [actor, { id }] = await Promise.all([requirePermissionPage('lead.read'), params]);

    const data = await getLeadDetailData(id);
    if (!data) notFound();

    const { lead, activities, counsellors } = data;
    const auditTrail = can(actor, 'audit.view') ? await getEntityAuditTrail('Lead', id, 10) : [];

    return (
        <>
            <AdminPageHeader
                title={`${lead.name}`}
                description={`${lead.reference} • captured ${formatDate(lead.createdAt, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })} from ${lead.source.replace(/_/g, ' ')}`}
                icon="Users"
                breadcrumbs={[{ label: 'Leads', href: '/admin/leads' }, { label: lead.reference }]}
                actions={
                    <>
                        <Badge tone={LEAD_STATUS_TONES[lead.status] ?? 'neutral'} size="lg">
                            {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                        </Badge>
                        {lead.isDuplicate ? (
                            <Badge tone="amber" size="lg">
                                Duplicate
                            </Badge>
                        ) : null}
                        <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-[13px] font-bold text-ink hover:border-navy-200"
                        >
                            Call {lead.phone}
                        </a>
                        <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-green px-4 text-[13px] font-bold text-white"
                        >
                            WhatsApp
                        </a>
                    </>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                    <SectionCard title="Enquiry details" icon="Info">
                        <KeyValueGrid
                            columns={3}
                            items={[
                                { label: 'Phone', value: lead.phone },
                                { label: 'Email', value: lead.email ?? '—' },
                                { label: 'Preferred time', value: lead.preferredTimeLabel ?? '—' },
                                { label: 'State', value: lead.stateName ?? '—' },
                                { label: 'City', value: lead.cityName ?? '—' },
                                { label: 'Lead score', value: lead.score ?? 0 },
                                { label: 'Course interest', value: lead.courseInterestName ?? '—' },
                                { label: 'College interest', value: lead.collegeInterestName ?? '—' },
                                { label: 'Exam interest', value: lead.examInterestName ?? '—' },
                                { label: 'Contact attempts', value: lead.contactAttempts ?? 0 },
                                {
                                    label: 'Last contacted',
                                    value: lead.lastContactedAt ? formatDate(lead.lastContactedAt) : '—',
                                },
                                { label: 'Follow-up', value: lead.followUpAt ? formatDate(lead.followUpAt) : '—' },
                            ]}
                        />

                        {lead.message ? (
                            <div className="mt-3 rounded-[10px] border border-line bg-muted/50 px-3 py-2.5">
                                <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                                    Student’s message
                                </p>
                                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-ink">
                                    {lead.message}
                                </p>
                            </div>
                        ) : null}
                    </SectionCard>

                    <SectionCard title="Attribution" icon="Share2">
                        <KeyValueGrid
                            columns={3}
                            items={[
                                { label: 'Source', value: lead.source.replace(/_/g, ' ') },
                                { label: 'Source detail', value: lead.sourceDetail ?? '—' },
                                { label: 'Campaign', value: lead.campaign ?? '—' },
                                { label: 'UTM source', value: lead.utm?.source ?? '—' },
                                { label: 'UTM medium', value: lead.utm?.medium ?? '—' },
                                { label: 'UTM campaign', value: lead.utm?.campaign ?? '—' },
                                { label: 'Landing page', value: lead.utm?.landingPage ?? '—' },
                                { label: 'Referrer', value: lead.utm?.referrer ?? '—' },
                                {
                                    label: 'Consent',
                                    value: lead.consent?.given
                                        ? `Given ${formatDate(lead.consent.givenAt)} (${lead.consent.textVersion ?? 'v1'})`
                                        : 'Not given',
                                },
                            ]}
                        />
                    </SectionCard>

                    <SectionCard
                        title="Activity timeline"
                        icon="History"
                        description="Every stage change, assignment, call and note on this lead."
                    >
                        {activities.length === 0 ? (
                            <EmptyState icon="History" title="No activity recorded yet" />
                        ) : (
                            <ol className="space-y-3">
                                {activities.map((activity) => (
                                    <li key={String(activity._id)} className="flex gap-3">
                                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                                            <Icon name={ACTIVITY_ICONS[activity.type] ?? 'Info'} className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="min-w-0 flex-1 border-b border-line pb-3 last:border-0">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <p className="text-[12.5px] font-bold text-ink">{activity.title}</p>
                                                <span className="text-[10.5px] text-ink-soft">
                                                    {formatRelativeTime(activity.createdAt)}
                                                </span>
                                            </div>
                                            {activity.detail ? (
                                                <p className="mt-0.5 whitespace-pre-line text-[12px] leading-relaxed text-ink-soft">
                                                    {activity.detail}
                                                </p>
                                            ) : null}
                                            {activity.actorName ? (
                                                <p className="mt-1 text-[10.5px] text-ink-soft">by {activity.actorName}</p>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </SectionCard>

                    {auditTrail.length > 0 ? (
                        <SectionCard title="Audit trail" icon="Eye" description="Who changed what, from the system audit log.">
                            <ul className="divide-y divide-line text-[12px]">
                                {auditTrail.map((entry) => (
                                    <li key={String(entry._id)} className="flex items-center justify-between gap-2 py-2">
                                        <span className="min-w-0">
                                            <span className="font-semibold text-ink">{entry.action}</span>
                                            <span className="block truncate text-ink-soft">
                                                {entry.actorName ?? 'System'}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-ink-soft">{formatRelativeTime(entry.createdAt)}</span>
                                    </li>
                                ))}
                            </ul>
                        </SectionCard>
                    ) : null}
                </div>

                <div className="space-y-4">
                    <SectionCard title="Workflow" icon="Workflow">
                        {can(actor, 'lead.update') ? (
                            <LeadWorkflowForm
                                lead={{
                                    id: String(lead._id),
                                    status: lead.status,
                                    priority: lead.priority,
                                    assignedTo: lead.assignedTo ? String(lead.assignedTo) : undefined,
                                    followUpAt: lead.followUpAt ? String(lead.followUpAt) : undefined,
                                    lostReason: lead.lostReason,
                                }}
                                counsellors={counsellors}
                                canAssign={can(actor, 'lead.assign')}
                            />
                        ) : (
                            <p className="text-[12.5px] text-ink-soft">
                                You have read-only access to leads. Ask an admin for the
                                <span className="font-semibold text-ink"> lead.update </span>
                                permission to make changes.
                            </p>
                        )}
                    </SectionCard>

                    <SectionCard title="Assignment" icon="UserCheck">
                        <KeyValueGrid
                            columns={2}
                            items={[
                                { label: 'Counsellor', value: lead.assignedToName ?? 'Unassigned' },
                                { label: 'Assigned at', value: lead.assignedAt ? formatDate(lead.assignedAt) : '—' },
                            ]}
                        />
                        <Link href="/admin/counsellors" className="link-more mt-3 inline-flex">
                            Manage counsellors
                        </Link>
                    </SectionCard>

                    {lead.duplicateOf ? (
                        <SectionCard title="Duplicate of" icon="Copy">
                            <Link
                                href={`/admin/leads/${String(lead.duplicateOf)}`}
                                className="text-[12.5px] font-bold text-navy-600 hover:text-orange"
                            >
                                Open the earlier lead →
                            </Link>
                            <p className="mt-1 text-[11.5px] text-ink-soft">
                                Same phone number seen within 24 hours. Merge the context before calling.
                            </p>
                        </SectionCard>
                    ) : null}
                </div>
            </div>
        </>
    );
}
