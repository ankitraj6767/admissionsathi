import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolvePageBannerVisual } from '@/lib/page-banner-images';
import { PageBannerImage } from '@/components/shared/page-banner-image';
import type { BreadcrumbItem } from '@/types/common';

export function Breadcrumbs({
    items,
    tone = 'light',
    className,
}: {
    items: BreadcrumbItem[];
    tone?: 'light' | 'dark';
    className?: string;
}) {
    return (
        <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
            <ol className="flex flex-wrap items-center gap-1 text-[11.5px]">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'hover:underline',
                                        tone === 'dark' ? 'text-white/70 hover:text-white' : 'text-ink-soft hover:text-navy-700',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    aria-current={isLast ? 'page' : undefined}
                                    className={cn('font-semibold', tone === 'dark' ? 'text-white' : 'text-ink')}
                                >
                                    {item.label}
                                </span>
                            )}
                            {!isLast ? (
                                <ChevronRight
                                    className={cn('h-3 w-3', tone === 'dark' ? 'text-white/40' : 'text-ink-soft/60')}
                                    aria-hidden
                                />
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/** Standard band at the top of listing and detail pages. */
export function PageHeader({
    title,
    description,
    breadcrumbs,
    eyebrow,
    actions,
    tone = 'navy',
    children,
}: {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    eyebrow?: string;
    actions?: React.ReactNode;
    tone?: 'navy' | 'light';
    children?: React.ReactNode;
}) {
    const dark = tone === 'navy';
    const bannerVisual = resolvePageBannerVisual({ title, description, eyebrow, breadcrumbs });

    return (
        <section
            className={cn(
                'relative isolate min-h-[150px] overflow-hidden border-b border-white/30 md:min-h-[184px] lg:flex lg:min-h-[442px] lg:flex-col lg:justify-end',
                dark ? 'text-[#17324b]' : 'text-navy-800',
            )}
        >
            <PageBannerImage
                src={bannerVisual.src}
                priority
                className={cn('object-cover', bannerVisual.objectPosition)}
            />
            <div className="shell relative py-6 md:py-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div
                        className={cn(
                            'banner-copy-panel min-w-0 max-w-full',
                            dark ? 'banner-copy-on-photo' : 'banner-copy-on-image-light',
                        )}
                    >
                        {breadcrumbs?.length ? (
                            <Breadcrumbs
                                items={breadcrumbs}
                                tone="light"
                                className="banner-breadcrumbs-on-photo mb-2"
                            />
                        ) : null}
                        {eyebrow ? (
                            <p
                                className={cn(
                                    'mb-1 text-[10.5px] font-bold uppercase tracking-[0.14em]',
                                    dark ? 'text-[#9a3412]' : 'text-orange-700',
                                )}
                            >
                                {eyebrow}
                            </p>
                        ) : null}
                        <h1
                            className={cn(
                                'max-w-4xl font-display text-[25px] font-extrabold leading-[1.12] tracking-[-0.02em] md:text-[32px] lg:text-[36px]',
                                dark ? 'text-[#142b3e]' : 'text-navy-800',
                            )}
                        >
                            {title}
                        </h1>
                        {description ? (
                            <p
                                className={cn(
                                    'mt-2 max-w-3xl text-[13.5px] font-medium leading-relaxed md:text-[14px]',
                                    dark ? 'text-[#334b5f]' : 'text-ink-soft',
                                )}
                            >
                                {description}
                            </p>
                        ) : null}
                    </div>

                    {actions ? (
                        <div className="banner-actions-on-photo flex shrink-0 flex-wrap gap-2">
                            {actions}
                        </div>
                    ) : null}
                </div>

                {children ? <div className="banner-nav-on-photo mt-4">{children}</div> : null}
            </div>
        </section>
    );
}
