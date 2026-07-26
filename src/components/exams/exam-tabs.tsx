'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EXAM_SECTIONS } from '@/config/exam-sections';

export function ExamTabs({ base }: { base: string }) {
    const pathname = usePathname() ?? base;
    const active = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : '';

    return (
        <nav aria-label="Exam sections" className="overflow-x-auto no-scrollbar">
            <ul className="flex min-w-max gap-1.5">
                {EXAM_SECTIONS.map((section) => {
                    const href = section.segment ? `${base}/${section.segment}` : base;
                    const isActive = active === section.segment;
                    return (
                        <li key={section.label}>
                            <Link
                                href={href}
                                aria-current={isActive ? 'page' : undefined}
                                className={`inline-flex h-8 items-center rounded-pill border px-3 text-[11.5px] font-semibold transition-colors ${isActive
                                        ? 'border-orange bg-orange text-white'
                                        : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {section.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
