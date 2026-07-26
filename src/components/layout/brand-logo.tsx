import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Original wordmark + emblem for Admission Sathi.
 * Drawn inline as SVG so it stays crisp, themeable and free of third-party assets.
 */
export function BrandLogo({
    className,
    variant = 'light',
    showTagline = true,
    href = '/',
}: {
    className?: string;
    variant?: 'light' | 'dark';
    showTagline?: boolean;
    href?: string | null;
}) {
    const navy = variant === 'light' ? '#073174' : '#FFFFFF';
    const soft = variant === 'light' ? '#667085' : 'rgba(255,255,255,0.72)';

    const content = (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center">
                <svg viewBox="0 0 44 44" className="h-10 w-10" role="img" aria-label="Admission Sathi emblem">
                    <rect x="1.5" y="1.5" width="41" height="41" rx="12" fill={variant === 'light' ? '#EEF4FF' : 'rgba(255,255,255,0.12)'} />
                    <path d="M22 9.5 34 15l-12 5.5L10 15l12-5.5Z" fill="#073174" />
                    <path d="M22 22.6 31 18.5v5.4c0 3.6-3.9 6.6-9 6.6s-9-3-9-6.6v-5.4l9 4.1Z" fill="#FF6B17" />
                    <circle cx="33.4" cy="20.4" r="2" fill="#0AA39A" />
                    <path d="M33.4 22.4v5.2" stroke="#0AA39A" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M14 33.5h16" stroke={variant === 'light' ? '#073174' : '#FFFFFF'} strokeWidth="2.2" strokeLinecap="round" />
                </svg>
            </span>

            <span className="flex min-w-0 flex-col leading-none">
                <span className="flex items-baseline gap-1 font-display text-[17px] font-extrabold tracking-tight">
                    <span style={{ color: navy }}>ADMISSION</span>
                    <span className="text-orange">SATHI</span>
                </span>
                {showTagline ? (
                    <span className="mt-1 text-[10px] font-medium tracking-wide" style={{ color: soft }}>
                        Your Career, Our Mission
                    </span>
                ) : null}
            </span>
        </span>
    );

    if (!href) return content;

    return (
        <Link href={href} className="inline-flex shrink-0 items-center" aria-label="Admission Sathi home">
            {content}
        </Link>
    );
}
