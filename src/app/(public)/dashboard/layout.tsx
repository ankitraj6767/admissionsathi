import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Icon } from '@/components/ui/icon';
import { requireAuthPage } from '@/lib/auth/session';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const actor = await requireAuthPage('/login');

    return (
        <>
            <PageHeader
                eyebrow="Your account"
                title={`Hi ${actor.name.split(' ')[0]}`}
                description="Everything you have saved, predicted and booked — in one place."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]}
                actions={
                    <Link
                        href="/book-counselling"
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                    >
                        <Icon name="CalendarCheck" className="h-4 w-4" />
                        Book counselling
                    </Link>
                }
            />

            <div className="shell py-6">
                <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <DashboardNav />
                    <div className="min-w-0">{children}</div>
                </div>
            </div>
        </>
    );
}
