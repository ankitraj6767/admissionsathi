import Link from 'next/link';
import { Card, EmptyState, SectionHeader, toneStyles } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { cn, formatCompactCount } from '@/lib/utils';
import type { CourseCategoryDoc } from '@/db/models/course.model';
import type { ResolvedSection } from '@/services/homepage.service';
import type { TopCoursesConfig } from '@/schemas/homepage.schema';

/** "Explore Top Courses" — category cards driven by the CourseCategory collection. */
export function TopCoursesSection({
    section,
    categories,
}: {
    section: ResolvedSection<TopCoursesConfig>;
    categories: CourseCategoryDoc[];
}) {
    return (
        <Card as="section" aria-labelledby="top-courses-heading" className="h-full">
            <SectionHeader
                title={section.heading ?? 'Explore Top Courses'}
                ctaLabel={section.ctaLabel}
                ctaUrl={section.ctaUrl}
            />
            <span id="top-courses-heading" className="sr-only">
                {section.heading ?? 'Explore Top Courses'}
            </span>

            {categories.length === 0 ? (
                <EmptyState
                    icon="GraduationCap"
                    title="Course categories are being prepared"
                    description="Add course categories from the admin dashboard to populate this section."
                />
            ) : (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                    {categories.map((category) => (
                        <li key={String(category._id)}>
                            <Link
                                href={`/courses/category/${category.slug}`}
                                className="group flex h-full min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-line bg-white px-2 py-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised"
                            >
                                <span
                                    className={cn(
                                        'inline-flex h-10 w-10 items-center justify-center rounded-[11px] transition-transform duration-300 group-hover:scale-105',
                                        toneStyles[category.themeColor] ?? toneStyles.navy,
                                    )}
                                >
                                    <Icon name={category.icon} className="h-5 w-5" strokeWidth={2.1} />
                                </span>
                                <span className="text-[12px] font-bold leading-tight text-ink">{category.name}</span>
                                <span className="text-[9.5px] leading-tight text-ink-soft">
                                    {category.subtitle ??
                                        (category.collegeCount
                                            ? `${formatCompactCount(category.collegeCount)} colleges`
                                            : 'Explore courses')}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
