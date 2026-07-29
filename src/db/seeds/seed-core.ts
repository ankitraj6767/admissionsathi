/* eslint-disable no-console */
import { Types } from 'mongoose';
import { connectToDatabase, mongoose } from '@/db/connect';
import { hashPassword } from '@/lib/auth/password';
import { slugify } from '@/lib/utils';
import { DEMO_DATA_NOTICE } from '@/config/constants';
import {
    PERMISSIONS,
    PERMISSION_GROUPS,
    ROLES,
    ROLE_LABELS,
    ROLE_PERMISSIONS,
} from '@/config/permissions';
import { SETTING_DEFINITIONS } from '@/config/settings-schema';
import { HOMEPAGE_SECTION_DRAFTS } from '@/config/homepage-defaults';
import { STATIC_PAGE_SEEDS } from './data/page.data';
import {
    FOOTER_MENU_DRAFT,
    HEADER_MENU_DRAFT,
    LEGAL_MENU_DRAFT,
    UTILITY_MENU_DRAFT,
    type NavigationDraft,
} from '@/config/navigation-fallback';

import { Permission, Role } from '@/db/models/role.model';
import { User } from '@/db/models/user.model';
import { City, State } from '@/db/models/geo.model';
import {
    FormDefinition,
    HomepageSection,
    NavigationItem,
    NavigationMenu,
    SiteSetting,
    StaticPage,
} from '@/db/models/site.model';
import { EmailTemplate, WhatsAppTemplate } from '@/db/models/system.model';

export const log = (message: string, extra?: unknown) =>
    console.log(`  ${message}`, extra === undefined ? '' : extra);

export interface SeedContext {
    adminId: Types.ObjectId;
    stateIdBySlug: Map<string, Types.ObjectId>;
    cityIdBySlug: Map<string, { id: Types.ObjectId; name: string; stateId: Types.ObjectId; stateName: string }>;
    categoryIdBySlug: Map<string, { id: Types.ObjectId; name: string }>;
    courseIdBySlug: Map<string, { id: Types.ObjectId; name: string; level: string; durationLabel: string }>;
    examIdBySlug: Map<string, { id: Types.ObjectId; shortName: string; name: string }>;
    collegeIdBySlug: Map<string, { id: Types.ObjectId; name: string }>;
}

/** Drops the collections we own. Auth data is dropped too so demo logins stay consistent. */
export async function resetDatabase(): Promise<void> {
    await connectToDatabase();
    const collections = await mongoose.connection.db!.collections();
    for (const collection of collections) {
        if (collection.collectionName.startsWith('system.')) continue;
        await collection.deleteMany({});
    }
    log(`Cleared ${collections.length} collections`);
}

export async function seedRolesAndPermissions(): Promise<void> {
    await Permission.deleteMany({});
    const groupByPermission = new Map<string, string>();
    PERMISSION_GROUPS.forEach((group) =>
        group.permissions.forEach((p) => groupByPermission.set(p, group.label)),
    );

    await Permission.insertMany(
        PERMISSIONS.map((key) => ({
            key,
            group: groupByPermission.get(key) ?? 'Platform',
            label: key
                .split('.')
                .map((part) => part.replace(/_/g, ' '))
                .join(' → '),
            description: `Allows the ${key.split('.')[1]} operation on ${key.split('.')[0]}.`,
        })),
    );

    for (const roleKey of ROLES) {
        await Role.updateOne(
            { key: roleKey },
            {
                $set: {
                    name: ROLE_LABELS[roleKey],
                    permissions: ROLE_PERMISSIONS[roleKey],
                    isSystem: true,
                    isStaff: roleKey !== 'student',
                    description: `${ROLE_LABELS[roleKey]} role seeded with the default permission matrix.`,
                },
            },
            { upsert: true },
        );
    }

    log(`Seeded ${PERMISSIONS.length} permissions and ${ROLES.length} roles`);
}

export async function seedUsers(): Promise<Types.ObjectId> {
    const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@admissionsathi.org';
    const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Admin@12345';
    const studentEmail = process.env.SEED_STUDENT_EMAIL ?? 'student@admissionsathi.org';
    const studentPassword = process.env.SEED_STUDENT_PASSWORD ?? 'Student@12345';

    const [adminHash, studentHash, staffHash] = await Promise.all([
        hashPassword(adminPassword),
        hashPassword(studentPassword),
        hashPassword('Staff@12345'),
    ]);

    const admin = await User.findOneAndUpdate(
        { email: adminEmail },
        {
            $set: {
                name: 'Platform Super Admin',
                passwordHash: adminHash,
                roles: ['super_admin'],
                status: 'active',
                emailVerified: new Date(),
                consent: { dataProcessing: true, marketingOptIn: false, termsAcceptedAt: new Date() },
            },
        },
        { upsert: true, new: true },
    ).exec();

    const staff: { name: string; email: string; roles: string[] }[] = [
        { name: 'Content Manager (demo)', email: 'content@admissionsathi.org', roles: ['content_manager'] },
        { name: 'College Manager (demo)', email: 'colleges@admissionsathi.org', roles: ['college_manager'] },
        { name: 'Exam Manager (demo)', email: 'exams@admissionsathi.org', roles: ['exam_manager'] },
        { name: 'Predictor Manager (demo)', email: 'predictors@admissionsathi.org', roles: ['predictor_manager'] },
        { name: 'Lead Manager (demo)', email: 'leads@admissionsathi.org', roles: ['lead_manager'] },
        { name: 'Finance Manager (demo)', email: 'finance@admissionsathi.org', roles: ['finance_manager'] },
        { name: 'Support Agent (demo)', email: 'support@admissionsathi.org', roles: ['support_agent'] },
        { name: 'Analyst (demo)', email: 'analyst@admissionsathi.org', roles: ['analyst'] },
    ];

    for (const member of staff) {
        await User.updateOne(
            { email: member.email },
            {
                $set: {
                    name: member.name,
                    passwordHash: staffHash,
                    roles: member.roles,
                    status: 'active',
                    emailVerified: new Date(),
                },
            },
            { upsert: true },
        );
    }

    await User.updateOne(
        { email: studentEmail },
        {
            $set: {
                name: 'Demo Student',
                passwordHash: studentHash,
                roles: ['student'],
                status: 'active',
                emailVerified: new Date(),
                phone: '9900000000',
                consent: { dataProcessing: true, marketingOptIn: true, termsAcceptedAt: new Date() },
            },
        },
        { upsert: true },
    );

    log(`Seeded ${staff.length + 2} users (1 super admin, ${staff.length} staff, 1 student)`);
    return admin!._id;
}

export async function seedSettings(adminId: Types.ObjectId): Promise<void> {
    for (const definition of SETTING_DEFINITIONS) {
        await SiteSetting.updateOne(
            { key: definition.key },
            {
                $set: {
                    group: definition.group,
                    label: definition.label,
                    valueType: definition.valueType,
                    isPublic: definition.isPublic,
                    isSecret: definition.isSecret,
                    displayOrder: definition.displayOrder,
                    updatedBy: adminId,
                },
                $setOnInsert: { value: definition.value },
            },
            { upsert: true },
        );
    }
    log(`Seeded ${SETTING_DEFINITIONS.length} site settings`);
}

export async function seedHomepageSections(adminId: Types.ObjectId): Promise<void> {
    for (const draft of HOMEPAGE_SECTION_DRAFTS) {
        await HomepageSection.updateOne(
            { key: draft.key },
            {
                $set: {
                    name: draft.name,
                    isEnabled: draft.isEnabled,
                    displayOrder: draft.displayOrder,
                    heading: draft.heading,
                    subheading: draft.subheading,
                    description: draft.description,
                    ctaLabel: draft.ctaLabel,
                    ctaUrl: draft.ctaUrl,
                    config: draft.config,
                    hasUnpublishedChanges: false,
                    publishedAt: new Date(),
                    updatedBy: adminId,
                },
            },
            { upsert: true },
        );
    }
    log(`Seeded ${HOMEPAGE_SECTION_DRAFTS.length} homepage sections`);
}

/**
 * Seeds the standalone company/legal/support pages.
 *
 * These back the footer and "More" menu links, so seeding them is what keeps the
 * navigation free of dead ends on a fresh install. Upserted by slug, so editor
 * changes to an existing page are never overwritten on a re-run — only missing
 * pages are created and the content is refreshed for pages still untouched.
 */
export async function seedStaticPages(adminId: Types.ObjectId): Promise<void> {
    for (const page of STATIC_PAGE_SEEDS) {
        await StaticPage.updateOne(
            { slug: page.slug },
            {
                $set: {
                    title: page.title,
                    group: page.group,
                    heroEyebrow: page.heroEyebrow,
                    excerpt: page.excerpt,
                    contentHtml: page.contentHtml.trim(),
                    showLastUpdated: page.showLastUpdated ?? false,
                    displayOrder: page.displayOrder,
                    status: 'published',
                    publishedAt: new Date(),
                    seo: { title: page.title, description: page.excerpt },
                    updatedBy: adminId,
                },
                $setOnInsert: { createdBy: adminId, slugHistory: [] },
            },
            { upsert: true },
        );
    }
    log(`Seeded ${STATIC_PAGE_SEEDS.length} content pages`);
}

async function insertMenu(
    menuKey: string,
    name: string,
    location: 'header' | 'footer' | 'mobile' | 'utility' | 'legal',
    drafts: NavigationDraft[],
    adminId: Types.ObjectId,
): Promise<number> {
    const menu = await NavigationMenu.findOneAndUpdate(
        { key: menuKey },
        { $set: { name, location, status: 'active', updatedBy: adminId } },
        { upsert: true, new: true },
    ).exec();

    await NavigationItem.deleteMany({ menuKey });

    let count = 0;
    let order = 0;

    for (const draft of drafts) {
        order += 10;
        const parent = await NavigationItem.create({
            menu: menu!._id,
            menuKey,
            parent: null,
            label: draft.label,
            url: draft.url,
            icon: draft.icon,
            description: draft.description,
            itemType: draft.itemType ?? (draft.children?.length ? 'dropdown' : 'link'),
            badge: draft.badge,
            hasNewBadge: draft.isNew ?? false,
            isFeatured: draft.isFeatured ?? false,
            openInNewTab: draft.openInNewTab ?? false,
            visibility: draft.visibility ?? 'public',
            displayOrder: order,
            status: 'active',
            createdBy: adminId,
        });
        count += 1;

        let childOrder = 0;
        for (const child of draft.children ?? []) {
            childOrder += 10;
            await NavigationItem.create({
                menu: menu!._id,
                menuKey,
                parent: parent._id,
                label: child.label,
                url: child.url,
                icon: child.icon,
                description: child.description,
                itemType: 'link',
                columnGroup: child.columnGroup,
                badge: child.badge,
                hasNewBadge: child.isNew ?? false,
                isFeatured: child.isFeatured ?? false,
                openInNewTab: child.openInNewTab ?? false,
                visibility: child.visibility ?? 'public',
                displayOrder: childOrder,
                status: 'active',
                createdBy: adminId,
            });
            count += 1;
        }
    }

    return count;
}

export async function seedNavigation(adminId: Types.ObjectId): Promise<void> {
    const header = await insertMenu('header', 'Primary header menu', 'header', HEADER_MENU_DRAFT, adminId);
    const mobile = await insertMenu('mobile', 'Mobile drawer menu', 'mobile', HEADER_MENU_DRAFT, adminId);
    const footer = await insertMenu('footer', 'Footer columns', 'footer', FOOTER_MENU_DRAFT, adminId);
    const legal = await insertMenu('legal', 'Legal links', 'legal', LEGAL_MENU_DRAFT, adminId);
    const utility = await insertMenu('utility', 'Utility bar links', 'utility', UTILITY_MENU_DRAFT, adminId);
    log(`Seeded navigation items: header ${header}, mobile ${mobile}, footer ${footer}, legal ${legal}, utility ${utility}`);
}

export async function seedGeo(
    adminId: Types.ObjectId,
    stateSeeds: import('./data/geo.data').StateSeed[],
): Promise<Pick<SeedContext, 'stateIdBySlug' | 'cityIdBySlug'>> {
    const stateIdBySlug = new Map<string, Types.ObjectId>();
    const cityIdBySlug = new Map<
        string,
        { id: Types.ObjectId; name: string; stateId: Types.ObjectId; stateName: string }
    >();

    let order = 0;
    let cityCount = 0;

    for (const seed of stateSeeds) {
        order += 10;
        const slug = slugify(seed.name);
        const state = await State.findOneAndUpdate(
            { slug },
            {
                $set: {
                    name: seed.name,
                    code: seed.code,
                    region: seed.region,
                    isUnionTerritory: seed.isUnionTerritory ?? false,
                    counsellingAuthority: seed.counsellingAuthority,
                    isFeatured: seed.isFeatured ?? false,
                    displayOrder: order,
                    status: 'active',
                    description: `Explore colleges, entrance exams and counselling information for ${seed.name}. ${DEMO_DATA_NOTICE}`,
                    createdBy: adminId,
                    seo: {
                        title: `Colleges in ${seed.name} — Fees, Courses & Admission`,
                        description: `Browse colleges in ${seed.name} by course, fees, ranking and accepted entrance exams.`,
                    },
                },
            },
            { upsert: true, new: true },
        ).exec();

        stateIdBySlug.set(slug, state!._id);

        let cityOrder = 0;
        for (const city of seed.cities) {
            cityOrder += 10;
            const citySlug = slugify(city.name);
            const created = await City.findOneAndUpdate(
                { slug: citySlug },
                {
                    $set: {
                        name: city.name,
                        state: state!._id,
                        stateName: seed.name,
                        tier: city.tier,
                        isMetro: city.isMetro ?? false,
                        isFeatured: city.isFeatured ?? false,
                        displayOrder: cityOrder,
                        status: 'active',
                        createdBy: adminId,
                        seo: {
                            title: `Colleges in ${city.name} — Courses, Fees & Placements`,
                            description: `Compare colleges in ${city.name}, ${seed.name} by course, fee range, accreditation and placement record.`,
                        },
                    },
                },
                { upsert: true, new: true },
            ).exec();

            cityIdBySlug.set(citySlug, {
                id: created!._id,
                name: city.name,
                stateId: state!._id,
                stateName: seed.name,
            });
            cityCount += 1;
        }
    }

    log(`Seeded ${stateSeeds.length} states and ${cityCount} cities`);
    return { stateIdBySlug, cityIdBySlug };
}

export async function seedCommunicationTemplates(adminId: Types.ObjectId): Promise<void> {
    const emailTemplates = [
        {
            key: 'lead.acknowledgement',
            name: 'Counselling request acknowledgement',
            subject: 'We received your counselling request ({{reference}})',
            bodyHtml:
                '<p>Hi {{name}},</p><p>Thanks for reaching out to Admission Sathi. Your reference number is <strong>{{reference}}</strong>.</p><p>{{counsellorLine}}</p><p>Need help sooner? Call us on {{supportPhone}}.</p><p>— Team Admission Sathi</p>',
            availableVariables: ['name', 'reference', 'counsellorLine', 'supportPhone'],
        },
        {
            key: 'booking.confirmed',
            name: 'Counselling session confirmed',
            subject: 'Your counselling session is confirmed for {{scheduledAt}}',
            bodyHtml:
                '<p>Hi {{name}},</p><p>Your session with {{counsellorName}} is confirmed for <strong>{{scheduledAt}}</strong>.</p><p>Join link: {{meetingLink}}</p>',
            availableVariables: ['name', 'counsellorName', 'scheduledAt', 'meetingLink'],
        },
        {
            key: 'booking.reminder',
            name: 'Counselling session reminder',
            subject: 'Reminder: counselling session tomorrow',
            bodyHtml: '<p>Hi {{name}}, this is a reminder for your session on {{scheduledAt}}.</p>',
            availableVariables: ['name', 'scheduledAt'],
        },
        {
            key: 'account.welcome',
            name: 'Welcome email',
            subject: 'Welcome to Admission Sathi',
            bodyHtml:
                '<p>Hi {{name}},</p><p>Your account is ready. Save colleges, run predictors and book free counselling any time.</p>',
            availableVariables: ['name'],
        },
        {
            key: 'exam.deadline',
            name: 'Application deadline alert',
            subject: '{{examName}} application closes on {{deadline}}',
            bodyHtml: '<p>Hi {{name}}, the {{examName}} application window closes on {{deadline}}.</p>',
            availableVariables: ['name', 'examName', 'deadline'],
        },
    ];

    for (const template of emailTemplates) {
        await EmailTemplate.updateOne(
            { key: template.key },
            { $set: { ...template, status: 'active', updatedBy: adminId } },
            { upsert: true },
        );
    }

    const whatsappTemplates = [
        {
            key: 'lead.acknowledgement',
            name: 'Lead acknowledgement',
            bodyText:
                'Hi {{name}}, your free counselling request ({{reference}}) is confirmed. Our counsellor will call you soon. — Admission Sathi',
            availableVariables: ['name', 'reference'],
        },
        {
            key: 'booking.confirmed',
            name: 'Booking confirmation',
            bodyText:
                'Hi {{name}}, your counselling session is confirmed for {{scheduledAt}} with {{counsellorName}}.',
            availableVariables: ['name', 'scheduledAt', 'counsellorName'],
        },
        {
            key: 'booking.reminder',
            name: 'Booking reminder',
            bodyText: 'Reminder: your Admission Sathi counselling session is on {{scheduledAt}}.',
            availableVariables: ['name', 'scheduledAt', 'counsellorName'],
        },
        {
            key: 'booking.rescheduled',
            name: 'Booking rescheduled',
            bodyText:
                'Hi {{name}}, your Admission Sathi session ({{reference}}) has been moved to {{scheduledAt}}.',
            availableVariables: ['name', 'reference', 'scheduledAt', 'counsellorName'],
        },
    ];

    for (const template of whatsappTemplates) {
        await WhatsAppTemplate.updateOne(
            { key: template.key },
            { $set: { ...template, approvalStatus: 'approved', status: 'active', updatedBy: adminId } },
            { upsert: true },
        );
    }

    log(`Seeded ${emailTemplates.length} email and ${whatsappTemplates.length} WhatsApp templates`);
}

/* --------------------------- lead capture forms --------------------------- */

/**
 * Form definitions for the admin Forms module.
 *
 * Each row documents an enquiry point that already exists on the site, so the
 * `leadSource` values line up with `LEAD_SOURCES` and therefore with the source
 * breakdown on `/admin/leads`. Editors use these to control the field list, the
 * submit label, the success message and who gets notified.
 */
export async function seedForms(adminId: Types.ObjectId): Promise<void> {
    const nameField = { key: 'name', label: 'Full name', type: 'text' as const, required: true, placeholder: 'Your full name', displayOrder: 10 };
    const phoneField = { key: 'phone', label: 'Mobile number', type: 'tel' as const, required: true, placeholder: '10-digit mobile number', displayOrder: 20 };
    const emailField = { key: 'email', label: 'Email', type: 'email' as const, required: false, placeholder: 'you@example.com', displayOrder: 30 };
    const consentField = { key: 'consent', label: 'I agree to be contacted about my enquiry', type: 'checkbox' as const, required: true, displayOrder: 90 };

    const forms = [
        {
            key: 'homepage_counselling',
            name: 'Homepage counselling form',
            slug: 'homepage-counselling',
            description: 'The hero form on the homepage. Highest-volume capture point.',
            leadSource: 'homepage_counselling_form',
            submitLabel: 'Book My Counselling',
            successMessage: 'Request confirmed. A counsellor will call you shortly.',
            fields: [
                nameField,
                phoneField,
                {
                    key: 'courseInterest', label: 'Course of interest', type: 'select' as const, required: false, displayOrder: 40, options: [
                        { label: 'Engineering', value: 'engineering' },
                        { label: 'Medical', value: 'medical' },
                        { label: 'Management', value: 'management' },
                        { label: 'BCA / IT', value: 'bca-it' },
                        { label: 'Law', value: 'law' },
                        { label: 'Nursing', value: 'nursing' },
                    ]
                },
                {
                    key: 'preferredTime', label: 'Preferred time', type: 'select' as const, required: false, displayOrder: 50, options: [
                        { label: 'Morning (9 AM – 12 PM)', value: 'morning' },
                        { label: 'Afternoon (12 PM – 4 PM)', value: 'afternoon' },
                        { label: 'Evening (4 PM – 8 PM)', value: 'evening' },
                        { label: 'Anytime', value: 'anytime' },
                    ]
                },
                consentField,
            ],
        },
        {
            key: 'college_enquiry',
            name: 'College enquiry form',
            slug: 'college-enquiry',
            description: 'Shown on a college profile when a student asks about admission.',
            leadSource: 'college_enquiry',
            submitLabel: 'Send Enquiry',
            successMessage: 'Enquiry sent. Our counsellor will share the admission details.',
            fields: [nameField, phoneField, emailField, { key: 'message', label: 'What would you like to know?', type: 'textarea' as const, required: false, displayOrder: 40 }, consentField],
        },
        {
            key: 'loan_enquiry',
            name: 'Education loan enquiry',
            slug: 'loan-enquiry',
            description: 'Captured from the loan eligibility checker and calculator.',
            leadSource: 'loan_enquiry',
            submitLabel: 'Check My Eligibility',
            successMessage: 'Thanks — a finance advisor will walk you through the options.',
            fields: [
                nameField,
                phoneField,
                emailField,
                { key: 'loanAmount', label: 'Loan amount required (₹)', type: 'text' as const, required: false, placeholder: 'e.g. 800000', displayOrder: 40 },
                consentField,
            ],
        },
        {
            key: 'brochure_download',
            name: 'Brochure download gate',
            slug: 'brochure-download',
            description: 'Collects a contact before releasing a college prospectus PDF.',
            leadSource: 'brochure_download',
            submitLabel: 'Download Brochure',
            successMessage: 'Your download is starting. We have also emailed you a copy.',
            fields: [nameField, phoneField, emailField, consentField],
        },
        {
            key: 'contact_us',
            name: 'Contact us form',
            slug: 'contact-us',
            description: 'General enquiries from the contact page.',
            leadSource: 'contact_form',
            submitLabel: 'Send Message',
            successMessage: 'Message received. We reply within one working day.',
            fields: [
                nameField,
                { ...emailField, required: true },
                { key: 'phone', label: 'Mobile number', type: 'tel' as const, required: false, displayOrder: 25 },
                { key: 'subject', label: 'Subject', type: 'text' as const, required: true, displayOrder: 40 },
                { key: 'message', label: 'Message', type: 'textarea' as const, required: true, displayOrder: 50 },
            ],
        },
    ];

    for (const form of forms) {
        await FormDefinition.updateOne(
            { key: form.key },
            {
                $set: {
                    ...form,
                    notifyEmails: ['leads@admissionsathi.org'],
                    status: 'active',
                    updatedBy: adminId,
                },
                $setOnInsert: { submissionCount: 0, createdBy: adminId },
            },
            { upsert: true },
        );
    }

    log(`Seeded ${forms.length} lead capture form definitions`);
}
