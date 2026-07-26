import { DEMO_DATA_NOTICE } from '@/config/constants';

/**
 * Bootstrap content for the standalone CMS pages.
 *
 * Every company/legal link in `navigation-fallback.ts` has an entry here, so a
 * freshly seeded install has no dead navigation items. The copy is deliberately
 * factual scaffolding for editors to replace — the legal pages in particular are
 * templates, not reviewed legal advice.
 */
export interface StaticPageSeed {
    title: string;
    slug: string;
    group: 'company' | 'legal' | 'support' | 'other';
    heroEyebrow?: string;
    excerpt: string;
    showLastUpdated?: boolean;
    displayOrder: number;
    contentHtml: string;
}

const LEGAL_TEMPLATE_NOTE = `<p><em>Template notice: this policy is starter scaffolding seeded for development. Have it reviewed by a qualified professional and replace it before going live.</em></p>`;

export const STATIC_PAGE_SEEDS: StaticPageSeed[] = [
    {
        title: 'About Admission Sathi',
        slug: 'about',
        group: 'company',
        heroEyebrow: 'Who we are',
        displayOrder: 1,
        excerpt:
            'Admission Sathi is an independent education discovery and counselling platform helping Indian students choose the right course, college and funding path.',
        contentHtml: `
<h2>Our mission</h2>
<p>Choosing what to study after school decides the next forty years of a person's working life, and most students make that choice with fragmented information and a deadline. Admission Sathi exists to fix that: one place to compare courses and colleges, understand entrance exams, estimate admission chances, work out how to pay for it, and talk to a counsellor who is not selling a seat.</p>

<h2>What we do</h2>
<ul>
  <li><strong>Discovery</strong> — structured profiles for colleges and courses, with fees, eligibility, approvals, placements and student reviews side by side.</li>
  <li><strong>Exam guidance</strong> — dates, eligibility, patterns, syllabus and counselling processes for major national and state entrance exams.</li>
  <li><strong>College prediction</strong> — rule-based estimates built on historical cut-off data, always labelled as estimates.</li>
  <li><strong>Finance</strong> — education loan comparison, an EMI calculator and scholarship listings.</li>
  <li><strong>Counselling</strong> — free sessions with counsellors who work through your marks, budget and location preferences.</li>
</ul>

<h2>How we make money</h2>
<p>We do not charge students for counselling. The platform is funded by institutional partnerships and advertising. Partnerships never change how a college ranks in listings or comparisons, and sponsored placements are labelled as such.</p>

<h2>How we handle data accuracy</h2>
<p>Fees, cut-offs, rankings and placement figures change every admission season. We source them from official institute and counselling-authority publications, date-stamp them, and mark anything we could not verify. If you spot something wrong, tell us through the <a href="/contact">contact form</a> and we will correct it.</p>

<h2>Talk to us</h2>
<p>Questions, corrections or partnership enquiries — reach the team on the <a href="/contact">contact page</a>, or <a href="/book-counselling">book a free counselling session</a>.</p>
`,
    },
    {
        title: 'Careers at Admission Sathi',
        slug: 'careers',
        group: 'company',
        heroEyebrow: 'Join the team',
        displayOrder: 2,
        excerpt:
            'We are a small team building the guidance platform we wish we had. Counsellors, content specialists and engineers welcome.',
        contentHtml: `
<h2>Why work here</h2>
<p>Every feature we ship changes a real admission decision. The team is small enough that you own your area end to end, and close enough to students that you hear when something does not work.</p>

<h2>How we work</h2>
<ul>
  <li>Small teams, direct ownership, no layers between you and the decision.</li>
  <li>Remote-friendly across India, with periodic in-person planning weeks.</li>
  <li>Written-first: proposals over meetings.</li>
  <li>Accuracy is a hard requirement. We would rather ship less than publish a number we cannot source.</li>
</ul>

<h2>Where we usually hire</h2>
<ul>
  <li><strong>Admission counsellors</strong> — regional counselling expertise, strong communication in English plus at least one Indian language.</li>
  <li><strong>Content specialists</strong> — exam, course and college research with an eye for primary sources.</li>
  <li><strong>Engineering</strong> — TypeScript, Next.js, MongoDB.</li>
  <li><strong>Data</strong> — cut-off datasets, analytics and reporting.</li>
</ul>

<h2>Applying</h2>
<p>Send your CV and a short note about the work you want to do through the <a href="/contact">contact form</a>, choosing "Careers at Admission Sathi" as the subject. We read every application and reply either way.</p>
`,
    },
    {
        title: 'Partner With Us',
        slug: 'partner-with-us',
        group: 'company',
        heroEyebrow: 'For institutions',
        displayOrder: 3,
        excerpt:
            'Options for colleges, universities, lenders and prep partners who want to reach students on Admission Sathi.',
        contentHtml: `
<h2>Who we partner with</h2>
<ul>
  <li><strong>Colleges and universities</strong> — verified profiles, course and fee listings, admission enquiry routing.</li>
  <li><strong>Education lenders</strong> — loan product listings, eligibility checks and application hand-off.</li>
  <li><strong>Scholarship providers</strong> — programme listings with eligibility and deadlines.</li>
  <li><strong>Test-prep and content partners</strong> — study material, mock tests and webinars.</li>
</ul>

<h2>What a partnership does not buy</h2>
<p>This matters, so we will be direct. Partnership does not change search ranking, comparison outcomes, predictor results or review moderation. Sponsored content and paid placements are always labelled. We decline partnerships that require us to hide or soften verified information.</p>

<h2>What we need from you</h2>
<ul>
  <li>Approval, accreditation and affiliation documents.</li>
  <li>Current fee structure and admission process, with the official source.</li>
  <li>A named contact for data corrections each admission season.</li>
</ul>

<h2>Get in touch</h2>
<p>Use the <a href="/contact">contact form</a> and select "Partnership / tie-up". We respond within two working days with next steps.</p>
`,
    },
    {
        title: 'Editorial Policy',
        slug: 'editorial-policy',
        group: 'company',
        heroEyebrow: 'How we publish',
        displayOrder: 4,
        showLastUpdated: true,
        excerpt:
            'How Admission Sathi researches, reviews, sources and corrects the information published on the platform.',
        contentHtml: `
<h2>Sourcing</h2>
<p>Admission and exam information comes from primary sources first: institute websites and brochures, counselling-authority notifications, regulator listings (UGC, AICTE, NMC, PCI, BCI, INC and others), and official ranking releases such as NIRF. Where a figure has no primary source, we either omit it or label it clearly as unverified.</p>

<h2>Review workflow</h2>
<p>Every article, guide and institute profile moves through draft, review and published states. A second reviewer checks factual claims, dates and figures against the cited source before publication. Author and reviewer are recorded on each piece.</p>

<h2>Dates and versioning</h2>
<p>Time-sensitive content carries a publish date and a last-updated date. Exam dates, fees and cut-offs are re-verified each admission season, and superseded figures are replaced rather than deleted so historical comparisons stay honest.</p>

<h2>Estimates and predictions</h2>
<p>College predictor output is a rule-based estimate derived from historical cut-off data. It is not a guarantee of admission, and we never present it as a precise probability. Every predictor result carries this disclaimer.</p>

<h2>Advertising and sponsorship</h2>
<p>Sponsored content is labelled. Commercial relationships do not influence listings, rankings, comparisons, predictor logic or review moderation.</p>

<h2>Reviews</h2>
<p>Student reviews are moderated before publication. We remove reviews that contain personal attacks, identifiable third-party information, or claims presented as institutional fact. We do not edit opinions, and we do not delete negative reviews at an institution's request.</p>

<h2>Corrections</h2>
<p>Report an error through the <a href="/contact">contact form</a> with the page URL and, where possible, the correct source. We aim to review corrections within two working days, and material corrections are noted on the page.</p>
`,
    },
    {
        title: 'Download the Admission Sathi App',
        slug: 'app',
        group: 'support',
        heroEyebrow: 'Mobile app',
        displayOrder: 1,
        excerpt:
            'Track exam dates, saved colleges, predictor results and counselling sessions from your phone.',
        contentHtml: `
<h2>What the app adds</h2>
<ul>
  <li>Push reminders for registration windows, admit cards, results and counselling rounds.</li>
  <li>Your saved colleges, courses and comparisons, synced with the website.</li>
  <li>Predictor history and counselling session details in one place.</li>
  <li>Direct chat with your assigned counsellor.</li>
</ul>

<h2>Getting it</h2>
<p>Store links are published in the top bar of every page as soon as a build is live. Until then, the website works fully on mobile — add it to your home screen for an app-like experience.</p>

<h2>Meanwhile</h2>
<p>Everything the app does is already available here: <a href="/dashboard/saved">saved items</a>, <a href="/dashboard/predictions">predictor history</a>, <a href="/dashboard/bookings">counselling bookings</a> and <a href="/dashboard/notifications">notifications</a>.</p>
`,
    },
    {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        group: 'legal',
        heroEyebrow: 'Legal',
        displayOrder: 1,
        showLastUpdated: true,
        excerpt:
            'What personal data Admission Sathi collects, why we collect it, who we share it with, and the rights you have over it.',
        contentHtml: `
${LEGAL_TEMPLATE_NOTE}

<h2>1. What we collect</h2>
<ul>
  <li><strong>Information you give us</strong> — name, mobile number, email, state and city, course interest, exam scores or ranks entered into predictors, messages you send us, and review content you submit.</li>
  <li><strong>Account information</strong> — email and a hashed password, or a Google account identifier if you sign in with Google. We never store your password in readable form.</li>
  <li><strong>Usage information</strong> — pages viewed, searches run, tools used, device and browser type, and an approximate location derived from your IP address.</li>
</ul>

<h2>2. Why we collect it</h2>
<ul>
  <li>To provide the service: showing relevant colleges and courses, running predictors, and saving your shortlists.</li>
  <li>To deliver counselling you asked for, including contacting you by phone, WhatsApp or email about your enquiry.</li>
  <li>To send notifications you opted into, such as exam date and deadline reminders.</li>
  <li>To improve the platform through aggregated analytics.</li>
  <li>To meet legal obligations and to prevent abuse of the service.</li>
</ul>

<h2>3. Consent and communication</h2>
<p>Enquiry and counselling forms include an explicit consent checkbox. Submitting one means you agree to be contacted about that enquiry. You can withdraw consent at any time from your notification preferences or by writing to us, and we will stop marketing contact. We may still need to contact you about an active booking.</p>

<h2>4. Who we share data with</h2>
<p>We share only what a purpose requires: counsellors handling your session; an institution or lender when you explicitly ask us to forward an application or enquiry; and service providers that run our infrastructure (hosting, database, email, WhatsApp, SMS and analytics) under contract. We do not sell your personal data.</p>

<h2>5. Cookies and analytics</h2>
<p>We use cookies to keep you signed in and to remember preferences such as saved comparisons. Analytics cookies measure how the platform is used. You can block cookies in your browser; sign-in and saved items will stop working.</p>

<h2>6. Retention</h2>
<p>Account data is kept while your account is open. Enquiry and counselling records are kept for as long as needed to serve you and to meet legal obligations, then deleted or anonymised. Aggregated analytics that cannot identify you may be kept indefinitely.</p>

<h2>7. Security</h2>
<p>Data is transmitted over TLS, passwords are hashed, access is role-restricted and administrative actions are logged. No system is perfectly secure; if a breach affects you, we will notify you and the relevant authority as required.</p>

<h2>8. Your rights</h2>
<p>You can access and correct your profile, export your data, and delete your account from your dashboard, or ask us to do any of these. Deleting your account removes your personal data; records we must retain by law are anonymised instead.</p>

<h2>9. Children</h2>
<p>The platform is intended for students aged 16 and above. If you are younger, please use it with a parent or guardian.</p>

<h2>10. Changes and contact</h2>
<p>We will post any change to this policy on this page with a new last-updated date. Questions or requests about your data: use the <a href="/contact">contact form</a>.</p>
`,
    },
    {
        title: 'Terms of Use',
        slug: 'terms-of-use',
        group: 'legal',
        heroEyebrow: 'Legal',
        displayOrder: 2,
        showLastUpdated: true,
        excerpt:
            'The terms that govern your use of the Admission Sathi website, tools, counselling services and content.',
        contentHtml: `
${LEGAL_TEMPLATE_NOTE}

<h2>1. Accepting these terms</h2>
<p>Using Admission Sathi means you accept these terms. If you do not agree with them, please do not use the platform.</p>

<h2>2. What the service is</h2>
<p>Admission Sathi is an information and guidance platform. We are not a university, a college, an examination authority, a bank or a placement agency. We do not grant admission, issue results, sanction loans or guarantee outcomes.</p>

<h2>3. Information accuracy</h2>
<p>We work hard to keep fees, eligibility, dates, cut-offs and rankings correct and to cite sources, but admission information changes frequently and without notice. Always confirm critical details with the institution or the official counselling authority before acting. See our <a href="/editorial-policy">editorial policy</a> and <a href="/disclaimer">disclaimer</a>.</p>

<h2>4. Predictor tools</h2>
<p>Predictor results are estimates generated from historical data using configurable rules. They are not a guarantee, an offer, or a statement of your actual admission chances. Do not make an irreversible decision on a prediction alone.</p>

<h2>5. Your account</h2>
<p>You are responsible for the accuracy of the information you provide and for keeping your credentials secure. Do not impersonate anyone, share an account, or use automated means to scrape the platform. We may suspend an account that breaches these terms or is used to abuse the service.</p>

<h2>6. Content you submit</h2>
<p>You keep ownership of reviews and other content you submit, and you grant us a non-exclusive, royalty-free licence to publish, display and moderate it on the platform. You confirm the content is your own honest experience and does not infringe anyone's rights. We may decline to publish, edit for length or remove content that breaches our moderation standards.</p>

<h2>7. Our content</h2>
<p>Text, design, structure and compiled data on the platform belong to Admission Sathi or its licensors. You may read, print and share pages for personal, non-commercial use. Bulk extraction, republication or use of our content to train a commercial model requires written permission. Institution names and logos belong to their respective owners.</p>

<h2>8. Third-party links</h2>
<p>We link to institution, exam authority and lender websites for verification. We do not control them and are not responsible for their content or practices.</p>

<h2>9. Limitation of liability</h2>
<p>The platform is provided "as is". To the extent permitted by law, we are not liable for indirect or consequential loss, or for losses arising from a decision you took based on information or an estimate published here.</p>

<h2>10. Governing law</h2>
<p>These terms are governed by the laws of India, and the courts of the jurisdiction in which Admission Sathi is registered have exclusive jurisdiction.</p>

<h2>11. Changes</h2>
<p>We may update these terms; the current version always sits on this page with its last-updated date. Continuing to use the platform after a change means you accept the updated terms.</p>
`,
    },
    {
        title: 'Refund Policy',
        slug: 'refund-policy',
        group: 'legal',
        heroEyebrow: 'Legal',
        displayOrder: 3,
        showLastUpdated: true,
        excerpt:
            'Counselling is free. This page explains what happens with any paid service, and what we cannot refund.',
        contentHtml: `
${LEGAL_TEMPLATE_NOTE}

<h2>1. Free counselling</h2>
<p>Standard counselling sessions on Admission Sathi are free. There is nothing to refund, and we will never ask a student to pay for a basic counselling session.</p>

<h2>2. Paid services</h2>
<p>Where a premium service is offered and clearly priced before purchase, the following applies:</p>
<ul>
  <li><strong>Before delivery</strong> — cancel at least 24 hours before a scheduled session for a full refund.</li>
  <li><strong>Within 24 hours</strong> — one free reschedule; otherwise the session fee is retained.</li>
  <li><strong>Cancelled by us</strong> — if we cancel or fail to deliver, you get a full refund or a rescheduled session, your choice.</li>
  <li><strong>After delivery</strong> — a delivered session or downloaded digital product is not refundable, except where required by law.</li>
</ul>

<h2>3. Processing</h2>
<p>Approved refunds are returned to the original payment method within 7 to 10 working days. Payment gateway charges, where non-recoverable, may be deducted.</p>

<h2>4. What we cannot refund</h2>
<p>We cannot refund fees you paid to a college, university, examination authority, lender or any other third party. Those are governed by that organisation's own policy.</p>

<h2>5. Raising a request</h2>
<p>Send your request through the <a href="/contact">contact form</a> with your booking reference and reason. We acknowledge within two working days.</p>
`,
    },
    {
        title: 'Disclaimer',
        slug: 'disclaimer',
        group: 'legal',
        heroEyebrow: 'Legal',
        displayOrder: 4,
        showLastUpdated: true,
        excerpt:
            'The limits of the information, estimates and rankings published on Admission Sathi.',
        contentHtml: `
${LEGAL_TEMPLATE_NOTE}

<h2>Information is indicative</h2>
<p>Fees, eligibility, seat counts, cut-offs, rankings, placement figures and important dates published here are compiled from public sources and change without notice. They are indicative. Always verify against the official institute or counselling-authority notification before you apply, pay or accept a seat.</p>

<h2>Predictions are estimates, not guarantees</h2>
<p>College predictor results are produced by rule-based logic applied to historical cut-off data. Actual admission depends on the current year's applicant pool, seat matrix, category and quota rules, counselling round behaviour and authority decisions — none of which can be known in advance. A prediction is not an offer of admission and confers no right to a seat.</p>

<h2>No professional advice</h2>
<p>Content on this platform is general guidance. It is not legal, financial, medical or immigration advice. Education loan information is indicative; the lender's sanction terms prevail. Consult a qualified professional before acting on anything material.</p>

<h2>Reviews are personal opinions</h2>
<p>Student reviews are the personal experiences of their authors, moderated but not independently verified as statements of institutional fact. They do not represent the views of Admission Sathi.</p>

<h2>Third-party names and links</h2>
<p>Institution, university, examination and lender names, logos and trademarks belong to their respective owners and are used for identification only. Their presence does not imply endorsement or affiliation in either direction. We are not responsible for the content of external sites we link to.</p>

<h2>Demonstration data</h2>
<p>${DEMO_DATA_NOTICE}</p>

<h2>Reporting an error</h2>
<p>Found something wrong? Tell us through the <a href="/contact">contact form</a> with the page URL and the correct source, and we will review it.</p>
`,
    },
];
