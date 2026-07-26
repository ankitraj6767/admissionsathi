import type { CourseLevel, StudyMode, ThemeColor } from '@/config/constants';

export interface CategorySeed {
    name: string;
    slug: string;
    shortName: string;
    subtitle: string;
    icon: string;
    themeColor: ThemeColor;
    description: string;
    displayOrder: number;
}

/** The eight homepage course categories. */
export const CATEGORY_SEEDS: CategorySeed[] = [
    {
        name: 'Engineering',
        slug: 'engineering',
        shortName: 'Engg',
        subtitle: 'B.Tech, M.Tech & More',
        icon: 'Cog',
        themeColor: 'blue',
        description:
            'Engineering programmes across computer science, mechanical, civil, electrical and emerging specialisations such as AI and data science.',
        displayOrder: 1,
    },
    {
        name: 'Medical (MBBS)',
        slug: 'medical',
        shortName: 'Medical',
        subtitle: 'NEET UG, PG & More',
        icon: 'Stethoscope',
        themeColor: 'teal',
        description:
            'Undergraduate and postgraduate medical programmes including MBBS, BDS, BAMS, BHMS and clinical PG specialisations.',
        displayOrder: 2,
    },
    {
        name: 'Management',
        slug: 'management',
        shortName: 'Management',
        subtitle: 'MBA, BBA & More',
        icon: 'Briefcase',
        themeColor: 'purple',
        description:
            'Business and management education from BBA to MBA and PGDM, with specialisations in finance, marketing, HR and analytics.',
        displayOrder: 3,
    },
    {
        name: 'BCA / IT',
        slug: 'bca-it',
        shortName: 'IT',
        subtitle: 'BCA, MCA & More',
        icon: 'Code2',
        themeColor: 'orange',
        description:
            'Computer applications and information technology degrees focused on software development, cloud and data engineering.',
        displayOrder: 4,
    },
    {
        name: 'Pharmacy',
        slug: 'pharmacy',
        shortName: 'Pharmacy',
        subtitle: 'B.Pharma & More',
        icon: 'Pill',
        themeColor: 'green',
        description:
            'Pharmacy programmes covering pharmaceutics, pharmacology, quality assurance and clinical research.',
        displayOrder: 5,
    },
    {
        name: 'Law',
        slug: 'law',
        shortName: 'Law',
        subtitle: 'LLB, BA LLB & More',
        icon: 'Scale',
        themeColor: 'navy',
        description:
            'Integrated and three-year law programmes preparing students for litigation, corporate practice and judicial services.',
        displayOrder: 6,
    },
    {
        name: 'Nursing',
        slug: 'nursing',
        shortName: 'Nursing',
        subtitle: 'B.Sc Nursing & More',
        icon: 'HeartPulse',
        themeColor: 'pink',
        description:
            'Nursing education from GNM and B.Sc Nursing to post-basic and M.Sc Nursing specialisations.',
        displayOrder: 7,
    },
    {
        name: 'Paramedical',
        slug: 'paramedical',
        shortName: 'Paramedical',
        subtitle: 'BPT, MLT & More',
        icon: 'Activity',
        themeColor: 'blue',
        description:
            'Allied health science programmes such as physiotherapy, medical lab technology, radiology and optometry.',
        displayOrder: 8,
    },
];

export interface CourseSeed {
    name: string;
    slug: string;
    shortName?: string;
    categorySlug: string;
    level: CourseLevel;
    durationMonths: number;
    durationLabel: string;
    studyModes: StudyMode[];
    feeMin: number;
    feeMax: number;
    salaryMin: number;
    salaryMax: number;
    examShortNames: string[];
    specializations: string[];
    jobRoles: string[];
    skills: string[];
    recruiters: string[];
    featured?: boolean;
    icon?: string;
}

/** 40 demonstration courses spread across the eight categories. */
export const COURSE_SEEDS: CourseSeed[] = [
    // ---------------- Engineering ----------------
    { name: 'Bachelor of Technology (B.Tech)', slug: 'b-tech', shortName: 'B.Tech', categorySlug: 'engineering', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 90000, feeMax: 450000, salaryMin: 400000, salaryMax: 1800000, examShortNames: ['JEE Main', 'JEE Advanced', 'BITSAT'], specializations: ['Computer Science & Engineering', 'Information Technology', 'Mechanical Engineering', 'Civil Engineering', 'Electronics & Communication', 'Artificial Intelligence & Data Science'], jobRoles: ['Software Engineer', 'Design Engineer', 'Data Analyst', 'Site Engineer'], skills: ['Problem solving', 'Programming', 'CAD', 'Systems thinking'], recruiters: ['Infosys', 'TCS', 'L&T', 'Bosch'], featured: true, icon: 'Cog' },
    { name: 'Master of Technology (M.Tech)', slug: 'm-tech', shortName: 'M.Tech', categorySlug: 'engineering', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time', 'Part Time'], feeMin: 60000, feeMax: 300000, salaryMin: 600000, salaryMax: 2200000, examShortNames: ['GATE'], specializations: ['Structural Engineering', 'VLSI Design', 'Thermal Engineering', 'Data Science'], jobRoles: ['Research Engineer', 'Specialist Engineer', 'Assistant Professor'], skills: ['Research', 'Simulation', 'Advanced mathematics'], recruiters: ['ISRO', 'DRDO', 'Siemens'], featured: true },
    { name: 'Diploma in Engineering (Polytechnic)', slug: 'diploma-engineering', categorySlug: 'engineering', level: 'Diploma', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 25000, feeMax: 120000, salaryMin: 180000, salaryMax: 450000, examShortNames: [], specializations: ['Mechanical', 'Civil', 'Electrical', 'Computer'], jobRoles: ['Junior Engineer', 'Technician', 'Supervisor'], skills: ['Workshop practice', 'Drafting'], recruiters: ['Public works departments', 'Manufacturing firms'] },
    { name: 'B.Tech Computer Science & Engineering', slug: 'b-tech-cse', categorySlug: 'engineering', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 120000, feeMax: 600000, salaryMin: 500000, salaryMax: 2400000, examShortNames: ['JEE Main', 'JEE Advanced'], specializations: ['Software Engineering', 'Cyber Security', 'Cloud Computing'], jobRoles: ['Software Developer', 'SDE', 'Cloud Engineer'], skills: ['DSA', 'System design', 'Databases'], recruiters: ['Amazon', 'Microsoft', 'Zoho'], featured: true, icon: 'Code2' },
    { name: 'B.Tech Artificial Intelligence & Data Science', slug: 'b-tech-ai-ds', categorySlug: 'engineering', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 140000, feeMax: 620000, salaryMin: 550000, salaryMax: 2600000, examShortNames: ['JEE Main'], specializations: ['Machine Learning', 'Computer Vision', 'MLOps'], jobRoles: ['ML Engineer', 'Data Scientist'], skills: ['Python', 'Statistics', 'Deep learning'], recruiters: ['Analytics firms', 'Product companies'] },
    { name: 'B.E. Mechanical Engineering', slug: 'be-mechanical', categorySlug: 'engineering', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 80000, feeMax: 380000, salaryMin: 350000, salaryMax: 1200000, examShortNames: ['JEE Main'], specializations: ['Automobile', 'Robotics', 'Manufacturing'], jobRoles: ['Design Engineer', 'Production Engineer'], skills: ['Thermodynamics', 'CAD/CAM'], recruiters: ['Tata Motors', 'Mahindra'] },
    { name: 'B.Sc Computer Science', slug: 'b-sc-computer-science', categorySlug: 'engineering', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time', 'Online'], feeMin: 40000, feeMax: 220000, salaryMin: 300000, salaryMax: 900000, examShortNames: ['CUET UG'], specializations: ['Programming', 'Data Analytics'], jobRoles: ['Junior Developer', 'QA Analyst'], skills: ['Coding', 'Testing'], recruiters: ['IT services firms'] },

    // ---------------- Medical ----------------
    { name: 'MBBS', slug: 'mbbs', categorySlug: 'medical', level: 'Undergraduate', durationMonths: 66, durationLabel: '5.5 Years', studyModes: ['Full Time'], feeMin: 150000, feeMax: 2500000, salaryMin: 600000, salaryMax: 2400000, examShortNames: ['NEET UG'], specializations: ['General Medicine', 'Surgery', 'Paediatrics'], jobRoles: ['Resident Doctor', 'Medical Officer'], skills: ['Clinical reasoning', 'Patient care'], recruiters: ['Government hospitals', 'Private hospital chains'], featured: true, icon: 'Stethoscope' },
    { name: 'MD / MS (PG Medical)', slug: 'md-ms', categorySlug: 'medical', level: 'Postgraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 200000, feeMax: 3000000, salaryMin: 1200000, salaryMax: 4000000, examShortNames: ['NEET PG', 'INI CET'], specializations: ['Radiology', 'Orthopaedics', 'Anaesthesiology'], jobRoles: ['Specialist Consultant', 'Senior Resident'], skills: ['Specialised diagnosis'], recruiters: ['Tertiary care hospitals'], featured: true },
    { name: 'Bachelor of Dental Surgery (BDS)', slug: 'bds', categorySlug: 'medical', level: 'Undergraduate', durationMonths: 60, durationLabel: '5 Years', studyModes: ['Full Time'], feeMin: 180000, feeMax: 1200000, salaryMin: 400000, salaryMax: 1200000, examShortNames: ['NEET UG'], specializations: ['Orthodontics', 'Periodontics'], jobRoles: ['Dental Surgeon'], skills: ['Oral surgery'], recruiters: ['Dental clinics'] },
    { name: 'BAMS (Ayurveda)', slug: 'bams', categorySlug: 'medical', level: 'Undergraduate', durationMonths: 66, durationLabel: '5.5 Years', studyModes: ['Full Time'], feeMin: 150000, feeMax: 900000, salaryMin: 350000, salaryMax: 900000, examShortNames: ['NEET UG'], specializations: ['Panchakarma', 'Kayachikitsa'], jobRoles: ['Ayurvedic Physician'], skills: ['Ayurvedic diagnosis'], recruiters: ['Ayurveda hospitals'] },
    { name: 'BHMS (Homoeopathy)', slug: 'bhms', categorySlug: 'medical', level: 'Undergraduate', durationMonths: 66, durationLabel: '5.5 Years', studyModes: ['Full Time'], feeMin: 140000, feeMax: 800000, salaryMin: 300000, salaryMax: 800000, examShortNames: ['NEET UG'], specializations: ['Materia Medica'], jobRoles: ['Homoeopathic Physician'], skills: ['Case taking'], recruiters: ['Clinics'] },

    // ---------------- Management ----------------
    { name: 'Master of Business Administration (MBA)', slug: 'mba', categorySlug: 'management', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time', 'Part Time', 'Online'], feeMin: 200000, feeMax: 2800000, salaryMin: 700000, salaryMax: 3400000, examShortNames: ['CAT', 'XAT', 'MAT', 'CMAT'], specializations: ['Finance', 'Marketing', 'Human Resources', 'Business Analytics', 'Operations'], jobRoles: ['Business Analyst', 'Product Manager', 'Consultant'], skills: ['Strategy', 'Financial modelling', 'Leadership'], recruiters: ['Deloitte', 'HDFC Bank', 'Flipkart'], featured: true, icon: 'Briefcase' },
    { name: 'Bachelor of Business Administration (BBA)', slug: 'bba', categorySlug: 'management', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time', 'Online'], feeMin: 90000, feeMax: 700000, salaryMin: 300000, salaryMax: 900000, examShortNames: ['CUET UG', 'IPMAT'], specializations: ['International Business', 'Digital Marketing'], jobRoles: ['Management Trainee', 'Sales Executive'], skills: ['Communication', 'Business basics'], recruiters: ['Retail chains', 'Startups'], featured: true },
    { name: 'PGDM', slug: 'pgdm', categorySlug: 'management', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time'], feeMin: 400000, feeMax: 2200000, salaryMin: 800000, salaryMax: 2600000, examShortNames: ['CAT', 'XAT'], specializations: ['Finance', 'Marketing'], jobRoles: ['Consultant', 'Analyst'], skills: ['Case analysis'], recruiters: ['Consulting firms'] },
    { name: 'Executive MBA', slug: 'executive-mba', categorySlug: 'management', level: 'Postgraduate', durationMonths: 15, durationLabel: '15 Months', studyModes: ['Part Time', 'Hybrid'], feeMin: 500000, feeMax: 3000000, salaryMin: 1500000, salaryMax: 4000000, examShortNames: ['CAT'], specializations: ['General Management'], jobRoles: ['Senior Manager'], skills: ['Leadership'], recruiters: ['Corporates'] },
    { name: 'B.Com (Hons)', slug: 'b-com-hons', categorySlug: 'management', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time', 'Distance'], feeMin: 30000, feeMax: 300000, salaryMin: 250000, salaryMax: 800000, examShortNames: ['CUET UG'], specializations: ['Accounting', 'Taxation'], jobRoles: ['Accountant', 'Audit Assistant'], skills: ['Bookkeeping', 'Tally'], recruiters: ['CA firms'] },
    { name: 'Master of Commerce (M.Com)', slug: 'm-com', categorySlug: 'management', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time', 'Distance'], feeMin: 30000, feeMax: 220000, salaryMin: 300000, salaryMax: 800000, examShortNames: ['CUET PG'], specializations: ['Finance', 'Banking'], jobRoles: ['Finance Executive'], skills: ['Financial accounting'], recruiters: ['Banks'] },
    { name: 'Bachelor of Hotel Management (BHM)', slug: 'bhm', categorySlug: 'management', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 120000, feeMax: 600000, salaryMin: 280000, salaryMax: 750000, examShortNames: ['NCHMCT JEE'], specializations: ['Culinary Arts', 'Front Office'], jobRoles: ['Hotel Executive', 'Chef'], skills: ['Hospitality service'], recruiters: ['Hotel groups'] },

    // ---------------- BCA / IT ----------------
    { name: 'Bachelor of Computer Applications (BCA)', slug: 'bca', categorySlug: 'bca-it', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time', 'Online'], feeMin: 60000, feeMax: 400000, salaryMin: 300000, salaryMax: 1000000, examShortNames: ['CUET UG'], specializations: ['Software Development', 'Data Science', 'Cloud Computing'], jobRoles: ['Software Developer', 'Support Engineer'], skills: ['Java', 'DBMS', 'Web development'], recruiters: ['IT services firms', 'Product startups'], featured: true, icon: 'Code2' },
    { name: 'Master of Computer Applications (MCA)', slug: 'mca', categorySlug: 'bca-it', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time', 'Online'], feeMin: 80000, feeMax: 400000, salaryMin: 450000, salaryMax: 1400000, examShortNames: ['NIMCET', 'CUET PG'], specializations: ['Full Stack Development', 'Cyber Security'], jobRoles: ['Software Engineer', 'System Analyst'], skills: ['Advanced programming'], recruiters: ['Enterprise IT'], featured: true },
    { name: 'B.Sc Information Technology', slug: 'b-sc-it', categorySlug: 'bca-it', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 45000, feeMax: 250000, salaryMin: 280000, salaryMax: 850000, examShortNames: [], specializations: ['Networking', 'Web Technologies'], jobRoles: ['IT Support', 'Web Developer'], skills: ['Networking basics'], recruiters: ['MSPs'] },
    { name: 'B.Sc Data Science', slug: 'b-sc-data-science', categorySlug: 'bca-it', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 90000, feeMax: 420000, salaryMin: 400000, salaryMax: 1200000, examShortNames: ['CUET UG'], specializations: ['Analytics', 'Visualisation'], jobRoles: ['Data Analyst'], skills: ['SQL', 'Python'], recruiters: ['Analytics firms'] },
    { name: 'PG Diploma in Cyber Security', slug: 'pgd-cyber-security', categorySlug: 'bca-it', level: 'Diploma', durationMonths: 12, durationLabel: '1 Year', studyModes: ['Online', 'Hybrid'], feeMin: 70000, feeMax: 300000, salaryMin: 500000, salaryMax: 1600000, examShortNames: [], specializations: ['SOC Operations', 'Ethical Hacking'], jobRoles: ['Security Analyst'], skills: ['Threat analysis'], recruiters: ['Security firms'] },

    // ---------------- Pharmacy ----------------
    { name: 'Bachelor of Pharmacy (B.Pharm)', slug: 'b-pharma', categorySlug: 'pharmacy', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 80000, feeMax: 500000, salaryMin: 280000, salaryMax: 900000, examShortNames: ['NEET UG', 'CUET UG'], specializations: ['Pharmaceutics', 'Pharmacology', 'Pharmaceutical Chemistry'], jobRoles: ['Pharmacist', 'Production Officer', 'Medical Representative'], skills: ['Formulation', 'Quality control'], recruiters: ['Pharma manufacturers', 'Hospital pharmacies'], featured: true, icon: 'Pill' },
    { name: 'Master of Pharmacy (M.Pharm)', slug: 'm-pharma', categorySlug: 'pharmacy', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time'], feeMin: 100000, feeMax: 450000, salaryMin: 400000, salaryMax: 1200000, examShortNames: ['GPAT'], specializations: ['Pharmaceutical Analysis', 'Pharmacy Practice'], jobRoles: ['Research Associate', 'QA Officer'], skills: ['Analytical instrumentation'], recruiters: ['CROs'] },
    { name: 'Diploma in Pharmacy (D.Pharm)', slug: 'd-pharma', categorySlug: 'pharmacy', level: 'Diploma', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time'], feeMin: 40000, feeMax: 180000, salaryMin: 180000, salaryMax: 400000, examShortNames: [], specializations: ['Community Pharmacy'], jobRoles: ['Retail Pharmacist'], skills: ['Dispensing'], recruiters: ['Pharmacy chains'] },
    { name: 'Pharm.D', slug: 'pharm-d', categorySlug: 'pharmacy', level: 'Doctorate', durationMonths: 72, durationLabel: '6 Years', studyModes: ['Full Time'], feeMin: 200000, feeMax: 900000, salaryMin: 500000, salaryMax: 1400000, examShortNames: ['NEET UG'], specializations: ['Clinical Pharmacy'], jobRoles: ['Clinical Pharmacist'], skills: ['Pharmacotherapy'], recruiters: ['Hospitals'] },

    // ---------------- Law ----------------
    { name: 'Bachelor of Legislative Law (LLB)', slug: 'llb', categorySlug: 'law', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 60000, feeMax: 600000, salaryMin: 300000, salaryMax: 1200000, examShortNames: ['CLAT', 'AILET'], specializations: ['Criminal Law', 'Corporate Law', 'Constitutional Law'], jobRoles: ['Advocate', 'Legal Associate'], skills: ['Legal research', 'Drafting'], recruiters: ['Law firms', 'Corporate legal teams'], featured: true, icon: 'Scale' },
    { name: 'BA LLB (Hons)', slug: 'ba-llb', categorySlug: 'law', level: 'Integrated', durationMonths: 60, durationLabel: '5 Years', studyModes: ['Full Time'], feeMin: 150000, feeMax: 1400000, salaryMin: 500000, salaryMax: 1800000, examShortNames: ['CLAT', 'AILET', 'LSAT India'], specializations: ['Corporate Law', 'IPR', 'International Law'], jobRoles: ['Corporate Lawyer', 'Litigator'], skills: ['Advocacy', 'Contract drafting'], recruiters: ['Tier-1 law firms'], featured: true },
    { name: 'LLM', slug: 'llm', categorySlug: 'law', level: 'Postgraduate', durationMonths: 12, durationLabel: '1 Year', studyModes: ['Full Time', 'Online'], feeMin: 80000, feeMax: 500000, salaryMin: 500000, salaryMax: 1600000, examShortNames: ['CLAT PG'], specializations: ['Business Law', 'Human Rights'], jobRoles: ['Legal Researcher', 'Academic'], skills: ['Comparative law'], recruiters: ['Universities', 'Policy think tanks'] },
    { name: 'BBA LLB', slug: 'bba-llb', categorySlug: 'law', level: 'Integrated', durationMonths: 60, durationLabel: '5 Years', studyModes: ['Full Time'], feeMin: 160000, feeMax: 1300000, salaryMin: 450000, salaryMax: 1600000, examShortNames: ['CLAT'], specializations: ['Corporate Law'], jobRoles: ['Compliance Analyst'], skills: ['Business law'], recruiters: ['Consulting firms'] },

    // ---------------- Nursing ----------------
    { name: 'B.Sc Nursing', slug: 'b-sc-nursing', categorySlug: 'nursing', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 80000, feeMax: 700000, salaryMin: 300000, salaryMax: 800000, examShortNames: ['NEET UG'], specializations: ['Critical Care', 'Paediatric Nursing', 'Community Health'], jobRoles: ['Staff Nurse', 'Nursing Officer'], skills: ['Patient monitoring', 'Emergency care'], recruiters: ['Hospitals', 'Government health services'], featured: true, icon: 'HeartPulse' },
    { name: 'GNM (General Nursing & Midwifery)', slug: 'gnm', categorySlug: 'nursing', level: 'Diploma', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 40000, feeMax: 250000, salaryMin: 200000, salaryMax: 480000, examShortNames: [], specializations: ['Midwifery'], jobRoles: ['Nurse', 'Midwife'], skills: ['Bedside care'], recruiters: ['Nursing homes'] },
    { name: 'Post Basic B.Sc Nursing', slug: 'post-basic-b-sc-nursing', categorySlug: 'nursing', level: 'Undergraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time', 'Distance'], feeMin: 50000, feeMax: 300000, salaryMin: 300000, salaryMax: 700000, examShortNames: [], specializations: ['Nursing Administration'], jobRoles: ['Senior Nurse'], skills: ['Ward management'], recruiters: ['Hospitals'] },
    { name: 'M.Sc Nursing', slug: 'm-sc-nursing', categorySlug: 'nursing', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time'], feeMin: 90000, feeMax: 500000, salaryMin: 450000, salaryMax: 1100000, examShortNames: [], specializations: ['Medical Surgical Nursing', 'Psychiatric Nursing'], jobRoles: ['Nursing Tutor', 'Nurse Practitioner'], skills: ['Clinical teaching'], recruiters: ['Nursing colleges'] },

    // ---------------- Paramedical ----------------
    { name: 'Bachelor of Physiotherapy (BPT)', slug: 'bpt', categorySlug: 'paramedical', level: 'Undergraduate', durationMonths: 54, durationLabel: '4.5 Years', studyModes: ['Full Time'], feeMin: 90000, feeMax: 600000, salaryMin: 280000, salaryMax: 900000, examShortNames: ['NEET UG', 'CUET UG'], specializations: ['Sports Physiotherapy', 'Neuro Physiotherapy', 'Orthopaedic Physiotherapy'], jobRoles: ['Physiotherapist', 'Rehab Specialist'], skills: ['Manual therapy', 'Exercise prescription'], recruiters: ['Rehab centres', 'Sports academies'], featured: true, icon: 'Activity' },
    { name: 'B.Sc Medical Lab Technology (MLT)', slug: 'b-sc-mlt', categorySlug: 'paramedical', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 60000, feeMax: 350000, salaryMin: 240000, salaryMax: 700000, examShortNames: [], specializations: ['Microbiology', 'Biochemistry'], jobRoles: ['Lab Technologist'], skills: ['Sample analysis'], recruiters: ['Diagnostic labs'] },
    { name: 'B.Sc Radiology & Imaging Technology', slug: 'b-sc-radiology', categorySlug: 'paramedical', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 70000, feeMax: 400000, salaryMin: 260000, salaryMax: 800000, examShortNames: [], specializations: ['CT & MRI', 'Ultrasound'], jobRoles: ['Radiology Technologist'], skills: ['Imaging protocols'], recruiters: ['Imaging centres'] },
    { name: 'B.Optometry', slug: 'b-optometry', categorySlug: 'paramedical', level: 'Undergraduate', durationMonths: 48, durationLabel: '4 Years', studyModes: ['Full Time'], feeMin: 70000, feeMax: 420000, salaryMin: 260000, salaryMax: 750000, examShortNames: [], specializations: ['Contact Lens', 'Low Vision'], jobRoles: ['Optometrist'], skills: ['Refraction'], recruiters: ['Eye hospitals'] },
    { name: 'B.Sc Operation Theatre Technology', slug: 'b-sc-ott', categorySlug: 'paramedical', level: 'Undergraduate', durationMonths: 36, durationLabel: '3 Years', studyModes: ['Full Time'], feeMin: 60000, feeMax: 320000, salaryMin: 240000, salaryMax: 650000, examShortNames: [], specializations: ['Anaesthesia Technology'], jobRoles: ['OT Technician'], skills: ['Sterile technique'], recruiters: ['Hospitals'] },
    { name: 'Master of Physiotherapy (MPT)', slug: 'mpt', categorySlug: 'paramedical', level: 'Postgraduate', durationMonths: 24, durationLabel: '2 Years', studyModes: ['Full Time'], feeMin: 110000, feeMax: 500000, salaryMin: 420000, salaryMax: 1100000, examShortNames: [], specializations: ['Sports', 'Neurology'], jobRoles: ['Senior Physiotherapist'], skills: ['Advanced rehab'], recruiters: ['Specialist clinics'] },
];
