import 'server-only';
import { Types } from 'mongoose';
import { LEAD_STATUSES } from '@/config/constants';
import {
    addLeadActivity,
    bulkUpdateLeads,
    getLeadById,
    leadBoardColumns,
    leadCountsByCounsellor,
    leadCountsBySource,
    leadCountsByStatus,
    leadTrend,
    listLeadActivities,
    listLeads,
    listLeadsForExport,
    normalizePhone,
    updateLead,
    type LeadBoardColumn,
    type LeadQuery,
} from '@/db/repositories/lead.repository';
import { createLead, generateLeadReference } from '@/db/repositories/lead.repository';
import {
    getCounsellorById,
    incrementCounsellorLoad,
    listCounsellors,
} from '@/db/repositories/counsellor.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { queueNotification } from '@/services/notification.service';
import { recordAudit } from '@/services/audit.service';
import { NotFoundError } from '@/lib/action-helpers';
import { formatDate } from '@/lib/utils';
import type { LeadActivityDoc, LeadDoc } from '@/db/models/lead.model';
import type { SessionActor } from '@/lib/auth/rbac';
import type { AdminLeadCreateInput, AdminLeadUpdateInput, BulkLeadUpdateInput } from '@/schemas/lead.schema';
import type { Paginated } from '@/types/common';

/** Counsellor picker options, shared by the board, the table and the detail form. */
export interface CounsellorOption {
    id: string;
    name: string;
    activeLeadCount: number;
    isAcceptingLeads: boolean;
}

async function counsellorOptions(): Promise<CounsellorOption[]> {
    const rows = await listCounsellors({ limit: 60 });
    return rows.map((row) => ({
        id: String(row._id),
        name: row.name,
        activeLeadCount: row.activeLeadCount ?? 0,
        isAcceptingLeads: Boolean(row.isAcceptingLeads),
    }));
}

/* ---------------------------------- board --------------------------------- */

export interface LeadBoardData {
    columns: LeadBoardColumn[];
    counsellors: CounsellorOption[];
    total: number;
}

/**
 * Kanban board grouped by lifecycle status.
 *
 * Columns follow `LEAD_STATUSES` order rather than the aggregation's, so the board
 * always reads new → converted → lost even when a status is empty.
 */
export async function getLeadBoardData(query: LeadQuery): Promise<LeadBoardData> {
    const [rows, counsellors] = await Promise.all([leadBoardColumns(query, 25), counsellorOptions()]);
    const byStatus = new Map(rows.map((row) => [row.status, row]));

    const columns = LEAD_STATUSES.map<LeadBoardColumn>((status) => {
        const row = byStatus.get(status);
        return { status, total: row?.total ?? 0, items: toPlain(row?.items ?? []) };
    });

    return {
        columns,
        counsellors,
        total: columns.reduce((sum, column) => sum + column.total, 0),
    };
}

/* ---------------------------------- table --------------------------------- */

export interface LeadTableData {
    result: Paginated<LeadDoc>;
    counsellors: CounsellorOption[];
    statusCounts: Record<string, number>;
}

export async function getLeadTableData(query: LeadQuery): Promise<LeadTableData> {
    const [result, counsellors, statusCounts] = await Promise.all([
        listLeads(query),
        counsellorOptions(),
        leadCountsByStatus().catch(() => ({})),
    ]);

    return { result: toPlain(result), counsellors, statusCounts };
}

/* --------------------------------- detail --------------------------------- */

export interface LeadDetailData {
    lead: LeadDoc;
    activities: LeadActivityDoc[];
    counsellors: CounsellorOption[];
}

export async function getLeadDetailData(id: string): Promise<LeadDetailData | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const lead = await getLeadById(id);
    if (!lead) return null;

    const [activities, counsellors] = await Promise.all([listLeadActivities(id, 60), counsellorOptions()]);
    return { lead: toPlain(lead), activities: toPlain(activities), counsellors };
}

/* -------------------------------- analytics ------------------------------- */

export interface LeadAnalytics {
    statusCounts: Record<string, number>;
    sources: { source: string; count: number }[];
    trend: { date: string; count: number }[];
    counsellors: { counsellorName: string; total: number; converted: number }[];
    total: number;
    converted: number;
    conversionRate: number;
}

export async function getLeadAnalytics(): Promise<LeadAnalytics> {
    const [statusCounts, sources, trend, counsellors] = await Promise.all([
        leadCountsByStatus().catch(() => ({} as Record<string, number>)),
        leadCountsBySource(30).catch(() => []),
        leadTrend(14).catch(() => []),
        leadCountsByCounsellor(12).catch(() => []),
    ]);

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const converted = statusCounts.converted ?? 0;

    return {
        statusCounts,
        sources,
        trend,
        counsellors,
        total,
        converted,
        conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    };
}

/* -------------------------------- mutations ------------------------------- */

function parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export interface LeadWorkflowResult {
    leadId: string;
    reference: string;
    status: string;
}

/**
 * Applies a workflow change to one lead and records it on the timeline.
 *
 * Every field is optional, so the same action backs the board's drag-and-drop
 * (status only), the assignment dropdown, and the full detail form. Each change
 * writes its own activity row, which is what makes the timeline auditable rather
 * than a diff of the current document.
 */
export async function applyLeadWorkflow(
    input: AdminLeadUpdateInput,
    actor: SessionActor,
): Promise<LeadWorkflowResult> {
    const lead = await getLeadById(input.id);
    if (!lead) throw new NotFoundError('Lead not found.');

    const update: Partial<LeadDoc> = {};
    /** Fields that must be removed rather than set — see `updateLead`. */
    const unset: (keyof LeadDoc)[] = [];
    const activities: Parameters<typeof addLeadActivity>[0][] = [];
    const auditNew: Record<string, unknown> = {};

    if (input.status && input.status !== lead.status) {
        update.status = input.status;
        if (input.status === 'converted') update.convertedAt = new Date();
        if (input.status === 'contacted') {
            update.lastContactedAt = new Date();
            update.contactAttempts = (lead.contactAttempts ?? 0) + 1;
        }
        activities.push({
            lead: lead._id,
            type: 'status_change',
            title: `Status moved to ${input.status.replace(/_/g, ' ')}`,
            fromValue: lead.status,
            toValue: input.status,
            actor: Types.ObjectId.isValid(actor.id) ? new Types.ObjectId(actor.id) : undefined,
            actorName: actor.name,
            isInternal: true,
        });
        auditNew.status = input.status;
    }

    if (input.priority && input.priority !== lead.priority) {
        update.priority = input.priority;
        activities.push({
            lead: lead._id,
            type: 'system',
            title: `Priority set to ${input.priority}`,
            fromValue: lead.priority,
            toValue: input.priority,
            actorName: actor.name,
            isInternal: true,
        });
        auditNew.priority = input.priority;
    }

    if (input.assignedTo !== undefined) {
        const nextId = input.assignedTo || '';
        const currentId = lead.assignedTo ? String(lead.assignedTo) : '';

        if (nextId !== currentId) {
            if (nextId) {
                const counsellor = await getCounsellorById(nextId);
                if (!counsellor) throw new NotFoundError('Counsellor not found.');

                update.assignedTo = counsellor._id;
                update.assignedToName = counsellor.name;
                update.assignedAt = new Date();

                // Keep the round-robin load counter honest on reassignment.
                await incrementCounsellorLoad(nextId, 1);
                if (currentId) await incrementCounsellorLoad(currentId, -1);

                activities.push({
                    lead: lead._id,
                    type: 'assignment',
                    title: `Assigned to ${counsellor.name}`,
                    fromValue: lead.assignedToName,
                    toValue: counsellor.name,
                    actorName: actor.name,
                    isInternal: true,
                });
                auditNew.assignedTo = counsellor.name;

                await queueNotification({
                    event: 'lead.assigned',
                    channel: 'in_app',
                    audience: 'staff',
                    title: `Lead assigned: ${lead.name}`,
                    body: `${lead.reference} • ${lead.phone} • now with ${counsellor.name}`,
                    actionUrl: `/admin/leads/${lead._id}`,
                    dedupeKey: `lead-assign-${lead._id}-${nextId}`,
                });
            } else {
                unset.push('assignedTo', 'assignedToName', 'assignedAt');
                if (currentId) await incrementCounsellorLoad(currentId, -1);
                activities.push({
                    lead: lead._id,
                    type: 'assignment',
                    title: 'Assignment cleared',
                    fromValue: lead.assignedToName,
                    actorName: actor.name,
                    isInternal: true,
                });
                auditNew.assignedTo = null;
            }
        }
    }

    const followUpAt = parseDate(input.followUpAt);
    if (followUpAt) {
        update.followUpAt = followUpAt;
        activities.push({
            lead: lead._id,
            type: 'follow_up',
            title: `Follow-up set for ${formatDate(followUpAt, {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            })}`,
            toValue: followUpAt.toISOString(),
            actorName: actor.name,
            isInternal: true,
        });
        auditNew.followUpAt = followUpAt.toISOString();

        // Reminder is queued, never sent inline — the counsellor should not wait
        // on a provider round trip to see their update land.
        await queueNotification({
            event: 'lead.follow_up_reminder',
            channel: 'in_app',
            audience: 'staff',
            title: `Follow up with ${lead.name}`,
            body: `${lead.reference} • ${lead.phone}`,
            actionUrl: `/admin/leads/${lead._id}`,
            scheduledFor: followUpAt,
            dedupeKey: `lead-followup-${lead._id}-${followUpAt.toISOString()}`,
        });
    }

    if (input.callOutcome) {
        update.lastContactedAt = new Date();
        update.contactAttempts = (lead.contactAttempts ?? 0) + 1;
        activities.push({
            lead: lead._id,
            type: 'call',
            title: `Call logged — ${input.callOutcome.replace(/_/g, ' ')}`,
            detail: input.note,
            callOutcome: input.callOutcome,
            actorName: actor.name,
            isInternal: true,
        });
        auditNew.callOutcome = input.callOutcome;
    }

    if (input.lostReason !== undefined && input.lostReason !== lead.lostReason) {
        update.lostReason = input.lostReason || undefined;
        auditNew.lostReason = input.lostReason;
    }

    // A note with no call outcome is a standalone timeline entry.
    if (input.note && !input.callOutcome) {
        activities.push({
            lead: lead._id,
            type: 'note',
            title: `Note by ${actor.name}`,
            detail: input.note,
            actorName: actor.name,
            isInternal: true,
        });
    }

    if (Object.keys(update).length > 0 || unset.length > 0) {
        await updateLead(input.id, update, unset);
    }
    for (const activity of activities) {
        await addLeadActivity(activity);
    }

    if (Object.keys(auditNew).length > 0 || input.note) {
        await recordAudit({
            actor,
            action: 'lead.update',
            entity: 'Lead',
            entityId: String(lead._id),
            entityLabel: `${lead.reference} — ${lead.name}`,
            previousValues: {
                status: lead.status,
                priority: lead.priority,
                assignedTo: lead.assignedToName,
            },
            newValues: auditNew,
        });
    }

    return {
        leadId: String(lead._id),
        reference: lead.reference,
        status: update.status ?? lead.status,
    };
}

/** Bulk status / priority / assignment change from the table's selection. */
export async function applyBulkLeadUpdate(
    input: BulkLeadUpdateInput,
    actor: SessionActor,
): Promise<number> {
    const update: Partial<LeadDoc> = {};

    if (input.status) update.status = input.status;
    if (input.priority) update.priority = input.priority;

    if (input.assignedTo) {
        const counsellor = await getCounsellorById(input.assignedTo);
        if (!counsellor) throw new NotFoundError('Counsellor not found.');
        update.assignedTo = counsellor._id;
        update.assignedToName = counsellor.name;
        update.assignedAt = new Date();
    }

    if (Object.keys(update).length === 0) return 0;

    const modified = await bulkUpdateLeads(input.ids, update);

    // One timeline entry per lead keeps the audit story intact for bulk edits too.
    for (const id of input.ids) {
        if (!Types.ObjectId.isValid(id)) continue;
        await addLeadActivity({
            lead: new Types.ObjectId(id),
            type: 'system',
            title: `Bulk update by ${actor.name}`,
            detail: [
                input.status ? `status → ${input.status}` : null,
                input.priority ? `priority → ${input.priority}` : null,
                update.assignedToName ? `assigned → ${update.assignedToName}` : null,
            ]
                .filter(Boolean)
                .join(', '),
            actorName: actor.name,
            isInternal: true,
        });
    }

    await recordAudit({
        actor,
        action: 'lead.bulk_update',
        entity: 'Lead',
        entityLabel: `${modified} lead(s)`,
        newValues: {
            status: input.status,
            priority: input.priority,
            assignedTo: update.assignedToName,
            count: modified,
        },
    });

    return modified;
}

/** Creates a lead by hand — phone enquiries, walk-ins and events. */
export async function createLeadManually(
    input: AdminLeadCreateInput,
    actor: SessionActor,
): Promise<{ leadId: string; reference: string }> {
    const counsellor = input.assignedTo ? await getCounsellorById(input.assignedTo) : null;
    const reference = await generateLeadReference();

    const lead = await createLead({
        reference,
        name: input.name,
        phone: input.phone,
        phoneNormalized: normalizePhone(input.phone),
        email: input.email || undefined,
        state: input.stateId && Types.ObjectId.isValid(input.stateId) ? new Types.ObjectId(input.stateId) : undefined,
        city: input.cityId && Types.ObjectId.isValid(input.cityId) ? new Types.ObjectId(input.cityId) : undefined,
        courseInterestName: input.courseInterest || undefined,
        message: input.message || undefined,
        source: input.source,
        priority: input.priority,
        status: 'new',
        assignedTo: counsellor?._id,
        assignedToName: counsellor?.name,
        assignedAt: counsellor ? new Date() : undefined,
        // Staff-entered leads record verbal consent against the actor who took it.
        consent: { given: true, givenAt: new Date(), textVersion: 'staff-verbal' },
    });

    if (counsellor) await incrementCounsellorLoad(String(counsellor._id), 1);

    await addLeadActivity({
        lead: lead._id,
        type: 'created',
        title: `Lead created manually by ${actor.name}`,
        detail: input.message,
        actorName: actor.name,
        isInternal: true,
    });

    await recordAudit({
        actor,
        action: 'lead.create_manual',
        entity: 'Lead',
        entityId: String(lead._id),
        entityLabel: `${reference} — ${input.name}`,
        newValues: { source: input.source, assignedTo: counsellor?.name },
    });

    return { leadId: String(lead._id), reference };
}

/* ---------------------------------- export -------------------------------- */

const EXPORT_COLUMNS: { key: string; label: string; get: (lead: LeadDoc) => string }[] = [
    { key: 'reference', label: 'Reference', get: (l) => l.reference },
    { key: 'createdAt', label: 'Received', get: (l) => new Date(l.createdAt).toISOString() },
    { key: 'name', label: 'Name', get: (l) => l.name },
    { key: 'phone', label: 'Phone', get: (l) => l.phone },
    { key: 'email', label: 'Email', get: (l) => l.email ?? '' },
    { key: 'stateName', label: 'State', get: (l) => l.stateName ?? '' },
    { key: 'cityName', label: 'City', get: (l) => l.cityName ?? '' },
    { key: 'courseInterestName', label: 'Course interest', get: (l) => l.courseInterestName ?? '' },
    { key: 'collegeInterestName', label: 'College interest', get: (l) => l.collegeInterestName ?? '' },
    { key: 'examInterestName', label: 'Exam interest', get: (l) => l.examInterestName ?? '' },
    { key: 'source', label: 'Source', get: (l) => l.source },
    { key: 'campaign', label: 'Campaign', get: (l) => l.campaign ?? '' },
    { key: 'utmSource', label: 'UTM source', get: (l) => l.utm?.source ?? '' },
    { key: 'utmMedium', label: 'UTM medium', get: (l) => l.utm?.medium ?? '' },
    { key: 'status', label: 'Status', get: (l) => l.status },
    { key: 'priority', label: 'Priority', get: (l) => l.priority },
    { key: 'score', label: 'Score', get: (l) => String(l.score ?? 0) },
    { key: 'assignedToName', label: 'Counsellor', get: (l) => l.assignedToName ?? '' },
    { key: 'followUpAt', label: 'Follow-up', get: (l) => (l.followUpAt ? new Date(l.followUpAt).toISOString() : '') },
    { key: 'contactAttempts', label: 'Contact attempts', get: (l) => String(l.contactAttempts ?? 0) },
    { key: 'isDuplicate', label: 'Duplicate', get: (l) => (l.isDuplicate ? 'yes' : 'no') },
    { key: 'lostReason', label: 'Lost reason', get: (l) => l.lostReason ?? '' },
];

/**
 * Escapes a CSV cell.
 *
 * The leading apostrophe on `=`, `+`, `-` and `@` blocks CSV formula injection:
 * without it a lead named `=HYPERLINK(...)` would execute when the export is
 * opened in a spreadsheet.
 */
function csvCell(value: string): string {
    const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${guarded.replace(/"/g, '""')}"`;
}

export async function exportLeadsCsv(query: LeadQuery, actor: SessionActor): Promise<string> {
    const leads = await listLeadsForExport(query, 5_000);

    const header = EXPORT_COLUMNS.map((column) => csvCell(column.label)).join(',');
    const rows = leads.map((lead) => EXPORT_COLUMNS.map((column) => csvCell(column.get(lead))).join(','));

    await recordAudit({
        actor,
        action: 'lead.export',
        entity: 'Lead',
        entityLabel: `${leads.length} lead(s)`,
        newValues: { count: leads.length, filters: { ...query } },
    });

    return [header, ...rows].join('\n');
}
