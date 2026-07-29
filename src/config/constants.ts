/** Shared domain enums / constants used by models, schemas and UI. */

export const CONTENT_STATUS = ['draft', 'in_review', 'scheduled', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

export const ENTITY_STATUS = ['active', 'inactive', 'archived'] as const;
export type EntityStatus = (typeof ENTITY_STATUS)[number];

export const OWNERSHIP_TYPES = [
    'Government',
    'Private',
    'Government-Aided',
    'Deemed',
    'Autonomous',
    'Public-Private',
] as const;
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];

export const APPROVAL_BODIES = [
    'AICTE',
    'UGC',
    'NMC',
    'PCI',
    'BCI',
    'INC',
    'NCTE',
    'AIU',
    'COA',
    'NCVT',
    'AYUSH',
] as const;

export const ACCREDITATIONS = [
    'NAAC A++',
    'NAAC A+',
    'NAAC A',
    'NAAC B++',
    'NAAC B+',
    'NAAC B',
    'NBA',
    'Not Accredited',
] as const;

export const COURSE_LEVELS = [
    'Certificate',
    'Diploma',
    'Undergraduate',
    'Postgraduate',
    'Doctorate',
    'Integrated',
] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const STUDY_MODES = ['Full Time', 'Part Time', 'Distance', 'Online', 'Hybrid'] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

export const EXAM_LEVELS = ['National', 'State', 'University', 'International'] as const;

export const EXAM_MODES = ['Online (CBT)', 'Offline (Pen & Paper)', 'Hybrid'] as const;

export const EXAM_CATEGORIES = [
    'Engineering',
    'Medical',
    'Management',
    'Law',
    'Design',
    'Pharmacy',
    'Nursing',
    'Agriculture',
    'Arts & Humanities',
    'Commerce',
    'Computer Applications',
    'University Entrance',
] as const;

export const LEAD_SOURCES = [
    'homepage_counselling_form',
    'counselling_page',
    'college_enquiry',
    'course_enquiry',
    'loan_enquiry',
    'scholarship_enquiry',
    'brochure_download',
    'predictor_submission',
    'contact_form',
    'whatsapp_cta',
    'ai_assistant',
    'newsletter',
    'admin_manual',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
    'new',
    'contacted',
    'qualified',
    'session_scheduled',
    'session_completed',
    'follow_up',
    'converted',
    'closed',
    'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
    new: 'New Lead',
    contacted: 'Contacted',
    qualified: 'Qualified',
    session_scheduled: 'Session Scheduled',
    session_completed: 'Session Completed',
    follow_up: 'Follow-up Required',
    converted: 'Converted',
    closed: 'Closed',
    lost: 'Lost',
};

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const BOOKING_STATUSES = [
    'requested',
    'confirmed',
    'rescheduled',
    'completed',
    'cancelled',
    'no_show',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const MODERATION_STATUSES = ['pending', 'approved', 'rejected', 'hidden'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const PROBABILITY_BANDS = ['very_high', 'high', 'moderate', 'low', 'very_low'] as const;
export type ProbabilityBand = (typeof PROBABILITY_BANDS)[number];

export const PROBABILITY_BAND_META: Record<
    ProbabilityBand,
    { label: string; tone: string; description: string }
> = {
    very_high: {
        label: 'Very High Chance',
        tone: 'green',
        description: 'Your score is comfortably above the recent closing trend.',
    },
    high: {
        label: 'High Chance',
        tone: 'teal',
        description: 'Your score is above the recent closing trend.',
    },
    moderate: {
        label: 'Moderate Chance',
        tone: 'amber',
        description: 'Your score is close to the recent closing trend.',
    },
    low: {
        label: 'Low Chance',
        tone: 'orange',
        description: 'Your score is below the recent closing trend.',
    },
    very_low: {
        label: 'Very Low Chance',
        tone: 'red',
        description: 'Your score is well below the recent closing trend.',
    },
};

export const RESERVATION_CATEGORIES = [
    'General',
    'General-EWS',
    'OBC-NCL',
    'SC',
    'ST',
    'PwD',
] as const;

export const QUOTA_TYPES = [
    'All India',
    'Home State',
    'Other State',
    'Management',
    'NRI',
    'Institute',
    'State',
] as const;

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export const RESOURCE_TYPES = [
    'article',
    'news',
    'guide',
    'previous_year_paper',
    'mock_test',
    'ebook',
    'webinar',
    'video',
    'admission_calendar',
    'state_counselling_guide',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const TRENDING_CATEGORIES = [
    'counselling',
    'exam_date',
    'registration',
    'admit_card',
    'result',
    'deadline',
    'college_notification',
] as const;
export type TrendingCategory = (typeof TRENDING_CATEGORIES)[number];

export const TRENDING_CATEGORY_LABELS: Record<TrendingCategory, string> = {
    counselling: 'Counselling',
    exam_date: 'Exam Date',
    registration: 'Registration',
    admit_card: 'Admit Card',
    result: 'Result',
    deadline: 'Deadline',
    college_notification: 'College Notice',
};

export const NOTIFICATION_CHANNELS = ['email', 'whatsapp', 'sms', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * College detail sub-routes.
 * Single source of truth for the client tab bar, the sitemap and breadcrumbs.
 * An empty segment means the overview page itself.
 */
export const COLLEGE_TABS = [
    { label: 'Overview', segment: '' },
    { label: 'Courses & Fees', segment: 'courses' },
    { label: 'Fees', segment: 'fees' },
    { label: 'Admissions', segment: 'admissions' },
    { label: 'Cut-offs', segment: 'cutoff' },
    { label: 'Placements', segment: 'placements' },
    { label: 'Facilities', segment: 'facilities' },
    { label: 'Scholarships', segment: 'scholarships' },
    { label: 'Gallery', segment: 'gallery' },
    { label: 'Reviews', segment: 'reviews' },
] as const;

export const COLLEGE_TAB_SEGMENTS = COLLEGE_TABS.filter((tab) => tab.segment).map(
    (tab) => tab.segment,
);

/**
 * Stable section keys for the homepage builder.
 *
 * The key is the contract: it appears in `HOMEPAGE_CONFIG_SCHEMAS`, in
 * `HOMEPAGE_SECTION_DRAFTS`, and as the `key` of a `HomepageSection` row. Renaming
 * one orphans its stored row, so add rather than rename.
 *
 * Order here is only the bootstrap order; editors reorder by drag-and-drop and the
 * stored `displayOrder` wins.
 */
export const HOMEPAGE_SECTION_KEYS = [
    'hero',
    'quick_actions',
    'top_courses',
    'compare_colleges',
    'college_predictor',
    'guidance_tools',
    'trending',
    'ai_assistant',
    'loan_promo',
    'whatsapp_community',
    'featured_colleges',
    'upcoming_dates',
    'scholarships',
    'student_reviews',
    'latest_articles',
    'counsellors',
    'why_choose_us',
    'explore_directory',
    'faq',
    'app_download',
    'platform_stats',
    'sticky_cta',
] as const;
export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

export const THEME_COLORS = [
    'navy',
    'orange',
    'teal',
    'green',
    'purple',
    'pink',
    'blue',
] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

export const SEARCH_ENTITY_TYPES = [
    'college',
    'course',
    'exam',
    'article',
    'scholarship',
    'predictor',
    'city',
    'state',
] as const;
export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export const DEMO_DATA_NOTICE =
    'Demonstration data — figures shown are illustrative samples for development and must be replaced with verified information before production use.';
