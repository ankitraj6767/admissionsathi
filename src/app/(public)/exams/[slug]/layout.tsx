import type { ReactNode } from 'react';
import { listExamSitemapSlugs } from '@/db/repositories/exam.repository';

export const revalidate = 600;

/** Pre-render published exam routes and section pages for fast navigation. */
export async function generateStaticParams() {
    const exams = await listExamSitemapSlugs(200);
    return exams.map(({ slug }) => ({ slug }));
}

export default function ExamLayout({ children }: { children: ReactNode }) {
    return children;
}
