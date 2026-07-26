import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { GuidanceToolsConfig } from '@/schemas/homepage.schema';
import type { ResolvedSection } from '@/services/homepage.service';

const tone: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    blue: 'bg-blue-50 text-blue',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green',
    purple: 'bg-purple-50 text-purple',
    pink: 'bg-pink-50 text-pink',
};

/** Four guidance/tool cards: Admission Guidance, Loan & Finance, Exams, College Tools. */
export function GuidanceToolsSection({ section }: { section: ResolvedSection<GuidanceToolsConfig> }) {
    const groups = section.config.groups;
    if (groups.length === 0) return null;

    return (
        <section aria-label="Guidance and tools" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {groups.map((group) => (
                <Card key={group.title} className="flex h-full flex-col" padded={false}>
                    <div className="border-b border-line px-3.5 py-3">
                        <h3 className="text-[13.5px] font-extrabold text-navy-800">{group.title}</h3>
                    </div>

                    <ul className="flex-1 space-y-0.5 p-2">
                        {group.items.map((item) => (
                            <li key={item.title}>
                                <Link
                                    href={item.url}
                                    className="group flex items-start gap-2.5 rounded-[10px] px-1.5 py-2 transition-colors hover:bg-muted"
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]',
                                            tone[item.tone ?? group.tone ?? 'navy'] ?? tone.navy,
                                        )}
                                    >
                                        <Icon name={item.icon} className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[12px] font-bold leading-tight text-ink group-hover:text-navy-700">
                                            {item.title}
                                        </span>
                                        {item.subtitle ? (
                                            <span className="mt-0.5 block text-[10px] leading-tight text-ink-soft">
                                                {item.subtitle}
                                            </span>
                                        ) : null}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {group.ctaLabel && group.ctaUrl ? (
                        <div className="border-t border-line p-2">
                            <Link
                                href={group.ctaUrl}
                                className="flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-muted text-[11.5px] font-bold text-navy-700 transition-colors hover:bg-navy-50"
                            >
                                {group.ctaLabel}
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                        </div>
                    ) : null}
                </Card>
            ))}
        </section>
    );
}
