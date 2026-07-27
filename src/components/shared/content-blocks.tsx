import Link from 'next/link';
import { Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/** Renders CMS rich text safely-scoped inside the `.prose-sathi` stylesheet. */
export function RichText({ html, className }: { html?: string; className?: string }) {
    if (!html) return null;
    return (
        <div
            className={cn('prose-sathi', className)}
            /**
             * Safe because every write path runs `sanitizeRichText`
             * (`src/lib/html/sanitize.ts`) inside the Zod schema, so the stored
             * value is already reduced to the allow-list this stylesheet covers.
             * Never pass visitor-submitted HTML here — only CMS fields.
             */
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export function SectionCard({
    id,
    title,
    description,
    icon,
    children,
    actions,
    className,
}: {
    id?: string;
    title: string;
    description?: string;
    icon?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <Card as="section" id={id} className={cn('scroll-mt-28', className)}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                    {icon ? (
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-navy-50 text-navy-700">
                            <Icon name={icon} className="h-4 w-4" />
                        </span>
                    ) : null}
                    <div className="min-w-0">
                        <h2 className="section-title text-[15px] md:text-[16px]">{title}</h2>
                        {description ? <p className="mt-0.5 text-[12px] text-ink-soft">{description}</p> : null}
                    </div>
                </div>
                {actions}
            </div>
            {children}
        </Card>
    );
}

export function KeyValueGrid({
    items,
    columns = 2,
    className,
}: {
    items: { label: string; value: React.ReactNode }[];
    columns?: 2 | 3 | 4;
    className?: string;
}) {
    return (
        <dl
            className={cn(
                'grid gap-3',
                columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4',
                className,
            )}
        >
            {items.map((item) => (
                <div key={item.label} className="rounded-[10px] border border-line bg-muted/50 px-3 py-2">
                    <dt className="text-[10.5px] uppercase tracking-wide text-ink-soft">{item.label}</dt>
                    <dd className="mt-0.5 text-[13px] font-bold text-ink">{item.value ?? '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

export function FaqAccordion({
    faqs,
    className,
}: {
    faqs: { question: string; answer: string }[];
    className?: string;
}) {
    if (faqs.length === 0) return null;
    return (
        <div className={cn('divide-y divide-line', className)}>
            {faqs.map((faq, index) => (
                <details key={index} className="group py-3" open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-ink marker:hidden">
                        {faq.question}
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-transform group-open:rotate-45">
                            +
                        </span>
                    </summary>
                    <div className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                        <RichText html={faq.answer} />
                    </div>
                </details>
            ))}
        </div>
    );
}

export function DataNotice({ note, className }: { note?: string; className?: string }) {
    if (!note) return null;
    return (
        <p
            className={cn(
                'rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] leading-relaxed text-orange-700',
                className,
            )}
        >
            {note}
        </p>
    );
}

export function CtaBanner({
    title,
    description,
    ctaLabel,
    ctaUrl,
    tone = 'navy',
}: {
    title: string;
    description?: string;
    ctaLabel: string;
    ctaUrl: string;
    tone?: 'navy' | 'orange' | 'teal';
}) {
    const tones = {
        navy: 'bg-navy-800 text-white',
        orange: 'bg-orange text-white',
        teal: 'bg-teal text-white',
    } as const;

    return (
        <section
            className={cn(
                'flex flex-col items-start justify-between gap-3 rounded-panel p-4 md:flex-row md:items-center md:p-5',
                tones[tone],
            )}
        >
            <div>
                <h2 className="text-[15px] font-extrabold">{title}</h2>
                {description ? <p className="mt-1 text-[12.5px] opacity-80">{description}</p> : null}
            </div>
            <Link
                href={ctaUrl}
                className="inline-flex h-10 shrink-0 items-center rounded-[10px] bg-white px-4 text-[12.5px] font-bold text-navy-800 transition-transform hover:-translate-y-0.5"
            >
                {ctaLabel}
            </Link>
        </section>
    );
}
