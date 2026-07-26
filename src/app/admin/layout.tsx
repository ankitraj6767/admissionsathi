import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { requireStaffPage } from '@/lib/auth/session';
import { connectToDatabase } from '@/db/connect';
import { Lead } from '@/db/models/lead.model';
import { Review } from '@/db/models/content.model';
import { Article } from '@/db/models/content.model';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: { default: 'Admin — Admission Sathi', template: '%s | Admission Sathi Admin' },
    robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const actor = await requireStaffPage();
    await connectToDatabase();

    const [newLeads, pendingReviews, draftContent] = await Promise.all([
        Lead.countDocuments({ status: 'new' }).exec().catch(() => 0),
        Review.countDocuments({ moderationStatus: 'pending' }).exec().catch(() => 0),
        Article.countDocuments({ status: { $in: ['draft', 'in_review'] } })
            .exec()
            .catch(() => 0),
    ]);

    return (
        <AdminShell
            actor={{
                name: actor.name,
                email: actor.email,
                roles: actor.roles,
                permissions: actor.permissions,
            }}
            badges={{ newLeads, pendingReviews, draftContent }}
        >
            {children}
        </AdminShell>
    );
}
