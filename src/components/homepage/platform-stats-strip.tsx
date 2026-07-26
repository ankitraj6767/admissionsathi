'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Stat {
    label: string;
    value: string;
    icon?: string;
    tone?: string;
}

const tone: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    blue: 'bg-blue-50 text-blue',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green',
    purple: 'bg-purple-50 text-purple',
    pink: 'bg-pink-50 text-pink',
};

/** Splits "1 Lakh+" into numeric and suffix parts so only the number animates. */
function parseValue(value: string) {
    const match = value.match(/^([\d.]+)(.*)$/);
    if (!match) return { number: null, suffix: value };
    return { number: Number(match[1]), suffix: match[2] ?? '' };
}

function useInView<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || inView) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.35 },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [inView]);

    return { ref, inView };
}

function Counter({ value, animate }: { value: string; animate: boolean }) {
    const { number, suffix } = parseValue(value);
    const [display, setDisplay] = useState(animate && number !== null ? 0 : number);

    useEffect(() => {
        if (!animate || number === null) return;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            setDisplay(number);
            return;
        }

        let frame = 0;
        const duration = 900;
        const start = performance.now();

        const step = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - progress) ** 3;
            setDisplay(Number((number * eased).toFixed(number % 1 === 0 ? 0 : 1)));
            if (progress < 1) frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [animate, number]);

    return (
        <>
            {number === null ? value : `${display ?? 0}`}
            {number !== null ? suffix : ''}
        </>
    );
}

/** Platform statistics strip. Counters animate once, when scrolled into view. */
export function PlatformStatsStrip({
    stats,
    animateCounters,
}: {
    stats: Stat[];
    animateCounters: boolean;
}) {
    const { ref, inView } = useInView<HTMLDivElement>();
    if (stats.length === 0) return null;

    return (
        <section aria-label="Platform statistics" ref={ref}>
            <div className="rounded-panel border border-line bg-white px-3 py-4 shadow-card">
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {stats.map((stat) => (
                        <li key={stat.label} className="flex items-center justify-center gap-2.5">
                            <span
                                className={cn(
                                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]',
                                    tone[stat.tone ?? 'navy'] ?? tone.navy,
                                )}
                            >
                                <Icon name={stat.icon} className="h-[18px] w-[18px]" />
                            </span>
                            <span>
                                <span className="block text-[15px] font-extrabold leading-none text-navy-800">
                                    <Counter value={stat.value} animate={animateCounters && inView} />
                                </span>
                                <span className="mt-1 block text-[10.5px] font-medium text-ink-soft">{stat.label}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
