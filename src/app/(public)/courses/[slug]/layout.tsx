import type { ReactNode } from 'react';
import { listCourseSitemapSlugs } from '@/db/repositories/course.repository';

export const revalidate = 900;

/** Pre-render published course routes, including their tab pages, for fast navigation. */
export async function generateStaticParams() {
    const courses = await listCourseSitemapSlugs(200);
    return courses.map(({ slug }) => ({ slug }));
}

export default function CourseLayout({ children }: { children: ReactNode }) {
    return children;
}
