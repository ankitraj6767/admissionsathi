'use server';

import { revalidatePath } from 'next/cache';
import { scanLinkHealthNow } from '@/services/link-health.service';
import { requirePermission } from '@/lib/auth/session';
import { invalidateTag } from '@/lib/revalidate';
import { runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

/**
 * Forces a fresh internal-link scan.
 *
 * The report is cached for an hour, so this exists to let an editor confirm a fix
 * without waiting out the TTL.
 */
export async function rescanLinkHealthAction(): Promise<
    ActionResult<{ broken: number; internalChecked: number }>
> {
    return runAction({ action: 'admin.seo.link_scan' }, async () => {
        await requirePermission('seo.manage');

        const report = await scanLinkHealthNow();
        invalidateTag('link-health');
        revalidatePath('/admin/seo');

        return succeed(
            { broken: report.brokenCount, internalChecked: report.internalChecked },
            report.brokenCount === 0
                ? `Scanned ${report.internalChecked} internal links — none broken.`
                : `Scanned ${report.internalChecked} internal links — ${report.brokenCount} need attention.`,
        );
    });
}
