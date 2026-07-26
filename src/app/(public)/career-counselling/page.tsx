import type { Metadata } from 'next';
import { CounsellingLanding } from '@/components/counselling/counselling-landing';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
    title: 'Career Counselling — Free Session with an Expert',
    description:
        'Free career counselling for students after Class 10, Class 12 and graduation. Aptitude-led stream selection, career mapping and a realistic action plan.',
    path: '/career-counselling',
});

export default function CareerCounsellingPage() {
    return (
        <CounsellingLanding
            type="career"
            path="/career-counselling"
            eyebrow="Career guidance"
            title="Career counselling"
            description="Work out which direction actually fits your strengths, interests and constraints — before you commit years and fees to a programme."
            benefits={[
                { icon: 'Compass', title: 'Direction, not guesswork', detail: 'Map your interests and strengths to realistic career paths.' },
                { icon: 'ListChecks', title: 'Stream and course fit', detail: 'Understand which streams open which doors, and which close them.' },
                { icon: 'TrendingUp', title: 'Outcome reality check', detail: 'Honest salary, competition and workload expectations.' },
                { icon: 'Route', title: 'Step-by-step plan', detail: 'A written next-step plan with exam and application timelines.' },
            ]}
            agenda={[
                'Your current academic stage, marks and subject comfort',
                'Interests, working style and long-term expectations',
                'Two or three viable career directions with pros and cons',
                'Entrance exams and qualifications each direction needs',
                'Immediate next steps for the current admission cycle',
            ]}
        />
    );
}
