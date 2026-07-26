/** Static finance reference content used by public pages and the seed script. */

export const LOAN_DOCUMENT_CHECKLIST = [
    'Admission / offer letter from the institute',
    'Fee structure issued by the institute',
    'Class 10, 12 and latest qualifying marksheets',
    'Entrance exam scorecard (where applicable)',
    'KYC of student and co-applicant (Aadhaar, PAN)',
    'Income proof of co-applicant (salary slips or ITR)',
    'Bank statements for the last 6 months',
    'Collateral documents (for secured loans above the free limit)',
    'Passport and visa (for study-abroad loans)',
];

export const LOAN_FAQS = [
    {
        question: 'Do I need collateral for an education loan?',
        answer:
            'Most lenders offer collateral-free loans up to a ceiling (commonly ₹7.5 lakh for domestic courses and higher for select institutes). Above that, tangible security or a stronger co-applicant is usually required.',
    },
    {
        question: 'What is a moratorium period?',
        answer:
            'It is the study period plus a grace window (often 6–12 months) before EMIs begin. Interest still accrues during this time, and is usually added to the principal unless you service it monthly.',
    },
    {
        question: 'Can I claim tax benefit on the interest?',
        answer:
            'Interest paid on an education loan is deductible under Section 80E for up to eight assessment years, subject to conditions. Confirm eligibility with a tax adviser.',
    },
    {
        question: 'Does the loan cover hostel and living costs?',
        answer:
            'Many lenders fund tuition plus hostel, examination fees, equipment and travel. The covered heads vary, so check the sanction letter carefully.',
    },
];

export const CIBIL_BANDS = [
    { label: 'Excellent (750+)', value: 'excellent' },
    { label: 'Good (700 – 749)', value: 'good' },
    { label: 'Average (650 – 699)', value: 'average' },
    { label: 'Not sure', value: 'unknown' },
] as const;
