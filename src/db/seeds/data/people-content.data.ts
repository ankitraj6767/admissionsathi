import type { TrendingCategory } from '@/config/constants';

export interface CounsellorSeed {
    name: string;
    slug: string;
    designation: string;
    email: string;
    experienceYears: number;
    languages: string[];
    specializations: string[];
    categorySlugs: string[];
    qualifications: string[];
    rating: number;
    ratingCount: number;
    featured?: boolean;
}

/** 10 demonstration counsellors. */
export const COUNSELLOR_SEEDS: CounsellorSeed[] = [
    { name: 'Ananya Deshpande', slug: 'ananya-deshpande', designation: 'Senior Career Counsellor', email: 'ananya.deshpande@admissionsathi.org', experienceYears: 11, languages: ['English', 'Hindi', 'Marathi'], specializations: ['Engineering admissions', 'JEE counselling', 'Career mapping'], categorySlugs: ['engineering', 'bca-it'], qualifications: ['M.A. Psychology', 'Certified Career Analyst'], rating: 4.8, ratingCount: 214, featured: true },
    { name: 'Rahul Verma', slug: 'rahul-verma', designation: 'Medical Admissions Specialist', email: 'rahul.verma@admissionsathi.org', experienceYears: 9, languages: ['English', 'Hindi'], specializations: ['NEET UG counselling', 'State medical quotas', 'MBBS abroad'], categorySlugs: ['medical', 'nursing'], qualifications: ['B.Sc, MBA (Healthcare)'], rating: 4.7, ratingCount: 186, featured: true },
    { name: 'Meera Krishnan', slug: 'meera-krishnan', designation: 'Management Career Coach', email: 'meera.krishnan@admissionsathi.org', experienceYears: 13, languages: ['English', 'Tamil', 'Hindi'], specializations: ['MBA admissions', 'CAT/XAT strategy', 'Profile building'], categorySlugs: ['management'], qualifications: ['MBA (Finance)'], rating: 4.9, ratingCount: 241, featured: true },
    { name: 'Imran Sheikh', slug: 'imran-sheikh', designation: 'Law Admissions Counsellor', email: 'imran.sheikh@admissionsathi.org', experienceYears: 7, languages: ['English', 'Hindi', 'Urdu'], specializations: ['CLAT counselling', 'NLU preferences'], categorySlugs: ['law'], qualifications: ['BA LLB'], rating: 4.6, ratingCount: 132 },
    { name: 'Sneha Patil', slug: 'sneha-patil', designation: 'Education Finance Advisor', email: 'sneha.patil@admissionsathi.org', experienceYears: 8, languages: ['English', 'Hindi', 'Marathi'], specializations: ['Education loans', 'Scholarship applications'], categorySlugs: ['management', 'engineering'], qualifications: ['M.Com, CFP'], rating: 4.7, ratingCount: 158, featured: true },
    { name: 'Arjun Nair', slug: 'arjun-nair', designation: 'Pharmacy & Allied Health Counsellor', email: 'arjun.nair@admissionsathi.org', experienceYears: 6, languages: ['English', 'Malayalam', 'Hindi'], specializations: ['Pharmacy admissions', 'Paramedical pathways'], categorySlugs: ['pharmacy', 'paramedical'], qualifications: ['B.Pharm, MBA'], rating: 4.5, ratingCount: 98 },
    { name: 'Kavita Yadav', slug: 'kavita-yadav', designation: 'Nursing Admissions Counsellor', email: 'kavita.yadav@admissionsathi.org', experienceYears: 10, languages: ['English', 'Hindi'], specializations: ['Nursing admissions', 'Government nursing quotas'], categorySlugs: ['nursing'], qualifications: ['M.Sc Nursing'], rating: 4.6, ratingCount: 121 },
    { name: 'Devansh Mehta', slug: 'devansh-mehta', designation: 'Engineering Counselling Expert', email: 'devansh.mehta@admissionsathi.org', experienceYears: 12, languages: ['English', 'Hindi', 'Gujarati'], specializations: ['JoSAA & CSAB choice filling', 'Branch selection'], categorySlugs: ['engineering'], qualifications: ['B.Tech, M.Tech'], rating: 4.8, ratingCount: 267, featured: true },
    { name: 'Priya Sarkar', slug: 'priya-sarkar', designation: 'Career Psychologist', email: 'priya.sarkar@admissionsathi.org', experienceYears: 14, languages: ['English', 'Bengali', 'Hindi'], specializations: ['Aptitude assessment', 'Stream selection after Class 10'], categorySlugs: ['engineering', 'management', 'medical'], qualifications: ['M.Phil Psychology'], rating: 4.9, ratingCount: 302, featured: true },
    { name: 'Nitin Rathore', slug: 'nitin-rathore', designation: 'Study Abroad Advisor', email: 'nitin.rathore@admissionsathi.org', experienceYears: 9, languages: ['English', 'Hindi'], specializations: ['Overseas admissions', 'Visa documentation', 'Loan structuring'], categorySlugs: ['management', 'engineering'], qualifications: ['MBA (International Business)'], rating: 4.5, ratingCount: 143 },
];

export interface ArticleSeed {
    title: string;
    category: string;
    tags: string[];
    excerpt: string;
}

/** 50 demonstration articles across the content categories. */
export const ARTICLE_SEEDS: ArticleSeed[] = [
    { title: 'How to Choose the Right Engineering Branch After JEE Main', category: 'Admission Guidance', tags: ['engineering', 'jee-main', 'branch selection'], excerpt: 'A practical framework for picking a branch based on aptitude, placement trends and long-term career fit rather than peer pressure.' },
    { title: 'JoSAA Choice Filling: A Step-by-Step Strategy', category: 'Counselling', tags: ['josaa', 'engineering', 'counselling'], excerpt: 'Order your preferences the smart way, understand seat allotment rounds and avoid the most common choice-filling mistakes.' },
    { title: 'NEET UG Counselling Explained: AIQ vs State Quota', category: 'Counselling', tags: ['neet-ug', 'medical', 'counselling'], excerpt: 'How all-India and state quota rounds work, who is eligible for each, and how to plan your preference list.' },
    { title: 'MBBS Fee Structure in India: What to Budget For', category: 'Fees & Finance', tags: ['mbbs', 'fees'], excerpt: 'Tuition, hostel, mess and other recurring costs across government, private and deemed medical colleges.' },
    { title: 'Education Loan Without Collateral: What Banks Actually Look At', category: 'Fees & Finance', tags: ['education loan', 'finance'], excerpt: 'Co-applicant income, institute category and course type decide your collateral-free limit. Here is how to strengthen your file.' },
    { title: 'CAT Percentile vs Sectional Cut-offs: Reading the Fine Print', category: 'Exam Preparation', tags: ['cat', 'mba'], excerpt: 'Why an overall percentile alone does not guarantee a call, and how to plan sectional targets.' },
    { title: 'CLAT Preparation Plan for Working Aspirants', category: 'Exam Preparation', tags: ['clat', 'law'], excerpt: 'A 16-week study plan that fits around a job, with weekly targets for legal reasoning and current affairs.' },
    { title: 'B.Tech vs BCA: Which One Should You Pick?', category: 'Course Guidance', tags: ['b-tech', 'bca', 'comparison'], excerpt: 'Curriculum depth, entry requirements, cost and career outcomes compared side by side.' },
    { title: 'Nursing Career Pathways After B.Sc Nursing', category: 'Career Guidance', tags: ['nursing', 'career'], excerpt: 'Clinical, teaching, administration and overseas routes, plus the qualifications each one needs.' },
    { title: 'Understanding NAAC and NBA Accreditation', category: 'Admission Guidance', tags: ['accreditation', 'college selection'], excerpt: 'What accreditation grades really measure and how much weight they deserve in your shortlist.' },
    { title: 'How to Shortlist Colleges in 5 Steps', category: 'Admission Guidance', tags: ['college selection'], excerpt: 'Move from a list of 60 colleges to a realistic shortlist of 8 using rank, budget, location and placement filters.' },
    { title: 'Pharmacy Careers Beyond the Retail Counter', category: 'Career Guidance', tags: ['pharmacy', 'career'], excerpt: 'Regulatory affairs, clinical research, quality assurance and medical writing roles for pharmacy graduates.' },
    { title: 'CUET UG: Subject Combination Mistakes to Avoid', category: 'Exam Preparation', tags: ['cuet-ug'], excerpt: 'Picking domain subjects that do not match your target programme is the most common CUET error.' },
    { title: 'Documents Checklist for Engineering Counselling', category: 'Counselling', tags: ['documents', 'counselling'], excerpt: 'Keep these 14 documents ready before reporting for seat allotment to avoid last-minute rejections.' },
    { title: 'What Is a Good Score in GATE?', category: 'Exam Preparation', tags: ['gate'], excerpt: 'Interpreting GATE scores, marks and All India Rank across popular papers.' },
    { title: 'Placement Reports: How to Read Them Critically', category: 'Admission Guidance', tags: ['placements'], excerpt: 'Median vs average package, participation rate and the fine print that changes the picture entirely.' },
    { title: 'Government vs Private College: The Honest Comparison', category: 'Admission Guidance', tags: ['college selection'], excerpt: 'Fees, faculty stability, infrastructure and industry exposure compared without the marketing spin.' },
    { title: 'Scholarships You Can Still Apply For This Year', category: 'Scholarships', tags: ['scholarships'], excerpt: 'Merit, means and category-based scholarships with deadlines in the current admission cycle.' },
    { title: 'BPT vs B.Sc Nursing: Choosing an Allied Health Path', category: 'Course Guidance', tags: ['bpt', 'nursing'], excerpt: 'Course structure, licensing, work settings and salary progression for both paths.' },
    { title: 'MBA Specialisation Guide: Finance, Marketing or Analytics?', category: 'Course Guidance', tags: ['mba'], excerpt: 'Match your specialisation to your strengths and the roles you actually want to interview for.' },
    { title: 'How EMI Moratorium Works on Education Loans', category: 'Fees & Finance', tags: ['education loan'], excerpt: 'Interest accrues during the moratorium. Here is what that means for your total repayment.' },
    { title: 'Preparing for Counselling: Rank vs Percentile Explained', category: 'Counselling', tags: ['counselling', 'jee-main'], excerpt: 'Convert percentile to an approximate rank band and understand why the mapping shifts each year.' },
    { title: 'Hostel Life: Costs, Rules and What to Pack', category: 'Student Life', tags: ['hostel', 'student life'], excerpt: 'Practical budgeting and a packing list for first-year students moving to a new city.' },
    { title: 'Top Skills Recruiters Look for in Fresh Engineers', category: 'Career Guidance', tags: ['career', 'engineering'], excerpt: 'Beyond CGPA: projects, internships and communication decide most entry-level offers.' },
    { title: 'How to Write a Statement of Purpose That Works', category: 'Career Guidance', tags: ['sop', 'study abroad'], excerpt: 'Structure, tone and the specific evidence admissions committees expect to see.' },
    { title: 'Diploma to Degree: The Lateral Entry Route', category: 'Course Guidance', tags: ['diploma', 'lateral entry'], excerpt: 'Eligibility, entrance tests and credit transfer rules for lateral entry into the second year.' },
    { title: 'NEET PG Counselling Rounds: Timeline and Strategy', category: 'Counselling', tags: ['neet-pg'], excerpt: 'Plan mop-up and stray vacancy rounds without losing your security deposit.' },
    { title: 'Cost of Studying MBA Abroad vs India', category: 'Fees & Finance', tags: ['mba', 'study abroad'], excerpt: 'Tuition, living costs, loan servicing and return-on-investment compared over five years.' },
    { title: 'Best Study Techniques Backed by Research', category: 'Exam Preparation', tags: ['study tips'], excerpt: 'Spaced repetition, retrieval practice and interleaving, applied to entrance exam prep.' },
    { title: 'How to Verify a College Before Paying Fees', category: 'Admission Guidance', tags: ['college selection', 'safety'], excerpt: 'Approval status, affiliation, faculty count and student feedback checks that take under an hour.' },
    { title: 'Career Options After B.Com (Hons)', category: 'Career Guidance', tags: ['b-com', 'career'], excerpt: 'CA, CMA, banking, analytics and management routes with realistic timelines.' },
    { title: 'Managing Exam Stress: A Counsellor’s Guide', category: 'Student Life', tags: ['wellbeing'], excerpt: 'Sleep, structure and support systems matter more than extra study hours in the final month.' },
    { title: 'State Counselling Portals: How They Differ', category: 'Counselling', tags: ['state counselling'], excerpt: 'Registration windows, domicile rules and document verification vary widely between states.' },
    { title: 'Understanding Seat Matrix and Category Reservation', category: 'Counselling', tags: ['reservation', 'counselling'], excerpt: 'How the seat matrix is built and where your category actually competes.' },
    { title: 'Internships That Actually Improve Your Resume', category: 'Career Guidance', tags: ['internships'], excerpt: 'How to pick internships that build demonstrable skills instead of just a certificate.' },
    { title: 'Choosing Between Two Colleges: A Decision Matrix', category: 'Admission Guidance', tags: ['college selection'], excerpt: 'Score both options on eight weighted criteria to remove emotion from the final call.' },
    { title: 'Education Loan Tax Benefits Under Section 80E', category: 'Fees & Finance', tags: ['education loan', 'tax'], excerpt: 'Who can claim the interest deduction, for how long and what documents you need.' },
    { title: 'Preparing for Group Discussions and Personal Interviews', category: 'Exam Preparation', tags: ['gd-pi', 'mba'], excerpt: 'Structure your points, handle disagreement and answer the “why MBA” question convincingly.' },
    { title: 'Paramedical Courses in Demand This Decade', category: 'Course Guidance', tags: ['paramedical'], excerpt: 'Imaging technology, dialysis, OT technology and optometry roles with rising demand.' },
    { title: 'How to Use a College Predictor Correctly', category: 'Admission Guidance', tags: ['predictor'], excerpt: 'Predictors show probability bands from historical data — here is how to interpret and stress-test them.' },
    { title: 'Backup Plans: What If You Miss the Cut-off?', category: 'Admission Guidance', tags: ['counselling'], excerpt: 'Drop year, alternative course, private seat or lateral entry — weigh the trade-offs honestly.' },
    { title: 'Understanding Fee Refund Rules in Counselling', category: 'Fees & Finance', tags: ['fees', 'counselling'], excerpt: 'Withdrawal timelines decide how much of your deposit comes back.' },
    { title: 'Best Time to Start Entrance Exam Preparation', category: 'Exam Preparation', tags: ['study plan'], excerpt: 'Class 11 vs Class 12 vs drop year: realistic timelines for each entrance exam.' },
    { title: 'How Placement Cells Work Inside Colleges', category: 'Career Guidance', tags: ['placements'], excerpt: 'Pre-placement processes, eligibility filters and how to make the shortlist.' },
    { title: 'Law Career Options Beyond Litigation', category: 'Career Guidance', tags: ['law', 'career'], excerpt: 'In-house counsel, compliance, policy, arbitration and legal technology roles.' },
    { title: 'Comparing Two Education Loan Offers', category: 'Fees & Finance', tags: ['education loan'], excerpt: 'Look past the headline rate: reset frequency, processing fee and prepayment terms change the cost.' },
    { title: 'Study Plan for the Last 30 Days Before an Exam', category: 'Exam Preparation', tags: ['study plan'], excerpt: 'Revision blocks, mock test cadence and error logs for the final month.' },
    { title: 'What First-Year Students Wish They Knew', category: 'Student Life', tags: ['student life'], excerpt: 'Attendance rules, credit systems, clubs and time management lessons from seniors.' },
    { title: 'How to Evaluate an Online Degree Programme', category: 'Course Guidance', tags: ['online degree'], excerpt: 'Recognition, contact hours, assessment design and employer perception checkpoints.' },
    { title: 'Admission Calendar: Key Dates This Cycle', category: 'Admission Guidance', tags: ['calendar'], excerpt: 'A consolidated view of registration, exam, result and counselling windows for major entrance tests.' },
];

export interface NewsSeed {
    title: string;
    category: TrendingCategory;
    badge?: 'New' | 'Hot' | 'Live' | 'Update' | 'Closing Soon';
    priority: number;
    examSlug?: string;
    summary: string;
}

/** 30 demonstration trending updates. */
export const NEWS_SEEDS: NewsSeed[] = [
    { title: 'NEET UG Counselling: Registration Started', category: 'counselling', badge: 'New', priority: 10, examSlug: 'neet-ug', summary: 'Round 1 registration is open on the counselling portal. Keep documents and the security deposit ready.' },
    { title: 'JEE Advanced: Exam Date Announced', category: 'exam_date', badge: 'New', priority: 9, examSlug: 'jee-advanced', summary: 'The conducting IIT has released the examination schedule and paper timings.' },
    { title: 'CUET UG: Application Window Open', category: 'registration', badge: 'New', priority: 9, examSlug: 'cuet-ug', summary: 'Applications are live. Choose domain subjects that match your target programme.' },
    { title: 'Top Engineering Colleges: Updated Shortlists', category: 'college_notification', badge: 'Hot', priority: 8, summary: 'Updated shortlists by fee band, ranking and placement percentage across states.' },
    { title: 'JEE Main Session 2: Admit Card Released', category: 'admit_card', badge: 'Live', priority: 8, examSlug: 'jee-main', summary: 'Download the admit card using your application number and date of birth.' },
    { title: 'CAT Registration: Last Week to Apply', category: 'deadline', badge: 'Closing Soon', priority: 8, examSlug: 'cat', summary: 'The application window closes this week. Late applications are not accepted.' },
    { title: 'NEET PG: Result Declared', category: 'result', badge: 'Update', priority: 7, examSlug: 'neet-pg', summary: 'Scorecards are available on the official portal along with category-wise qualifying percentiles.' },
    { title: 'CLAT: Answer Key Objection Window Open', category: 'result', badge: 'Live', priority: 7, examSlug: 'clat', summary: 'Candidates can raise objections against the provisional answer key with supporting references.' },
    { title: 'State Engineering Counselling: Schedule Published', category: 'counselling', badge: 'New', priority: 7, summary: 'Registration, document verification and choice-filling dates announced for state quota seats.' },
    { title: 'GATE: Response Sheet Available', category: 'result', priority: 6, examSlug: 'gate', summary: 'Compare your responses with the provisional answer key before results are announced.' },
    { title: 'BITSAT: Session 1 Slot Booking Begins', category: 'registration', badge: 'New', priority: 6, examSlug: 'bitsat', summary: 'Slot booking is open on a first-come basis for registered candidates.' },
    { title: 'NEET UG: Category-wise Cut-off Trends', category: 'result', priority: 6, examSlug: 'neet-ug', summary: 'Historical closing scores by category to help you plan your preference list.' },
    { title: 'MBA Admissions: Second Round Deadlines', category: 'deadline', badge: 'Closing Soon', priority: 6, summary: 'Several business schools close second-round applications this month.' },
    { title: 'Scholarship Portal: Fresh Applications Open', category: 'registration', badge: 'New', priority: 5, summary: 'Post-matric and merit scholarship applications are accepted for the current academic year.' },
    { title: 'AILET: Exam City Intimation Slip Out', category: 'admit_card', priority: 5, examSlug: 'ailet', summary: 'Check your allotted exam city before the admit card release.' },
    { title: 'Nursing Admissions: Counselling Registration Live', category: 'counselling', badge: 'New', priority: 5, summary: 'State nursing counselling registration has started for B.Sc Nursing and GNM seats.' },
    { title: 'NIMCET: Application Correction Window', category: 'registration', priority: 4, examSlug: 'nimcet', summary: 'Edit limited fields in your submitted application during the correction window.' },
    { title: 'GPAT: Syllabus and Pattern Update', category: 'exam_date', priority: 4, examSlug: 'gpat', summary: 'Revised section weightage announced for the upcoming cycle.' },
    { title: 'INI CET: Registration Schedule Released', category: 'registration', priority: 4, examSlug: 'ini-cet', summary: 'Registration, admit card and exam dates published by the conducting institute.' },
    { title: 'Engineering Seat Matrix Published', category: 'counselling', priority: 4, summary: 'Institute and branch-wise seat matrix released ahead of choice filling.' },
    { title: 'XAT: Mock Test Link Activated', category: 'exam_date', priority: 3, examSlug: 'xat', summary: 'Official mock test is available to help you get used to the interface.' },
    { title: 'MAT: Additional Test Cycle Announced', category: 'exam_date', priority: 3, examSlug: 'mat', summary: 'An extra test cycle has been added for this admission season.' },
    { title: 'Medical Colleges: Fee Regulation Notice', category: 'college_notification', priority: 3, summary: 'State fee regulatory committee has published revised fee slabs for private colleges.' },
    { title: 'Law Colleges: New Seat Intake Approved', category: 'college_notification', priority: 3, summary: 'Additional seats approved in select law programmes for the coming session.' },
    { title: 'Education Loan Interest: Revised Rate Slabs', category: 'college_notification', priority: 2, summary: 'Several lenders have revised education loan interest slabs this quarter.' },
    { title: 'Pharmacy Council: Institute Approval List', category: 'college_notification', priority: 2, summary: 'Updated list of approved pharmacy institutes for the current academic year.' },
    { title: 'CUET PG: Result Date Announced', category: 'result', priority: 2, summary: 'Result declaration date published along with the counselling timeline.' },
    { title: 'Diploma Admissions: Merit List Out', category: 'result', priority: 2, summary: 'State polytechnic merit list is available for download.' },
    { title: 'Hostel Fee Revision at Select Universities', category: 'college_notification', priority: 1, summary: 'Revised hostel and mess charges notified for the upcoming semester.' },
    { title: 'Admission Helpline: Extended Support Hours', category: 'college_notification', priority: 1, summary: 'Counselling helpline is available for extended hours during peak admission weeks.' },
];
