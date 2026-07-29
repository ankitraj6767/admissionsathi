import { Card, IconTile, SectionHeader } from '@/components/ui/primitives';
import type { WhyChooseUsConfig } from '@/schemas/homepage.schema';

/**
 * Differentiators band.
 *
 * Deliberately concrete rather than superlative — "salaried, not commissioned" and
 * "every figure names its source" are checkable claims, which is the only kind
 * worth printing next to a free-counselling offer.
 */
export function WhyChooseUsSection({
    heading,
    description,
    config,
}: {
    heading: string;
    description?: string;
    config: WhyChooseUsConfig;
}) {
    if (config.items.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="why-choose-us-heading">
            <SectionHeader title={heading} description={description} compact />

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {config.items.map((item) => (
                    <li key={item.title} className="rounded-[12px] border border-line bg-muted/40 p-3.5">
                        <IconTile icon={item.icon} tone={item.tone ?? 'navy'} />
                        <h3 className="mt-2.5 text-[13px] font-extrabold leading-snug text-ink">{item.title}</h3>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{item.description}</p>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
