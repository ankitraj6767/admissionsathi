import Link from 'next/link';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { SavedItemRemoveButton } from '@/components/dashboard/saved-item-remove';
import { requireAuthPage } from '@/lib/auth/session';
import { connectToDatabase } from '@/db/connect';
import { SavedItem } from '@/db/models/system.model';
import { toPlain } from '@/db/repositories/base.repository';
import { formatDate } from '@/lib/utils';

const PATHS: Record<string, string> = {
    college: '/colleges',
    course: '/courses',
    exam: '/exams',
    article: '/articles',
    scholarship: '/scholarships',
    resource: '/resources',
    comparison: '/compare-colleges',
};

export default async function SavedItemsPage() {
    const actor = await requireAuthPage();
    await connectToDatabase();

    const items = toPlain(
        await SavedItem.find({ user: actor.id }).sort({ createdAt: -1 }).limit(100).lean().exec(),
    );

    const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
        acc[item.entityType] = [...(acc[item.entityType] ?? []), item];
        return acc;
    }, {});

    if (items.length === 0) {
        return (
            <SectionCard title="Saved items" icon="Bookmark">
                <EmptyState
                    icon="Bookmark"
                    title="You have not saved anything yet"
                    description="Use the Save button on any college, course or exam page to build your shortlist."
                    action={
                        <Link
                            href="/colleges"
                            className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                        >
                            Browse colleges
                        </Link>
                    }
                />
            </SectionCard>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([type, group]) => (
                <SectionCard
                    key={type}
                    title={`Saved ${type}s`}
                    icon={type === 'college' ? 'Building2' : type === 'course' ? 'GraduationCap' : 'Bookmark'}
                    description={`${group.length} item${group.length === 1 ? '' : 's'}`}
                >
                    <ul className="space-y-2">
                        {group.map((item) => (
                            <li
                                key={String(item._id)}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <Link
                                        href={`${PATHS[item.entityType] ?? '/'}/${item.entitySlug}`}
                                        className="block truncate text-[12.5px] font-bold text-ink hover:text-navy-700"
                                    >
                                        {item.entityName}
                                    </Link>
                                    <p className="text-[11px] text-ink-soft">Saved {formatDate(item.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge tone="neutral">{item.entityType}</Badge>
                                    <SavedItemRemoveButton id={String(item._id)} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            ))}
        </div>
    );
}
