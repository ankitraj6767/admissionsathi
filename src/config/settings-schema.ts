import type { SiteSettingDoc } from '@/db/models/site.model';
import { siteConfig } from './site';

export type SettingDefinition = Pick<
    SiteSettingDoc,
    'key' | 'group' | 'label' | 'valueType' | 'isPublic' | 'isSecret' | 'displayOrder'
> & { value: unknown; description?: string };

/**
 * Canonical list of editable site settings.
 * The seed script inserts these; the admin Settings module edits them; the
 * public site reads them through `settings.service` with these values as fallback.
 */
export const SETTING_DEFINITIONS: SettingDefinition[] = [
    // ---------------- general ----------------
    { key: 'site.name', group: 'general', label: 'Site name', valueType: 'string', value: siteConfig.name, isPublic: true, isSecret: false, displayOrder: 1 },
    { key: 'site.tagline', group: 'general', label: 'Tagline', valueType: 'string', value: siteConfig.tagline, isPublic: true, isSecret: false, displayOrder: 2 },
    { key: 'site.logoUrl', group: 'general', label: 'Logo URL', valueType: 'image', value: '/brand/logo.svg', isPublic: true, isSecret: false, displayOrder: 3 },
    { key: 'site.logoDarkUrl', group: 'general', label: 'Logo (dark background)', valueType: 'image', value: '/brand/logo-light.svg', isPublic: true, isSecret: false, displayOrder: 4 },
    { key: 'site.faviconUrl', group: 'general', label: 'Favicon URL', valueType: 'image', value: '/icon.svg', isPublic: true, isSecret: false, displayOrder: 5 },
    { key: 'site.footerAbout', group: 'general', label: 'Footer brand summary', valueType: 'richtext', value: 'Admission Sathi is an independent education discovery and counselling platform. We help students shortlist courses and colleges, understand entrance exams, estimate admission chances and plan education finance — with free expert guidance at every step.', isPublic: true, isSecret: false, displayOrder: 6 },
    { key: 'site.copyright', group: 'general', label: 'Copyright line', valueType: 'string', value: `© ${new Date().getFullYear()} Admission Sathi. All rights reserved.`, isPublic: true, isSecret: false, displayOrder: 7 },

    // ---------------- utility bar / contact ----------------
    { key: 'utility.message', group: 'contact', label: 'Utility bar message', valueType: 'string', value: siteConfig.defaults.utilityMessage, isPublic: true, isSecret: false, displayOrder: 10 },
    { key: 'utility.showDownloadApp', group: 'contact', label: 'Show "Download App"', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 11 },
    { key: 'contact.phone', group: 'contact', label: 'Support phone', valueType: 'string', value: siteConfig.defaults.supportPhone, isPublic: true, isSecret: false, displayOrder: 12 },
    { key: 'contact.email', group: 'contact', label: 'Support email', valueType: 'string', value: siteConfig.defaults.supportEmail, isPublic: true, isSecret: false, displayOrder: 13 },
    { key: 'contact.whatsappNumber', group: 'contact', label: 'WhatsApp number', valueType: 'string', value: '+919155555555', isPublic: true, isSecret: false, displayOrder: 14 },
    { key: 'contact.address', group: 'contact', label: 'Office address', valueType: 'string', value: 'Admission Sathi, 4th Floor, Education Hub, Patna, Bihar 800001', isPublic: true, isSecret: false, displayOrder: 15 },
    { key: 'contact.workingHours', group: 'contact', label: 'Working hours', valueType: 'string', value: 'Mon – Sat, 9:00 AM to 8:00 PM IST', isPublic: true, isSecret: false, displayOrder: 16 },

    // ---------------- app links ----------------
    { key: 'app.androidUrl', group: 'app', label: 'Android app URL', valueType: 'string', value: siteConfig.defaults.androidUrl, isPublic: true, isSecret: false, displayOrder: 20 },
    { key: 'app.iosUrl', group: 'app', label: 'iOS app URL', valueType: 'string', value: siteConfig.defaults.iosUrl, isPublic: true, isSecret: false, displayOrder: 21 },

    // ---------------- social ----------------
    { key: 'social.facebook', group: 'social', label: 'Facebook URL', valueType: 'string', value: 'https://facebook.com/', isPublic: true, isSecret: false, displayOrder: 30 },
    { key: 'social.instagram', group: 'social', label: 'Instagram URL', valueType: 'string', value: 'https://instagram.com/', isPublic: true, isSecret: false, displayOrder: 31 },
    { key: 'social.youtube', group: 'social', label: 'YouTube URL', valueType: 'string', value: 'https://youtube.com/', isPublic: true, isSecret: false, displayOrder: 32 },
    { key: 'social.linkedin', group: 'social', label: 'LinkedIn URL', valueType: 'string', value: 'https://linkedin.com/', isPublic: true, isSecret: false, displayOrder: 33 },
    { key: 'social.twitter', group: 'social', label: 'X / Twitter URL', valueType: 'string', value: 'https://x.com/', isPublic: true, isSecret: false, displayOrder: 34 },
    { key: 'social.telegram', group: 'social', label: 'Telegram URL', valueType: 'string', value: 'https://t.me/', isPublic: true, isSecret: false, displayOrder: 35 },

    // ---------------- whatsapp community ----------------
    { key: 'whatsapp.enabled', group: 'whatsapp', label: 'Enable WhatsApp community panel', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 40 },
    { key: 'whatsapp.title', group: 'whatsapp', label: 'Community panel title', valueType: 'string', value: 'Join Our WhatsApp Community', isPublic: true, isSecret: false, displayOrder: 41 },
    { key: 'whatsapp.description', group: 'whatsapp', label: 'Community panel description', valueType: 'string', value: 'Get updates, alerts, PDFs & counselling tips directly!', isPublic: true, isSecret: false, displayOrder: 42 },
    { key: 'whatsapp.groupUrl', group: 'whatsapp', label: 'Community invite link', valueType: 'string', value: siteConfig.defaults.whatsappCommunityUrl, isPublic: true, isSecret: false, displayOrder: 43 },
    { key: 'whatsapp.qrImageUrl', group: 'whatsapp', label: 'QR code image', valueType: 'image', value: '/brand/whatsapp-qr.svg', isPublic: true, isSecret: false, displayOrder: 44 },
    { key: 'whatsapp.campaign', group: 'whatsapp', label: 'Campaign tag', valueType: 'string', value: 'homepage_community', isPublic: true, isSecret: false, displayOrder: 45 },

    // ---------------- AI assistant ----------------
    { key: 'ai.enabled', group: 'ai', label: 'Enable AI assistant', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 50 },
    { key: 'ai.title', group: 'ai', label: 'AI panel title', valueType: 'string', value: 'Ask Admission Sathi AI', isPublic: true, isSecret: false, displayOrder: 51 },
    { key: 'ai.placeholder', group: 'ai', label: 'Input placeholder', valueType: 'string', value: 'Type your question…', isPublic: true, isSecret: false, displayOrder: 52 },
    { key: 'ai.greeting', group: 'ai', label: 'Greeting message', valueType: 'string', value: 'Get instant answers to all your admission & career related questions.', isPublic: true, isSecret: false, displayOrder: 53 },
    { key: 'ai.disclaimer', group: 'ai', label: 'AI disclaimer', valueType: 'string', value: 'AI answers are generated from Admission Sathi content and may be incomplete. Verify important details with official sources or book a free counselling session.', isPublic: true, isSecret: false, displayOrder: 54 },
    { key: 'ai.systemPrompt', group: 'ai', label: 'System prompt', valueType: 'richtext', value: 'You are Admission Sathi AI, an expert admission and career guidance assistant. Use the provided Admission Sathi context for website-specific facts and cite its links. When no relevant website context is available, answer benign general questions clearly as general guidance; never invent Admission Sathi pages, statistics, fees, cut-offs or eligibility rules.', isPublic: false, isSecret: false, displayOrder: 55 },

    // ---------------- features ----------------
    { key: 'features.compareMaxColleges', group: 'features', label: 'Max colleges in comparison', valueType: 'number', value: 4, isPublic: true, isSecret: false, displayOrder: 60 },
    { key: 'features.reviewsEnabled', group: 'features', label: 'Enable college reviews', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 61 },
    { key: 'features.stickyCtaEnabled', group: 'features', label: 'Enable sticky bottom CTA', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 62 },
    { key: 'features.newsletterEnabled', group: 'features', label: 'Enable newsletter', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 63 },
    { key: 'features.leadAutoAssign', group: 'features', label: 'Auto-assign leads to counsellors', valueType: 'boolean', value: true, isPublic: false, isSecret: false, displayOrder: 64 },
    { key: 'features.demoDataBanner', group: 'features', label: 'Show demonstration-data banner', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 65 },

    // ---------------- seo ----------------
    { key: 'seo.defaultTitle', group: 'seo', label: 'Default meta title', valueType: 'string', value: 'Admission Sathi — Courses, Colleges, Exams & Free Counselling', isPublic: true, isSecret: false, displayOrder: 70 },
    { key: 'seo.defaultDescription', group: 'seo', label: 'Default meta description', valueType: 'string', value: siteConfig.description, isPublic: true, isSecret: false, displayOrder: 71 },
    { key: 'seo.defaultOgImage', group: 'seo', label: 'Default OG image', valueType: 'image', value: '/brand/og-default.png', isPublic: true, isSecret: false, displayOrder: 72 },
    { key: 'seo.organizationName', group: 'seo', label: 'Organization name (schema)', valueType: 'string', value: 'Admission Sathi', isPublic: true, isSecret: false, displayOrder: 73 },
    { key: 'seo.robotsAllowAll', group: 'seo', label: 'Allow indexing', valueType: 'boolean', value: true, isPublic: true, isSecret: false, displayOrder: 74 },

    // ---------------- legal ----------------
    { key: 'legal.consentText', group: 'legal', label: 'Lead consent text', valueType: 'string', value: 'I agree to be contacted by Admission Sathi counsellors over call, WhatsApp, SMS and email regarding admissions and related services.', isPublic: true, isSecret: false, displayOrder: 80 },
    { key: 'legal.consentVersion', group: 'legal', label: 'Consent version', valueType: 'string', value: 'v1', isPublic: true, isSecret: false, displayOrder: 81 },
    { key: 'legal.dataNotice', group: 'legal', label: 'Data accuracy notice', valueType: 'string', value: 'Fees, cut-offs, rankings and placement figures are collected from public sources and may change. Always confirm with the official institute or authority.', isPublic: true, isSecret: false, displayOrder: 82 },
];

export const SETTING_KEYS = SETTING_DEFINITIONS.map((s) => s.key);

export const SETTING_DEFAULTS: Record<string, unknown> = Object.fromEntries(
    SETTING_DEFINITIONS.map((s) => [s.key, s.value]),
);
