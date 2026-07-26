import Link from 'next/link';
import { ArrowRight, Building2, Clock, IndianRupee } from 'lucide-react';
import { Badge, IconTile } from '@/components/ui/primitives';
import { formatCompactINR } from '@/lib/utils';
import type { CourseDoc } from '@/db/models/course.model';

export interface CourseCardData {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    level: string;
    durationLabel: string;
    studyModes: string[];
    feeMin?: number;
    feeMax?: number;
    salaryMin?: number;
    collegeCount: number;
    icon?: string;
    themeColor?: string;
    isFeatured?: boolean;
}

export function toCourseCard(course: CourseDoc): CourseCardData {
    return {
        id: String(course._id),
        name: course.name,
        slug: course.slug,
        categoryName: course.categoryName,
        level: course.level,
        durationLabel: course.durationLabel,
        studyModes: course.studyModes ?? [],
        feeMin: course.averageFee?.min,
        feeMax: course.averageFee?.max,
        salaryMin: course.averageSalary?.min,
        collegeCount: course.collegeCount ?? 0,
        icon: course.icon,
        themeColor: course.themeColor,
        isFeatured: course.isFeatured,
    };
}

export function CourseCard({ course }: { course: CourseCardData }) {
    return (
        <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised">
            <div className="flex items-start gap-3">
                <IconTile icon={course.icon ?? 'GraduationCap'} tone={course.themeColor ?? 'navy'} />
                <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-extrabold leading-snug text-ink">
                        <Link href={`/courses/${course.slug}`} className="hover:text-navy-700">
                            {course.name}
                        </Link>
                    </h3>
                    <p className="mt-0.5 text-[11.5px] text-ink-soft">{course.categoryName}</p>
                </div>
                {course.isFeatured ? <Badge tone="solidOrange">Popular</Badge> : null}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                    <dt className="sr-only">Duration</dt>
                    <dd className="font-semibold text-ink">{course.durationLabel}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge tone="neutral">{course.level}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                    <dt className="sr-only">Average fee</dt>
                    <dd className="font-semibold text-ink">
                        {course.feeMin ? `${formatCompactINR(course.feeMin)}+` : '—'}
                    </dd>
                </div>
                <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                    <dt className="sr-only">Colleges</dt>
                    <dd className="font-semibold text-ink">{course.collegeCount} colleges</dd>
                </div>
            </dl>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                <Link
                    href={`/courses/${course.slug}/colleges`}
                    className="text-[11.5px] font-bold text-navy-600 hover:text-orange"
                >
                    View colleges
                </Link>
                <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-navy px-3 text-[11.5px] font-bold text-white hover:bg-navy-800"
                >
                    Details
                    <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
            </div>
        </article>
    );
}
