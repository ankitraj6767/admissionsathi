/** Exam detail sub-routes. Shared by the server pages and the client tab bar. */
export const EXAM_SECTIONS = [
    { segment: '', label: 'Overview' },
    { segment: 'dates', label: 'Important Dates' },
    { segment: 'eligibility', label: 'Eligibility' },
    { segment: 'application', label: 'Application' },
    { segment: 'pattern', label: 'Exam Pattern' },
    { segment: 'syllabus', label: 'Syllabus' },
    { segment: 'admit-card', label: 'Admit Card' },
    { segment: 'result', label: 'Result' },
    { segment: 'cutoff', label: 'Cut-off' },
    { segment: 'counselling', label: 'Counselling' },
    { segment: 'papers', label: 'Papers & Mocks' },
] as const;

export type ExamSection = (typeof EXAM_SECTIONS)[number]['segment'];

export const EXAM_SECTION_SEGMENTS = EXAM_SECTIONS.filter((s) => s.segment).map((s) => s.segment);
