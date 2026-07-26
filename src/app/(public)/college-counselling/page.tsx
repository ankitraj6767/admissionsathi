import type { Metadata } from 'next';
import { CounsellingLanding } from '@/components/counselling/counselling-landing';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
    title: 'College Counselling — Shortlisting & Choice Filling Help',
    description:
        'Free college counselling: build a realistic shortlist, order your preferences for counselling rounds and prepare the right documents.',
    path: '/college-counselling',
});

export default function CollegeCounsellingPage() {
    return (
        <CounsellingLanding
            type="college"
            path="/college-counselling"
            eyebrow="College selection"
            title="College counselling"
            description="Turn a long list of colleges into a shortlist you can defend — on fees, outcomes, location and your actual score."
            benefits={[
                { icon: 'Building2', title: 'Realistic shortlist', detail: 'Safe, target and ambitious options based on your score.' },
                { icon: 'GitCompare', title: 'Side-by-side comparison', detail: 'Fees, placements, accreditation and hostel costs compared.' },
                { icon: 'Target', title: 'Choice-filling order', detail: 'Preference order that maximises your allotment chances.' },
                { icon: 'FileCheck', title: 'Document readiness', detail: 'Exactly which documents to carry for verification.' },
            ]}
            agenda={[
                'Your score, category, quota and domicile position',
                'Budget range including hostel and living costs',
                'Shortlist review across safe, target and reach colleges',
                'Round-by-round choice filling strategy',
                'Backup options if the first rounds do not go your way',
            ]}
        />
    );
}
