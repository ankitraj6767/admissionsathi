import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

/* ---------------------------------- Card --------------------------------- */

export function Card({
    className,
    as: Tag = 'div',
    padded = true,
    hoverable = false,
    ...props
}: React.HTMLAttributes<HTMLElement> & {
    as?: React.ElementType;
    padded?: boolean;
    hoverable?: boolean;
}) {
    return (
        <Tag
            className={cn(
                'rounded-panel border border-line bg-card shadow-card',
                padded && 'p-4 md:p-5',
                hoverable &&
                'transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised',
                className,
            )}
            {...props}
        />
    );
}

/* --------------------------------- Badge --------------------------------- */

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide',
    {
        variants: {
            tone: {
                navy: 'bg-navy-50 text-navy-700',
                orange: 'bg-orange-50 text-orange-700',
                green: 'bg-green-50 text-green',
                teal: 'bg-teal-50 text-teal-600',
                purple: 'bg-purple-50 text-purple',
                pink: 'bg-pink-50 text-pink',
                blue: 'bg-blue-50 text-blue',
                neutral: 'bg-muted text-ink-soft',
                red: 'bg-red-50 text-red-alert',
                amber: 'bg-amber-50 text-amber-alert',
                solidOrange: 'bg-orange text-white',
                solidGreen: 'bg-green text-white',
                solidNavy: 'bg-navy text-white',
            },
            size: { sm: 'text-[10px] px-1.5', md: '', lg: 'text-[11.5px] px-2.5 py-1' },
        },
        defaultVariants: { tone: 'neutral', size: 'md' },
    },
);

export function Badge({
    className,
    tone,
    size,
    icon,
    children,
    ...props
}: React.HTMLAttributes<HTMLSpanElement> &
    VariantProps<typeof badgeVariants> & { icon?: string }) {
    return (
        <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
            {icon ? <Icon name={icon} className="h-3 w-3" /> : null}
            {children}
        </span>
    );
}

/* ------------------------------ Section header --------------------------- */

export function SectionHeader({
    title,
    description,
    ctaLabel,
    ctaUrl,
    className,
    as: Heading = 'h2',
    compact = false,
}: {
    title: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    className?: string;
    as?: 'h2' | 'h3';
    compact?: boolean;
}) {
    return (
        <div className={cn('flex items-start justify-between gap-3', compact ? 'mb-3' : 'mb-4', className)}>
            <div className="min-w-0">
                <Heading className="section-title truncate text-[15px] md:text-[17px]">{title}</Heading>
                {description ? (
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-soft md:text-xs">{description}</p>
                ) : null}
            </div>
            {ctaLabel && ctaUrl ? (
                <Link href={ctaUrl} className="link-more mt-1 shrink-0 whitespace-nowrap">
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            ) : null}
        </div>
    );
}

/* ------------------------------ Icon tile -------------------------------- */

const toneStyles: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    blue: 'bg-blue-50 text-blue',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green',
    purple: 'bg-purple-50 text-purple',
    pink: 'bg-pink-50 text-pink',
    neutral: 'bg-muted text-ink-soft',
};

export function IconTile({
    icon,
    tone = 'navy',
    size = 'md',
    className,
}: {
    icon?: string;
    tone?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const dims = size === 'sm' ? 'h-8 w-8 rounded-[9px]' : size === 'lg' ? 'h-12 w-12 rounded-[14px]' : 'h-10 w-10 rounded-[11px]';
    const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]';
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center',
                dims,
                toneStyles[tone] ?? toneStyles.navy,
                className,
            )}
        >
            <Icon name={icon} className={iconSize} strokeWidth={2.1} />
        </span>
    );
}

export { toneStyles };

/* ------------------------------- Skeletons ------------------------------- */

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('skeleton', className)} aria-hidden />;
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <Card className={className}>
            <Skeleton className="mb-3 h-10 w-10 rounded-[11px]" />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={cn('mb-2 h-3', i === lines - 1 ? 'w-1/2' : 'w-full')} />
            ))}
        </Card>
    );
}

/* ------------------------------ Empty state ------------------------------ */

export function EmptyState({
    icon = 'Search',
    title,
    description,
    action,
    className,
}: {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-panel border border-dashed border-line bg-white/70 px-6 py-12 text-center',
                className,
            )}
        >
            <IconTile icon={icon} tone="neutral" size="lg" />
            <h3 className="mt-3 text-[15px] font-bold text-ink">{title}</h3>
            {description ? <p className="mt-1 max-w-md text-[13px] text-ink-soft">{description}</p> : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}

/* --------------------------------- Alert --------------------------------- */

export function Alert({
    tone = 'info',
    title,
    children,
    icon,
    className,
}: {
    tone?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
    title?: string;
    children?: React.ReactNode;
    icon?: string;
    className?: string;
}) {
    const tones: Record<string, string> = {
        info: 'border-blue-50 bg-blue-50/70 text-navy-800',
        success: 'border-green-50 bg-green-50/80 text-green',
        warning: 'border-orange-100 bg-orange-50 text-orange-700',
        error: 'border-red-100 bg-red-50 text-red-alert',
        neutral: 'border-line bg-muted text-ink-soft',
    };
    const icons: Record<string, string> = {
        info: 'Info',
        success: 'CheckCircle2',
        warning: 'ShieldCheck',
        error: 'CircleHelp',
        neutral: 'Info',
    };

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn('flex gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13px]', tones[tone], className)}
        >
            <Icon name={icon ?? icons[tone]} className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">
                {title ? <p className="font-bold">{title}</p> : null}
                {children ? <div className="[&_a]:underline">{children}</div> : null}
            </div>
        </div>
    );
}

/* -------------------------------- Divider -------------------------------- */

export function Divider({ className }: { className?: string }) {
    return <hr className={cn('border-t border-line', className)} />;
}

/* ------------------------------ Rating stars ----------------------------- */

export function RatingStars({
    value,
    size = 'md',
    showValue = true,
    count,
    className,
}: {
    value: number;
    size?: 'sm' | 'md';
    showValue?: boolean;
    count?: number;
    className?: string;
}) {
    const dim = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
    const rounded = Math.round(value * 2) / 2;

    return (
        <span className={cn('inline-flex items-center gap-1', className)}>
            <span className="inline-flex" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className={cn(dim, i <= rounded ? 'text-amber-alert' : 'text-line')} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                    </svg>
                ))}
            </span>
            {showValue ? (
                <span className="text-[11.5px] font-bold text-ink">
                    {value ? value.toFixed(1) : '—'}
                    {count ? <span className="ml-0.5 font-medium text-ink-soft">({count})</span> : null}
                </span>
            ) : null}
            <span className="sr-only">{`Rated ${value.toFixed(1)} out of 5`}</span>
        </span>
    );
}

/* --------------------------------- Chip ---------------------------------- */

export function Chip({
    href,
    children,
    active = false,
    onClick,
    className,
}: {
    href?: string;
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}) {
    const classes = cn('chip', active && 'border-orange-200 bg-orange-50 text-orange-700', className);
    if (href) {
        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} className={classes}>
            {children}
        </button>
    );
}
