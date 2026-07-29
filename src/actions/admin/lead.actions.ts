'use server';

import { revalidatePath } from 'next/cache';
import {
    adminLeadCreateSchema,
    adminLeadUpdateSchema,
    bulkLeadUpdateSchema,
    leadFilterSchema,
} from '@/schemas/lead.schema';
import {
    applyBulkLeadUpdate,
    applyLeadWorkflow,
    createLeadManually,
    exportLeadsCsv,
} from '@/services/admin/lead-admin.service';
import { requirePermission } from '@/lib/auth/session';
import { fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

function refreshLeadScreens(leadId?: string): void {
    revalidatePath('/admin/leads');
    if (leadId) revalidatePath(`/admin/leads/${leadId}`);
}

/**
 * Workflow change on a single lead: status, priority, assignment, follow-up,
 * call outcome or a note. Backs both the board's drag-and-drop and the detail
 * form, so the permission check lives here rather than in the UI.
 */
export async function updateLeadWorkflowAction(
    input: unknown,
): Promise<ActionResult<{ leadId: string; status: string }>> {
    return runAction({ action: 'admin.lead.update' }, async () => {
        const actor = await requirePermission('lead.update');
        const data = adminLeadUpdateSchema.parse(input);

        // Reassignment is a separate, stronger permission than editing a lead.
        if (data.assignedTo !== undefined) {
            await requirePermission('lead.assign');
        }

        const result = await applyLeadWorkflow(data, actor);
        refreshLeadScreens(result.leadId);

        return succeed(
            { leadId: result.leadId, status: result.status },
            `${result.reference} updated.`,
        );
    });
}

export async function bulkUpdateLeadsAction(
    input: unknown,
): Promise<ActionResult<{ modified: number }>> {
    return runAction({ action: 'admin.lead.bulk_update' }, async () => {
        const actor = await requirePermission('lead.update');
        const data = bulkLeadUpdateSchema.parse(input);

        if (data.assignedTo) await requirePermission('lead.assign');

        const modified = await applyBulkLeadUpdate(data, actor);
        if (modified === 0) return fail('Choose at least one field to update.', 'VALIDATION');

        refreshLeadScreens();
        return succeed({ modified }, `${modified} lead(s) updated.`);
    });
}

export async function createLeadAction(
    input: unknown,
): Promise<ActionResult<{ leadId: string; reference: string }>> {
    return runAction({ action: 'admin.lead.create' }, async () => {
        const actor = await requirePermission('lead.create');
        const data = adminLeadCreateSchema.parse(input);

        if (data.assignedTo) await requirePermission('lead.assign');

        const result = await createLeadManually(data, actor);
        refreshLeadScreens(result.leadId);

        return succeed(result, `Lead ${result.reference} created.`);
    });
}

/**
 * CSV export of the current filter set.
 *
 * Returns the CSV as a string rather than streaming a file: the download is
 * assembled client-side from this payload, which keeps the export behind the same
 * Server Action permission check as every other lead mutation.
 */
export async function exportLeadsAction(
    input: unknown,
): Promise<ActionResult<{ csv: string; filename: string }>> {
    return runAction({ action: 'admin.lead.export' }, async () => {
        const actor = await requirePermission('lead.export');
        const filters = leadFilterSchema.partial().parse(input ?? {});

        const csv = await exportLeadsCsv(filters, actor);
        const stamp = new Date().toISOString().slice(0, 10);

        return succeed({ csv, filename: `leads-${stamp}.csv` }, 'Export ready.');
    });
}
