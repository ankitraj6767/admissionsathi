/* eslint-disable no-console */
import { Types } from 'mongoose';
import { slugify, hashString } from '@/lib/utils';
import { DEMO_DATA_NOTICE } from '@/config/constants';
import { Course, CourseCategory, Specialization } from '@/db/models/course.model';
import { Exam, ExamDate } from '@/db/models/exam.model';
import { College, CollegeCourse, Ranking } from '@/db/models/college.model';
import { CATEGORY_SEEDS, COURSE_SEEDS } from './data/course.data';
import { EXAM_DATE_EVENTS, EXAM_SEEDS, SEED_EXAM_YEAR } from './data/exam.data';
import { COLLEGE_SEEDS } from './data/college.data';
import { log, type SeedContext } from './seed-core';

function monthsFromNow(offset: number, day = 12): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + offset, day);
    date.setHours(10, 0, 0, 0);
    return date;
}

function html(paragraphs: string[]): string {
    return paragraphs.map((p) => (p.startsWith('<') ? p : `<p>${p}</p>`)).join('');
}

/* ----------------------------- categories -------------------------------- */

export async function seedCategories(adminId: Types.ObjectId) {
    const categoryIdBySlug = new Map<string, { id: Types.ObjectId; name: string }>();

    for (const seed of CATEGORY_SEEDS) {
        const doc = await CourseCategory.findOneAndUpdate(
            { slug: seed.slug },
            {
                $set: {
                    name: seed.name,
                    shortName: seed.shortName,
                    subtitle: seed.subtitle,
                    icon: seed.icon,
                    themeColor: seed.themeColor,
                    description: seed.description,
                    isFeatured: true,
                    displayOrder: seed.displayOrder,
                    status: 'active',
                    createdBy: adminId,
                    seo: {
                        title: `${seed.name} Courses — Colleges, Fees & Admission`,
                        description: seed.description,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();
        categoryIdBySlug.set(seed.slug, { id: doc!._id, name: seed.name });
    }

    log(`Seeded ${CATEGORY_SEEDS.length} course categories`);
    return categoryIdBySlug;
}

/* -------------------------------- exams ---------------------------------- */

export async function seedExams(
    adminId: Types.ObjectId,
    categoryIdBySlug: SeedContext['categoryIdBySlug'],
) {
    const examIdBySlug = new Map<string, { id: Types.ObjectId; shortName: string; name: string }>();
    let dateCount = 0;
    let order = 0;

    for (const seed of EXAM_SEEDS) {
        order += 10;
        const offsets = seed.monthOffsets;

        const exam = await Exam.findOneAndUpdate(
            { slug: seed.slug },
            {
                $set: {
                    name: seed.name,
                    shortName: seed.shortName,
                    conductingBody: seed.conductingBody,
                    level: seed.level,
                    category: seed.category,
                    mode: seed.mode,
                    frequencyPerYear: seed.shortName === 'JEE Main' ? 2 : 1,
                    applicationFee: {
                        general: seed.feeGeneral,
                        reserved: seed.feeReserved,
                        note: 'Indicative demonstration fee. Confirm on the official portal.',
                    },
                    officialWebsite: 'https://example.org',
                    examYear: SEED_EXAM_YEAR,
                    registrationStart: monthsFromNow(offsets.registrationStart, 5),
                    registrationEnd: monthsFromNow(offsets.registrationEnd, 25),
                    examDateFrom: monthsFromNow(offsets.exam, 10),
                    examDateTo: monthsFromNow(offsets.exam, 14),
                    admitCardDate: monthsFromNow(offsets.exam, 1),
                    resultDate: monthsFromNow(offsets.result, 8),
                    counsellingStart: monthsFromNow(offsets.result + 1, 5),
                    predictorEnabled: Boolean(seed.predictor),
                    isFeatured: seed.featured ?? false,
                    displayOrder: order,
                    relatedCategories: seed.categorySlugs
                        .map((slug) => categoryIdBySlug.get(slug)?.id)
                        .filter(Boolean),
                    overviewHtml: html([
                        `${seed.name} (${seed.shortName}) is conducted by ${seed.conductingBody} for admission to ${seed.category.toLowerCase()} programmes across India.`,
                        `This page collects the exam pattern, eligibility, important dates, syllabus outline and counselling process in one place. ${DEMO_DATA_NOTICE}`,
                    ]),
                    eligibilityHtml: html([
                        'Candidates must have passed the qualifying examination from a recognised board with the minimum aggregate prescribed in the official information bulletin.',
                        '<ul><li>Age limit as specified by the conducting body</li><li>Subject combination requirements for the target programme</li><li>Number of permitted attempts, where applicable</li></ul>',
                    ]),
                    applicationProcessHtml: html([
                        '<ol><li>Register with a valid email address and mobile number</li><li>Complete the application form and upload documents</li><li>Pay the application fee online</li><li>Download the confirmation page</li></ol>',
                    ]),
                    patternHtml: html([
                        'The paper is delivered in the mode(s) listed above. Section-wise weightage, marking scheme and negative marking are published in the official bulletin each cycle.',
                    ]),
                    syllabusHtml: html([
                        'The syllabus follows the prescribed board curriculum for the qualifying classes. Download the topic-wise breakdown from the resources section.',
                    ]),
                    preparationTipsHtml: html([
                        'Build a weekly plan, attempt full-length mocks under timed conditions and maintain an error log for every mock you review.',
                    ]),
                    admitCardHtml: html(['Admit cards are released a few days before the exam on the official portal.']),
                    resultHtml: html(['Results are published with scores, percentile and category-wise qualifying marks.']),
                    cutoffHtml: html([
                        'Closing scores vary each year with the number of candidates and seat availability. Use the predictor for an estimate band.',
                    ]),
                    counsellingHtml: html([
                        'Counselling is conducted in multiple rounds with choice filling, seat allotment, document verification and reporting.',
                    ]),
                    faqs: [
                        {
                            question: `Who conducts ${seed.shortName}?`,
                            answer: `${seed.shortName} is conducted by ${seed.conductingBody}.`,
                            order: 1,
                        },
                        {
                            question: `Is there negative marking in ${seed.shortName}?`,
                            answer:
                                'The marking scheme is published in the official information bulletin for each cycle. Check the exam pattern tab for the current scheme.',
                            order: 2,
                        },
                        {
                            question: `Can Admission Sathi help with ${seed.shortName} counselling?`,
                            answer:
                                'Yes. Book a free counselling session and our counsellors will help you with choice filling and document preparation.',
                            order: 3,
                        },
                    ],
                    status: 'published',
                    publishedAt: new Date(),
                    createdBy: adminId,
                    seo: {
                        title: `${seed.shortName} ${SEED_EXAM_YEAR} — Dates, Eligibility, Pattern & Result`,
                        description: `${seed.shortName} ${SEED_EXAM_YEAR} exam dates, eligibility, application process, syllabus, pattern, cut-off trends and counselling details.`,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();

        examIdBySlug.set(seed.slug, { id: exam!._id, shortName: seed.shortName, name: seed.name });

        await ExamDate.deleteMany({ exam: exam!._id });
        const dateMap: Record<string, number> = {
            registrationStart: offsets.registrationStart,
            registrationEnd: offsets.registrationEnd,
            correction: offsets.registrationEnd,
            admitCard: offsets.exam,
            exam: offsets.exam,
            answerKey: offsets.exam,
            result: offsets.result,
            counselling: offsets.result + 1,
        };

        let dateOrder = 0;
        for (const event of EXAM_DATE_EVENTS) {
            dateOrder += 10;
            await ExamDate.create({
                exam: exam!._id,
                examShortName: seed.shortName,
                examYear: SEED_EXAM_YEAR,
                event: event.event,
                startDate: monthsFromNow(dateMap[event.key] ?? 0, 8 + dateOrder / 10),
                isTentative: dateMap[event.key] > 3,
                isKeyDate: event.isKeyDate,
                displayOrder: dateOrder,
                status: 'active',
                createdBy: adminId,
            });
            dateCount += 1;
        }
    }

    log(`Seeded ${EXAM_SEEDS.length} exams and ${dateCount} exam dates`);
    return examIdBySlug;
}

/* ------------------------------- courses --------------------------------- */

export async function seedCourses(
    adminId: Types.ObjectId,
    categoryIdBySlug: SeedContext['categoryIdBySlug'],
    examIdBySlug: SeedContext['examIdBySlug'],
) {
    const courseIdBySlug = new Map<
        string,
        { id: Types.ObjectId; name: string; level: string; durationLabel: string }
    >();
    let specCount = 0;
    let order = 0;

    const examIdByShortName = new Map(
        Array.from(examIdBySlug.values()).map((e) => [e.shortName, e.id]),
    );

    for (const seed of COURSE_SEEDS) {
        order += 10;
        const category = categoryIdBySlug.get(seed.categorySlug);
        if (!category) continue;

        const entranceExams = seed.examShortNames
            .map((name) => examIdByShortName.get(name))
            .filter(Boolean) as Types.ObjectId[];

        const course = await Course.findOneAndUpdate(
            { slug: seed.slug },
            {
                $set: {
                    name: seed.name,
                    shortName: seed.shortName,
                    category: category.id,
                    categoryName: category.name,
                    level: seed.level,
                    durationMonths: seed.durationMonths,
                    durationLabel: seed.durationLabel,
                    studyModes: seed.studyModes,
                    overview: html([
                        `${seed.name} is a ${seed.durationLabel.toLowerCase()} ${seed.level.toLowerCase()} programme in the ${category.name} stream.`,
                        `The programme combines core theory, laboratory or practical work and industry exposure. ${DEMO_DATA_NOTICE}`,
                    ]),
                    eligibility: html([
                        'Candidates must have completed the qualifying examination with the minimum aggregate prescribed by the university or regulator.',
                        seed.examShortNames.length
                            ? `Admission is usually through ${seed.examShortNames.join(', ')} followed by centralised counselling.`
                            : 'Admission is generally merit based on qualifying examination marks.',
                    ]),
                    admissionProcess: html([
                        '<ol><li>Appear for the accepted entrance exam (if applicable)</li><li>Register for counselling or apply directly to the institute</li><li>Fill and lock your college and branch preferences</li><li>Complete document verification and fee payment</li></ol>',
                    ]),
                    syllabusHtml: html([
                        'The curriculum is delivered across semesters with core papers, electives, laboratory work and a final-year project or internship.',
                    ]),
                    careerHtml: html([
                        `Graduates typically work as ${seed.jobRoles.join(', ')}.`,
                        `Commonly reported recruiters include ${seed.recruiters.join(', ')}. Salary ranges depend on institute, location and specialisation.`,
                    ]),
                    averageFee: { min: seed.feeMin, max: seed.feeMax, currency: 'INR', note: DEMO_DATA_NOTICE },
                    averageSalary: { min: seed.salaryMin, max: seed.salaryMax, note: 'Illustrative demonstration range.' },
                    topRecruiters: seed.recruiters,
                    entranceExams,
                    skills: seed.skills,
                    jobRoles: seed.jobRoles,
                    icon: seed.icon ?? CATEGORY_SEEDS.find((c) => c.slug === seed.categorySlug)?.icon,
                    isFeatured: seed.featured ?? false,
                    displayOrder: order,
                    highlights: [
                        { label: 'Level', value: seed.level },
                        { label: 'Duration', value: seed.durationLabel },
                        { label: 'Average fee', value: `₹${(seed.feeMin / 100000).toFixed(1)}L – ₹${(seed.feeMax / 100000).toFixed(1)}L` },
                        { label: 'Study modes', value: seed.studyModes.join(', ') },
                    ],
                    faqs: [
                        {
                            question: `What is the duration of ${seed.name}?`,
                            answer: `${seed.name} is a ${seed.durationLabel.toLowerCase()} programme.`,
                            order: 1,
                        },
                        {
                            question: `Which entrance exams are accepted for ${seed.name}?`,
                            answer: seed.examShortNames.length
                                ? `Commonly accepted exams include ${seed.examShortNames.join(', ')}.`
                                : 'Most institutes admit on merit; some conduct their own entrance test.',
                            order: 2,
                        },
                        {
                            question: `What is the average fee for ${seed.name}?`,
                            answer: `Demonstration fee range is ₹${seed.feeMin.toLocaleString('en-IN')} to ₹${seed.feeMax.toLocaleString('en-IN')} for the full programme. Verify with the institute.`,
                            order: 3,
                        },
                    ],
                    status: 'published',
                    publishedAt: new Date(),
                    createdBy: adminId,
                    seo: {
                        title: `${seed.name} — Eligibility, Fees, Colleges & Career`,
                        description: `${seed.name} course details: eligibility, duration, fees, entrance exams, specialisations, syllabus, top colleges and career options.`,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();

        courseIdBySlug.set(seed.slug, {
            id: course!._id,
            name: seed.name,
            level: seed.level,
            durationLabel: seed.durationLabel,
        });

        await Specialization.deleteMany({ course: course!._id });
        const specIds: Types.ObjectId[] = [];
        let specOrder = 0;
        for (const name of seed.specializations) {
            specOrder += 10;
            const spec = await Specialization.create({
                name,
                slug: slugify(name),
                course: course!._id,
                courseName: seed.name,
                description: `${name} specialisation within ${seed.name}, covering focused coursework, labs and projects in this area.`,
                durationMonths: seed.durationMonths,
                careerScope: `Graduates of the ${name} specialisation typically work in roles aligned to this domain.`,
                averageSalary: { min: seed.salaryMin, max: seed.salaryMax },
                displayOrder: specOrder,
                status: 'active',
                createdBy: adminId,
            });
            specIds.push(spec._id);
            specCount += 1;
        }
        await Course.updateOne({ _id: course!._id }, { $set: { specializations: specIds } });
    }

    log(`Seeded ${COURSE_SEEDS.length} courses and ${specCount} specialisations`);
    return courseIdBySlug;
}

/* ------------------------------- colleges -------------------------------- */

export async function seedColleges(
    adminId: Types.ObjectId,
    ctx: Pick<SeedContext, 'cityIdBySlug' | 'categoryIdBySlug' | 'courseIdBySlug' | 'examIdBySlug'>,
) {
    const collegeIdBySlug = new Map<string, { id: Types.ObjectId; name: string }>();
    let collegeCourseCount = 0;
    let rankingCount = 0;
    let order = 0;

    for (const seed of COLLEGE_SEEDS) {
        order += 10;
        const slug = slugify(`${seed.name} ${seed.citySlug}`);
        const city = ctx.cityIdBySlug.get(seed.citySlug);
        if (!city) {
            console.warn(`  ! Skipping ${seed.name}: unknown city ${seed.citySlug}`);
            continue;
        }

        const categories = seed.categorySlugs
            .map((s) => ctx.categoryIdBySlug.get(s)?.id)
            .filter(Boolean) as Types.ObjectId[];
        const courses = seed.courseSlugs
            .map((s) => ctx.courseIdBySlug.get(s)?.id)
            .filter(Boolean) as Types.ObjectId[];
        const exams = seed.examSlugs
            .map((s) => ctx.examIdBySlug.get(s)?.id)
            .filter(Boolean) as Types.ObjectId[];

        const seedHash = hashString(seed.name);

        const college = await College.findOneAndUpdate(
            { slug },
            {
                $set: {
                    name: seed.name,
                    shortName: seed.shortName,
                    aliases: [seed.shortName, `${seed.shortName} ${city.name}`],
                    tagline: `${seed.categorySlugs[0] ? seed.categorySlugs[0].replace('-', ' ') : 'Higher'} education in ${city.name}`,
                    description: `${seed.name} is a ${seed.ownership.toLowerCase()} institution in ${city.name}, ${city.stateName}, established in ${seed.establishedYear} and affiliated to ${seed.affiliatedTo}.`,
                    overviewHtml: html([
                        `${seed.name} is located in ${city.name}, ${city.stateName} and has been operating since ${seed.establishedYear}. The institute is approved by ${seed.approvals.join(', ')} and holds ${seed.accreditation.join(', ')}.`,
                        `The campus spans about ${seed.campusSizeAcres} acres with roughly ${seed.totalStudents.toLocaleString('en-IN')} students across programmes.`,
                        `<strong>${DEMO_DATA_NOTICE}</strong>`,
                    ]),
                    logo: { url: '/brand/college-placeholder.svg', alt: `${seed.shortName} logo placeholder` },
                    state: city.stateId,
                    stateName: city.stateName,
                    city: city.id,
                    cityName: city.name,
                    address: `${seed.shortName} Campus, ${city.name}, ${city.stateName}`,
                    ownership: seed.ownership,
                    establishedYear: seed.establishedYear,
                    affiliatedTo: seed.affiliatedTo,
                    approvals: seed.approvals,
                    accreditation: seed.accreditation,
                    campusSizeAcres: seed.campusSizeAcres,
                    totalStudents: seed.totalStudents,
                    totalFaculty: Math.round(seed.totalStudents / 18),
                    facultyStudentRatio: '1:18',
                    categories,
                    courses,
                    examsAccepted: exams,
                    feeRange: { min: seed.feeMin, max: seed.feeMax, currency: 'INR' },
                    ranking: {
                        nirfOverall: seed.nirfOverall,
                        nirfCategory: seed.nirfCategory,
                        nirfCategoryName: seed.nirfCategoryName,
                        year: new Date().getFullYear(),
                    },
                    rating: {
                        overall: seed.rating,
                        placement: Math.min(5, Number((seed.rating - 0.1).toFixed(1))),
                        faculty: Math.min(5, Number((seed.rating + 0.1).toFixed(1))),
                        infrastructure: Math.min(5, Number((seed.rating - 0.2).toFixed(1))),
                        campusLife: Math.min(5, Number((seed.rating + 0.05).toFixed(1))),
                        valueForMoney: Math.min(5, Number((seed.rating - 0.15).toFixed(1))),
                        count: seed.ratingCount,
                    },
                    placement: {
                        highestPackage: seed.highestPackage,
                        averagePackage: seed.averagePackage,
                        medianPackage: Math.round(seed.averagePackage * 0.9),
                        placementPercentage: seed.placementPercentage,
                        topRecruiters: seed.recruiters,
                        year: new Date().getFullYear(),
                        summaryHtml: html([
                            `In the last reported cycle about ${seed.placementPercentage}% of eligible students were placed, with an average package around ₹${(seed.averagePackage / 100000).toFixed(1)} LPA. ${DEMO_DATA_NOTICE}`,
                        ]),
                    },
                    facilities: seed.facilities,
                    hostelAvailable: seed.hostelAvailable,
                    hostelFeeRange: seed.hostelAvailable
                        ? { min: 45000 + (seedHash % 20000), max: 120000 + (seedHash % 40000) }
                        : undefined,
                    admissionsHtml: html([
                        `Admission to ${seed.name} is through ${exams.length ? seed.examSlugs.join(', ').toUpperCase() : 'institute-level merit'} followed by counselling and document verification.`,
                        '<ol><li>Register on the counselling or institute portal</li><li>Fill preferences and lock choices</li><li>Attend document verification</li><li>Pay the admission fee to confirm the seat</li></ol>',
                    ]),
                    eligibilityHtml: html([
                        'Programme-wise eligibility follows the regulator and affiliating university norms. Check the individual course page for the exact requirement.',
                    ]),
                    cutoffHtml: html([
                        'Closing ranks and scores change every year. Use the relevant predictor for an estimated probability band based on previous-year data.',
                    ]),
                    scholarshipsHtml: html([
                        'Merit scholarships, category-based government scholarships and institute fee waivers may be available. Confirm current schemes with the admission office.',
                    ]),
                    facultyHtml: html([
                        `The institute reports approximately ${Math.round(seed.totalStudents / 18)} faculty members with a student-faculty ratio of about 1:18.`,
                    ]),
                    contact: {
                        phone: '+91 91555 55555',
                        email: `admissions@${slugify(seed.shortName)}.example.org`,
                        website: 'https://example.org',
                    },
                    highlights: [
                        { label: 'Established', value: String(seed.establishedYear) },
                        { label: 'Ownership', value: seed.ownership },
                        { label: 'Approvals', value: seed.approvals.join(', ') },
                        { label: 'Accreditation', value: seed.accreditation.join(', ') },
                    ],
                    faqs: [
                        {
                            question: `What is the annual fee at ${seed.shortName}?`,
                            answer: `Demonstration annual fees range from ₹${seed.feeMin.toLocaleString('en-IN')} to ₹${seed.feeMax.toLocaleString('en-IN')} depending on the programme. Verify with the institute.`,
                            order: 1,
                        },
                        {
                            question: `Does ${seed.shortName} provide hostel facilities?`,
                            answer: seed.hostelAvailable
                                ? 'Yes, separate hostel facilities are available for male and female students.'
                                : 'Hostel facilities are not available on campus; the institute assists with nearby accommodation.',
                            order: 2,
                        },
                        {
                            question: `Which entrance exams does ${seed.shortName} accept?`,
                            answer: seed.examSlugs.length
                                ? `The institute accepts ${seed.examSlugs.join(', ').toUpperCase()} scores.`
                                : 'Admission is based on qualifying examination merit.',
                            order: 3,
                        },
                    ],
                    isFeatured: seed.featured ?? false,
                    isVerified: true,
                    displayOrder: order,
                    dataSourceNote: DEMO_DATA_NOTICE,
                    status: 'published',
                    publishedAt: new Date(),
                    createdBy: adminId,
                    seo: {
                        title: `${seed.name}, ${city.name} — Courses, Fees, Placements & Admission`,
                        description: `${seed.name} in ${city.name}: courses offered, fee structure, admission process, cut-offs, placements, facilities and student reviews.`,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();

        collegeIdBySlug.set(slug, { id: college!._id, name: seed.name });

        // college-course offerings
        await CollegeCourse.deleteMany({ college: college!._id });
        for (const courseSlug of seed.courseSlugs) {
            const course = ctx.courseIdBySlug.get(courseSlug);
            if (!course) continue;
            const feeSpread = seed.feeMax - seed.feeMin;
            const annualFee = seed.feeMin + (hashString(courseSlug + seed.name) % Math.max(1, feeSpread));

            await CollegeCourse.create({
                college: college!._id,
                collegeName: seed.name,
                collegeSlug: slug,
                course: course.id,
                courseName: course.name,
                level: course.level,
                durationLabel: course.durationLabel,
                studyMode: 'Full Time',
                totalSeats: 60 + (hashString(courseSlug) % 120),
                annualFee,
                totalFee: annualFee * 4,
                hostelFee: seed.hostelAvailable ? 60000 : undefined,
                eligibility: 'As per affiliating university and regulator norms.',
                examsAccepted: exams,
                admissionOpen: true,
                applicationDeadline: monthsFromNow(2, 20),
                status: 'active',
                createdBy: adminId,
            });
            collegeCourseCount += 1;
        }

        // rankings
        if (seed.nirfOverall || seed.nirfCategory) {
            const year = new Date().getFullYear();
            for (const offset of [0, 1]) {
                await Ranking.create({
                    publisher: 'NIRF (demonstration data)',
                    year: year - offset,
                    categoryName: seed.nirfCategoryName ?? 'Overall',
                    college: college!._id,
                    collegeName: seed.name,
                    rank: (seed.nirfCategory ?? seed.nirfOverall ?? 100) + offset * 3,
                    score: 60 - offset * 1.4,
                    status: 'active',
                    createdBy: adminId,
                });
                rankingCount += 1;
            }
        }
    }

    // denormalised counters
    for (const [slug, meta] of collegeIdBySlug) {
        void slug;
        void meta;
    }

    log(`Seeded ${collegeIdBySlug.size} colleges, ${collegeCourseCount} college-course rows, ${rankingCount} rankings`);
    return collegeIdBySlug;
}

/** Recomputes denormalised counts used by cards and filters. */
export async function recomputeCounters() {
    const categories = await CourseCategory.find().select('_id').lean().exec();
    for (const category of categories) {
        const [courseCount, collegeCount] = await Promise.all([
            Course.countDocuments({ category: category._id, status: 'published' }).exec(),
            College.countDocuments({ categories: category._id, status: 'published' }).exec(),
        ]);
        await CourseCategory.updateOne({ _id: category._id }, { $set: { courseCount, collegeCount } });
    }

    const courses = await Course.find().select('_id').lean().exec();
    for (const course of courses) {
        const collegeCount = await College.countDocuments({
            courses: course._id,
            status: 'published',
        }).exec();
        await Course.updateOne({ _id: course._id }, { $set: { collegeCount } });
    }

    const { State, City } = await import('@/db/models/geo.model');
    const states = await State.find().select('_id').lean().exec();
    for (const state of states) {
        const collegeCount = await College.countDocuments({ state: state._id, status: 'published' }).exec();
        await State.updateOne({ _id: state._id }, { $set: { collegeCount } });
    }
    const cities = await City.find().select('_id').lean().exec();
    for (const city of cities) {
        const collegeCount = await College.countDocuments({ city: city._id, status: 'published' }).exec();
        await City.updateOne({ _id: city._id }, { $set: { collegeCount } });
    }

    const exams = await Exam.find().select('_id').lean().exec();
    for (const exam of exams) {
        const acceptedByCollegeCount = await College.countDocuments({
            examsAccepted: exam._id,
            status: 'published',
        }).exec();
        await Exam.updateOne({ _id: exam._id }, { $set: { acceptedByCollegeCount } });
    }

    log('Recomputed denormalised counters (categories, courses, states, cities, exams)');
}
