import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { ContactForm } from '@/components/forms/contact-form';
import { getSettings, readString } from '@/services/settings.service';
import { siteConfig } from '@/config/site';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildOrganizationJsonLd } from '@/lib/seo/json-ld';
import type { BreadcrumbItem } from '@/types/common';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Contact Admission Sathi — Support, Counselling & Partnerships',
    description:
        'Talk to the Admission Sathi team. Call or WhatsApp our counsellors, email support, or send us a message about admissions, exams, education loans and partnerships.',
    path: '/contact',
    keywords: ['contact admission sathi', 'admission helpline', 'counselling support'],
});

const BREADCRUMBS: BreadcrumbItem[] = [{ label: 'Home', href: '/' }, { label: 'Contact us' }];

/** Strips spaces and dashes so a display number is safe inside tel:/wa.me links. */
function dialable(value: string): string {
    return value.replace(/[^\d+]/g, '');
}

export default async function ContactPage() {
    const settings = await getSettings();

    const phone = readString(settings, 'contact.phone', siteConfig.defaults.supportPhone);
    const email = readString(settings, 'contact.email', siteConfig.defaults.supportEmail);
    const whatsapp = readString(settings, 'contact.whatsappNumber', phone);
    const address = readString(settings, 'contact.address', 'Admission Sathi, Patna, Bihar, India');
    const hours = readString(settings, 'contact.workingHours', 'Mon – Sat, 9:00 AM to 8:00 PM IST');
    const consentText = readString(
        settings,
        'legal.consentText',
        'I agree to be contacted by Admission Sathi regarding my enquiry.',
    );

    return (
        <>
            <JsonLd
                data={[
                    buildOrganizationJsonLd(settings),
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Contact us', href: '/contact' },
                    ]),
                ]}
            />

            <PageHeader
                eyebrow="We reply within a working day"
                title="Contact Admission Sathi"
                description="Questions about admissions, entrance exams, education loans or a partnership? Reach the team directly — no bots, no call centres."
                breadcrumbs={BREADCRUMBS}
            />

            <div className="shell py-6">
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <ContactForm consentText={consentText} />

                    <aside className="space-y-4">
                        <SectionCard title="Talk to us" icon="Headphones" description={hours}>
                            <ul className="space-y-2.5">
                                <li className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5">
                                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden />
                                    <span className="min-w-0">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                                            Phone
                                        </span>
                                        <a
                                            href={`tel:${dialable(phone)}`}
                                            className="block break-words text-[14px] font-extrabold text-navy-700 hover:text-orange"
                                        >
                                            {phone}
                                        </a>
                                    </span>
                                </li>

                                <li className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5">
                                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                                    <span className="min-w-0">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                                            WhatsApp
                                        </span>
                                        <a
                                            href={`https://wa.me/${dialable(whatsapp).replace(/^\+/, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block break-words text-[13.5px] font-bold text-navy-700 hover:text-orange"
                                        >
                                            Chat with a counsellor
                                        </a>
                                    </span>
                                </li>

                                <li className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5">
                                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden />
                                    <span className="min-w-0">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                                            Email
                                        </span>
                                        <a
                                            href={`mailto:${email}`}
                                            className="block break-words text-[13.5px] font-bold text-navy-700 hover:text-orange"
                                        >
                                            {email}
                                        </a>
                                    </span>
                                </li>

                                <li className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden />
                                    <span className="min-w-0">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                                            Office
                                        </span>
                                        <span className="block text-[12.5px] leading-relaxed text-ink">{address}</span>
                                    </span>
                                </li>

                                <li className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5">
                                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden />
                                    <span className="min-w-0">
                                        <span className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                                            Support hours
                                        </span>
                                        <span className="block text-[12.5px] leading-relaxed text-ink">{hours}</span>
                                    </span>
                                </li>
                            </ul>
                        </SectionCard>

                        <SectionCard title="Faster routes" icon="Sparkles">
                            <ul className="space-y-2 text-[12.5px]">
                                <li>
                                    <Link
                                        href="/faqs"
                                        className="flex min-h-11 items-center rounded-[10px] border border-line px-3 font-semibold text-ink transition-colors hover:border-navy-200 hover:bg-muted/60"
                                    >
                                        Read the FAQs
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/book-counselling"
                                        className="flex min-h-11 items-center rounded-[10px] border border-line px-3 font-semibold text-ink transition-colors hover:border-navy-200 hover:bg-muted/60"
                                    >
                                        Book free counselling
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/resources"
                                        className="flex min-h-11 items-center rounded-[10px] border border-line px-3 font-semibold text-ink transition-colors hover:border-navy-200 hover:bg-muted/60"
                                    >
                                        Browse study resources
                                    </Link>
                                </li>
                            </ul>
                            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
                                We are an independent guidance platform. We never charge students for counselling.
                            </p>
                        </SectionCard>
                    </aside>
                </div>
            </div>
        </>
    );
}
