import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthPage } from '@/lib/auth/session';
import { getAuthenticatedHomePath } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Opening your account',
    robots: { index: false, follow: false },
};

/**
 * Role-aware entry point after authentication.
 *
 * This is deliberately server checked: staff go to the admin workspace and
 * students go to the personal dashboard, whose layouts enforce access again.
 */
export default async function AccountEntryPage() {
    const actor = await requireAuthPage('/login');
    redirect(getAuthenticatedHomePath(actor.roles));
}
