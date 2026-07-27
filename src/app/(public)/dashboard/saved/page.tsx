import Link from 'next/link';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { SavedItemRemoveButton } from '@/components/dashboard/saved-item-remove';
import { requireAuthPage } from '@/lib/auth/session';
import { listSavedItemsGrouped } from '@/services/saved.service';
import { formatDate } from '@/lib/utils';

const GROUP_ICONS: Record<string, string> = {
    college: 'Building2',
    course: 'GraduationCap',
    exam: 'FileText',
    article: 'Newspaper',
    scholarship: 'Award',
    resource: 'FileStack',
    comparison: 'GitCompare',
};

export default async function SavedItemsPage() {
    const actor = await requireAuthPage();
    const grouped = await listSavedItemsGrouped(actor.id);
    const groups = Object.entries(grouped);

    if (groups.length === 0) {
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
            {groups.map(([type, items]) => (
                <SectionCard
                    key={type}
                    title={`Saved ${type}s`}
                    icon={GROUP_ICONS[type] ?? 'Bookmark'}
                    description={`${items.length} item${items.length === 1 ? '' : 's'}`}
                >
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <Link
                                        href={item.href}
                                        className="block truncate text-[12.5px] font-bold text-ink hover:text-navy-700"
                                    >
                                        {item.entityName}
                                    </Link>
                                    <p className="text-[11px] text-ink-soft">Saved {formatDate(item.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge tone="neutral">{item.entityType}</Badge>
                                    <SavedItemRemoveButton id={item.id} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            ))}
        </div>
    );
}
