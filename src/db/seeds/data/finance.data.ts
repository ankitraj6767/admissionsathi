export interface LoanProviderSeed {
    name: string;
    slug: string;
    providerType: 'Public Bank' | 'Private Bank' | 'NBFC' | 'Fintech' | 'International';
    summary: string;
    interestRateMin: number;
    interestRateMax: number;
    maxLoanAmount: number;
    maxLoanAmountWithoutCollateral: number;
    collateralRequiredAbove: number;
    processingFeePercent: number;
    moratoriumMonths: number;
    maxTenureYears: number;
    processingTimeDays: string;
    coversAbroad: boolean;
    rating: number;
    featured?: boolean;
}

/**
 * 8 demonstration education-loan providers.
 * Rates and limits are illustrative samples — confirm current terms with the lender.
 */
export const LOAN_PROVIDER_SEEDS: LoanProviderSeed[] = [
    { name: 'Bharat Sampann Bank', slug: 'bharat-sampann-bank', providerType: 'Public Bank', summary: 'Public sector education loan with concessional rates for girl students and government-quota seats.', interestRateMin: 8.05, interestRateMax: 10.75, maxLoanAmount: 15000000, maxLoanAmountWithoutCollateral: 750000, collateralRequiredAbove: 750000, processingFeePercent: 0, moratoriumMonths: 12, maxTenureYears: 15, processingTimeDays: '7 – 12 working days', coversAbroad: true, rating: 4.3, featured: true },
    { name: 'Sethu Cooperative Bank', slug: 'sethu-cooperative-bank', providerType: 'Public Bank', summary: 'Regional public bank with simple documentation for domestic professional courses.', interestRateMin: 8.4, interestRateMax: 11.2, maxLoanAmount: 5000000, maxLoanAmountWithoutCollateral: 400000, collateralRequiredAbove: 400000, processingFeePercent: 0.25, moratoriumMonths: 12, maxTenureYears: 12, processingTimeDays: '10 – 15 working days', coversAbroad: false, rating: 4.0 },
    { name: 'Meridian Private Bank', slug: 'meridian-private-bank', providerType: 'Private Bank', summary: 'Digital-first sanction process with pre-approved offers for select institutes.', interestRateMin: 9.25, interestRateMax: 13.5, maxLoanAmount: 8000000, maxLoanAmountWithoutCollateral: 4000000, collateralRequiredAbove: 4000000, processingFeePercent: 1, moratoriumMonths: 12, maxTenureYears: 12, processingTimeDays: '3 – 6 working days', coversAbroad: true, rating: 4.4, featured: true },
    { name: 'Nexora Finance', slug: 'nexora-finance', providerType: 'NBFC', summary: 'Collateral-free loans for management and engineering seats with flexible repayment.', interestRateMin: 10.5, interestRateMax: 15.25, maxLoanAmount: 6000000, maxLoanAmountWithoutCollateral: 6000000, collateralRequiredAbove: 6000000, processingFeePercent: 1.5, moratoriumMonths: 6, maxTenureYears: 10, processingTimeDays: '2 – 5 working days', coversAbroad: true, rating: 4.1, featured: true },
    { name: 'Vidyakosh Capital', slug: 'vidyakosh-capital', providerType: 'NBFC', summary: 'Specialist in medical and nursing programme financing, including hostel and equipment costs.', interestRateMin: 11, interestRateMax: 15.9, maxLoanAmount: 4000000, maxLoanAmountWithoutCollateral: 2500000, collateralRequiredAbove: 2500000, processingFeePercent: 2, moratoriumMonths: 12, maxTenureYears: 10, processingTimeDays: '3 – 7 working days', coversAbroad: false, rating: 3.9 },
    { name: 'CampusPay Fintech', slug: 'campuspay-fintech', providerType: 'Fintech', summary: 'App-based semester-wise fee financing with zero-cost EMI options on select colleges.', interestRateMin: 12.5, interestRateMax: 18, maxLoanAmount: 1500000, maxLoanAmountWithoutCollateral: 1500000, collateralRequiredAbove: 1500000, processingFeePercent: 2.5, moratoriumMonths: 0, maxTenureYears: 5, processingTimeDays: '24 – 72 hours', coversAbroad: false, rating: 3.8 },
    { name: 'Anantam Housing & Education Finance', slug: 'anantam-education-finance', providerType: 'NBFC', summary: 'Property-backed education loans with higher sanction limits and long tenures.', interestRateMin: 9.75, interestRateMax: 12.6, maxLoanAmount: 20000000, maxLoanAmountWithoutCollateral: 1000000, collateralRequiredAbove: 1000000, processingFeePercent: 1, moratoriumMonths: 12, maxTenureYears: 15, processingTimeDays: '10 – 18 working days', coversAbroad: true, rating: 4.0 },
    { name: 'GlobalEd Lenders', slug: 'globaled-lenders', providerType: 'International', summary: 'Cross-border lender for study-abroad programmes with USD and INR disbursal options.', interestRateMin: 10.9, interestRateMax: 14.75, maxLoanAmount: 12000000, maxLoanAmountWithoutCollateral: 7500000, collateralRequiredAbove: 7500000, processingFeePercent: 1.75, moratoriumMonths: 6, maxTenureYears: 12, processingTimeDays: '5 – 10 working days', coversAbroad: true, rating: 4.2 },
];

export const LOAN_DOCUMENTS = [
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

export interface ScholarshipSeed {
    name: string;
    slug: string;
    provider: string;
    providerType: 'Government' | 'Private' | 'Institute' | 'NGO' | 'International';
    benefitType: 'Full Tuition' | 'Partial Tuition' | 'Fixed Amount' | 'Monthly Stipend' | 'Other';
    amountMin?: number;
    amountMax?: number;
    targetLevels: string[];
    targetCategories: string[];
    minPercentage?: number;
    maxFamilyIncome?: number;
    courseSlugs?: string[];
    deadlineMonthOffset: number;
    featured?: boolean;
}

/** 20 demonstration scholarships. */
export const SCHOLARSHIP_SEEDS: ScholarshipSeed[] = [
    { name: 'National Merit Scholarship for Professional Courses', slug: 'national-merit-professional-courses', provider: 'Ministry of Education (demo)', providerType: 'Government', benefitType: 'Fixed Amount', amountMin: 20000, amountMax: 60000, targetLevels: ['Undergraduate'], targetCategories: ['General', 'OBC-NCL'], minPercentage: 80, maxFamilyIncome: 800000, deadlineMonthOffset: 2, featured: true },
    { name: 'Post Matric Scholarship for SC Students', slug: 'post-matric-sc-scholarship', provider: 'State Social Welfare Department (demo)', providerType: 'Government', benefitType: 'Full Tuition', targetLevels: ['Undergraduate', 'Postgraduate'], targetCategories: ['SC'], maxFamilyIncome: 250000, deadlineMonthOffset: 1, featured: true },
    { name: 'Post Matric Scholarship for ST Students', slug: 'post-matric-st-scholarship', provider: 'State Tribal Welfare Department (demo)', providerType: 'Government', benefitType: 'Full Tuition', targetLevels: ['Undergraduate', 'Postgraduate'], targetCategories: ['ST'], maxFamilyIncome: 250000, deadlineMonthOffset: 1 },
    { name: 'OBC Central Sector Scholarship', slug: 'obc-central-sector-scholarship', provider: 'Central Government (demo)', providerType: 'Government', benefitType: 'Partial Tuition', amountMax: 120000, targetLevels: ['Undergraduate'], targetCategories: ['OBC-NCL'], maxFamilyIncome: 800000, deadlineMonthOffset: 3 },
    { name: 'Pragati Scholarship for Girl Students in Technical Education', slug: 'pragati-scholarship-girls', provider: 'AICTE (demo)', providerType: 'Government', benefitType: 'Fixed Amount', amountMax: 50000, targetLevels: ['Undergraduate', 'Diploma'], targetCategories: ['General', 'OBC-NCL', 'SC', 'ST'], maxFamilyIncome: 800000, courseSlugs: ['b-tech', 'diploma-engineering'], deadlineMonthOffset: 4, featured: true },
    { name: 'Saksham Scholarship for Differently Abled Students', slug: 'saksham-scholarship', provider: 'AICTE (demo)', providerType: 'Government', benefitType: 'Fixed Amount', amountMax: 50000, targetLevels: ['Undergraduate', 'Diploma'], targetCategories: ['PwD'], maxFamilyIncome: 800000, deadlineMonthOffset: 4 },
    { name: 'Medical Aspirants Support Grant', slug: 'medical-aspirants-support-grant', provider: 'Sundaram Health Trust (demo)', providerType: 'NGO', benefitType: 'Partial Tuition', amountMax: 200000, targetLevels: ['Undergraduate'], targetCategories: ['General', 'OBC-NCL', 'SC', 'ST'], minPercentage: 75, maxFamilyIncome: 600000, courseSlugs: ['mbbs', 'bds', 'b-sc-nursing'], deadlineMonthOffset: 2, featured: true },
    { name: 'Future Engineers Fellowship', slug: 'future-engineers-fellowship', provider: 'Nexora Foundation (demo)', providerType: 'Private', benefitType: 'Monthly Stipend', amountMin: 5000, amountMax: 10000, targetLevels: ['Undergraduate'], targetCategories: ['General'], minPercentage: 85, courseSlugs: ['b-tech', 'b-tech-cse'], deadlineMonthOffset: 3 },
    { name: 'Women in Technology Scholarship', slug: 'women-in-technology-scholarship', provider: 'Sunridge Trust (demo)', providerType: 'Private', benefitType: 'Partial Tuition', amountMax: 150000, targetLevels: ['Undergraduate', 'Postgraduate'], targetCategories: ['General', 'OBC-NCL'], courseSlugs: ['b-tech-cse', 'bca', 'mca'], deadlineMonthOffset: 5, featured: true },
    { name: 'Institute Merit Fee Waiver', slug: 'institute-merit-fee-waiver', provider: 'Participating institutes (demo)', providerType: 'Institute', benefitType: 'Partial Tuition', amountMax: 100000, targetLevels: ['Undergraduate', 'Postgraduate'], targetCategories: ['General'], minPercentage: 90, deadlineMonthOffset: 6 },
    { name: 'Nursing Care Scholarship', slug: 'nursing-care-scholarship', provider: 'Willowbrook Trust (demo)', providerType: 'NGO', benefitType: 'Fixed Amount', amountMax: 40000, targetLevels: ['Undergraduate', 'Diploma'], targetCategories: ['General', 'SC', 'ST'], courseSlugs: ['b-sc-nursing', 'gnm'], deadlineMonthOffset: 2 },
    { name: 'Pharmacy Research Scholarship', slug: 'pharmacy-research-scholarship', provider: 'Lakeside Research Council (demo)', providerType: 'Institute', benefitType: 'Monthly Stipend', amountMin: 8000, amountMax: 12400, targetLevels: ['Postgraduate'], targetCategories: ['General'], courseSlugs: ['m-pharma'], deadlineMonthOffset: 4 },
    { name: 'Law Access Scholarship', slug: 'law-access-scholarship', provider: 'Riverdale Legal Trust (demo)', providerType: 'NGO', benefitType: 'Partial Tuition', amountMax: 175000, targetLevels: ['Undergraduate', 'Integrated'], targetCategories: ['General', 'OBC-NCL', 'SC'], courseSlugs: ['ba-llb', 'llb'], deadlineMonthOffset: 3 },
    { name: 'Management Leaders Grant', slug: 'management-leaders-grant', provider: 'Crestview Alumni Fund (demo)', providerType: 'Institute', benefitType: 'Partial Tuition', amountMax: 400000, targetLevels: ['Postgraduate'], targetCategories: ['General'], courseSlugs: ['mba', 'pgdm'], deadlineMonthOffset: 7 },
    { name: 'Rural Talent Scholarship', slug: 'rural-talent-scholarship', provider: 'Bharat Gramin Foundation (demo)', providerType: 'NGO', benefitType: 'Fixed Amount', amountMax: 35000, targetLevels: ['Undergraduate', 'Diploma'], targetCategories: ['General', 'OBC-NCL', 'SC', 'ST'], maxFamilyIncome: 300000, deadlineMonthOffset: 2 },
    { name: 'Single Girl Child Scholarship', slug: 'single-girl-child-scholarship', provider: 'University Grants body (demo)', providerType: 'Government', benefitType: 'Monthly Stipend', amountMin: 3100, amountMax: 3100, targetLevels: ['Postgraduate'], targetCategories: ['General'], deadlineMonthOffset: 5 },
    { name: 'Paramedical Skills Scholarship', slug: 'paramedical-skills-scholarship', provider: 'Bluewater Health Trust (demo)', providerType: 'NGO', benefitType: 'Fixed Amount', amountMax: 30000, targetLevels: ['Undergraduate'], targetCategories: ['General', 'OBC-NCL'], courseSlugs: ['bpt', 'b-sc-mlt', 'b-sc-radiology'], deadlineMonthOffset: 3 },
    { name: 'Study Abroad Bridge Scholarship', slug: 'study-abroad-bridge-scholarship', provider: 'GlobalEd Foundation (demo)', providerType: 'International', benefitType: 'Partial Tuition', amountMax: 800000, targetLevels: ['Postgraduate'], targetCategories: ['General'], minPercentage: 75, deadlineMonthOffset: 8 },
    { name: 'Sports Excellence Scholarship', slug: 'sports-excellence-scholarship', provider: 'State Sports Authority (demo)', providerType: 'Government', benefitType: 'Fixed Amount', amountMax: 90000, targetLevels: ['Undergraduate'], targetCategories: ['General', 'OBC-NCL', 'SC', 'ST'], deadlineMonthOffset: 6 },
    { name: 'First Generation Learner Support', slug: 'first-generation-learner-support', provider: 'Admission Sathi Foundation (demo)', providerType: 'NGO', benefitType: 'Fixed Amount', amountMax: 25000, targetLevels: ['Undergraduate', 'Diploma'], targetCategories: ['General', 'OBC-NCL', 'SC', 'ST'], maxFamilyIncome: 400000, deadlineMonthOffset: 1, featured: true },
];
