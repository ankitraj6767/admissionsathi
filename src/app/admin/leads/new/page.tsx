import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { LeadCreateForm } from '@/components/admin/lead-create-form';
import { listStates } from '@/db/repositories/geo.repository';
import { listCounsellors } from '@/db/repositories/counsellor.repository';
import { requirePermissionPage } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'New lead' };

export default async function AdminNewLeadPage() {
    const actor = await requirePermissionPage('lead.create');

    const [states, counsellorDocs] = await Promise.all([
        listStates({ limit: 40 }),
        listCounsellors({ limit: 60 }),
    ]);

    return (
        <>
            <AdminPageHeader
                title="New lead"
                description="Log an enquiry that arrived by phone, at an event or over WhatsApp."
                icon="Users"
                breadcrumbs={[{ label: 'Leads', href: '/admin/leads' }, { label: 'New lead' }]}
            />

            <LeadCreateForm
                counsellors={counsellorDocs.map((counsellor) => ({
                    id: String(counsellor._id),
                    name: counsellor.name,
                    activeLeadCount: counsellor.activeLeadCount ?? 0,
                    isAcceptingLeads: Boolean(counsellor.isAcceptingLeads),
                }))}
                states={states.map((state) => ({ id: String(state._id), name: state.name }))}
                canAssign={can(actor, 'lead.assign')}
            />
        </>
    );
}
