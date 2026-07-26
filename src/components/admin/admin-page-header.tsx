import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Icon } from '@/components/ui/icon';

export interface AdminPageHeaderProps {
    title: string;
    description?: string;
    icon?: string;
    breadcrumbs?: { label: string; href?: string }[];
    actions?: React.ReactNode;
}

export function AdminPageHeader({
    title,
    description,
    icon,
    breadcrumbs = [],
    actions,
}: AdminPageHeaderProps) {
    return (
        <div className="mb-4">
            {breadcrumbs.length > 0 ? (
                <nav aria-label="Breadcrumb" className="mb-2">
                    <ol className="flex flex-wrap items-center gap-1 text-[11px] text-ink-soft">
                        <li className="flex items-center gap-1">
                            <Link href="/admin" className="hover:text-navy-700">
                                Admin
                            </Link>
                            <ChevronRight className="h-3 w-3" aria-hidden />
                        </li>
                        {breadcrumbs.map((item, index) => (
                            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                                {item.href && index < breadcrumbs.length - 1 ? (
                                    <Link href={item.href} className="hover:text-navy-700">
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className="font-semibold text-ink">{item.label}</span>
                                )}
                                {index < breadcrumbs.length - 1 ? (
                                    <ChevronRight className="h-3 w-3" aria-hidden />
                                ) : null}
                            </li>
                        ))}
                    </ol>
                </nav>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                    {icon ? (
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-50 text-navy-700">
                            <Icon name={icon} className="h-4.5 w-4.5" />
                        </span>
                    ) : null}
                    <div className="min-w-0">
                        <h1 className="font-display text-[19px] font-extrabold text-navy-800 md:text-[22px]">{title}</h1>
                        {description ? (
                            <p className="mt-0.5 max-w-3xl text-[12.5px] text-ink-soft">{description}</p>
                        ) : null}
                    </div>
                </div>

                {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
            </div>
        </div>
    );
}
