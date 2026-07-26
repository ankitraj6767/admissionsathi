/** Canonical analytics event names. Shared by client trackers and server aggregation. */
export const ANALYTICS_EVENTS = {
    pageView: 'page_view',
    search: 'search',
    searchZeroResults: 'search_zero_results',
    searchResultClick: 'search_result_click',
    collegeView: 'college_view',
    courseView: 'course_view',
    examView: 'exam_view',
    articleView: 'article_view',
    predictorStart: 'predictor_start',
    predictorComplete: 'predictor_complete',
    counsellingFormStart: 'counselling_form_start',
    counsellingFormSubmit: 'counselling_form_submit',
    bookingCreated: 'booking_created',
    whatsappClick: 'whatsapp_click',
    phoneClick: 'phone_click',
    brochureDownload: 'brochure_download',
    collegeCompare: 'college_compare',
    collegeSave: 'college_save',
    leadConverted: 'lead_converted',
    loanCalculated: 'loan_calculated',
    aiMessage: 'ai_message',
    newsletterSubscribe: 'newsletter_subscribe',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsPayload {
    name: AnalyticsEventName | string;
    path?: string;
    entityType?: string;
    entityId?: string;
    entitySlug?: string;
    properties?: Record<string, string | number | boolean | null | undefined>;
}
