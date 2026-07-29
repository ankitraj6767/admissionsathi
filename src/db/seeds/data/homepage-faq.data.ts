export interface HomepageFaqSeed {
    question: string;
    answerHtml: string;
    category: string;
}

/**
 * FAQs for the homepage section, scoped `homepage` rather than `global`.
 *
 * Kept separate from the `/faqs` list on purpose. These answer the objections that
 * end a first visit — is it actually free, how accurate is the predictor, what
 * happens to my phone number — and they feed the homepage `FAQPage` structured
 * data. Reusing the same wording in both places would have the two pages compete
 * for the same result.
 *
 * Answers are deliberately specific and admit limits, because a page that claims a
 * predictor is accurate is less trustworthy than one that explains what it can and
 * cannot tell you.
 */
export const HOMEPAGE_FAQ_SEEDS: HomepageFaqSeed[] = [
    {
        question: 'Is the counselling really free, or is there a catch?',
        answerHtml:
            '<p>The first one-to-one session is genuinely free, and you are not asked for card details to book it. Our counsellors are salaried rather than paid per admission, so nobody has a reason to push you towards a particular college. Longer paid sessions with senior counsellors exist, and their price is shown before you book.</p>',
        category: 'Counselling',
    },
    {
        question: 'How accurate is the college predictor?',
        answerHtml:
            '<p>It compares your rank or percentile against imported previous-year closing data for the category, quota and round you select, then reports a probability band. It is an estimate built on past cycles, not a guaranteed seat — seat matrices, reservation splits and applicant numbers all move each year. Treat it as a way to order your choice list, then confirm with a counsellor.</p>',
        category: 'Predictors',
    },
    {
        question: 'Where do your fees, cut-offs and placement figures come from?',
        answerHtml:
            '<p>From public sources: institute disclosures, NIRF submissions and counselling authority documents. Every record shows the year it applies to, and where we could not verify something we leave it blank rather than guess. Always confirm the final fee with the institute before you pay.</p>',
        category: 'Data',
    },
    {
        question: 'Do colleges pay to appear higher in the listings?',
        answerHtml:
            '<p>No. Ranking and sort order come from the data you choose to sort by. Sponsored placements, where they exist, are labelled as such, and they never affect predictor output or review moderation.</p>',
        category: 'Platform',
    },
    {
        question: 'Can you help with education loans and scholarships too?',
        answerHtml:
            '<p>Yes. You can compare lender interest rates, check eligibility, and model the EMI including the moratorium period before you commit. Scholarships are listed with their eligibility and deadline, and a finance counsellor can help you sequence a scholarship application alongside a loan.</p>',
        category: 'Finance',
    },
    {
        question: 'What happens to my phone number after I submit a form?',
        answerHtml:
            '<p>It goes to the counsellor assigned to your enquiry so they can call you back, and it is used to send the acknowledgement and any reminders you agreed to. We do not sell it. You can ask us to delete your account and data from your dashboard at any time.</p>',
        category: 'Privacy',
    },
];
