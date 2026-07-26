import type { Metadata } from 'next';
import { CounsellingLanding } from '@/components/counselling/counselling-landing';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
    title: 'Course Counselling — Pick the Right Course & Specialisation',
    description:
        'Free course counselling: compare courses and specialisations on eligibility, fees, workload and career outcomes before you apply.',
    path: '/course-counselling',
});

export default function CourseCounsellingPage() {
    return (
        <CounsellingLanding
            type="course"
            path="/course-counselling"
            eyebrow="Course selection"
            title="Course counselling"
            description="Compare courses properly: entry requirements, workload, cost, licensing and what employers actually hire for."
            benefits={[
                { icon: 'BookOpen', title: 'Course fit', detail: 'Match the curriculum to your strengths, not just the brand name.' },
                { icon: 'ListChecks', title: 'Specialisation choice', detail: 'Which specialisation is worth the extra fee — and which is not.' },
                { icon: 'IndianRupee', title: 'Total cost view', detail: 'Fees, duration and opportunity cost compared across options.' },
                { icon: 'Briefcase', title: 'Career mapping', detail: 'Roles, licensing requirements and progression for each course.' },
            ]}
            agenda={[
                'Subjects you enjoy and the ones you struggle with',
                'Two or three courses you are considering, compared',
                'Eligibility and entrance exam requirements for each',
                'Fee and duration comparison including hidden costs',
                'Final recommendation with a written next-step plan',
            ]}
        />
    );
}
