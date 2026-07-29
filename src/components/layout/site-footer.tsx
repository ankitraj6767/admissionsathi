import Link from 'next/link';
import { faFacebookF } from '@fortawesome/free-brands-svg-icons/faFacebookF';
import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
import { faLinkedinIn } from '@fortawesome/free-brands-svg-icons/faLinkedinIn';
import { faTelegram } from '@fortawesome/free-brands-svg-icons/faTelegram';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons/faXTwitter';
import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
import type { IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import { getMenu } from '@/services/navigation.service';
import { getSettings, readBool, readString } from '@/services/settings.service';
import { getFooterCityLinks, getFooterStateLinks } from '@/services/geo.service';
import { BrandIcon } from '@/components/ui/brand-icon';
import { Icon } from '@/components/ui/icon';
import { resolveBranding } from '@/lib/branding';

const SOCIALS: { key: string; label: string; icon: IconDefinition }[] = [
    { key: 'social.facebook', label: 'Facebook', icon: faFacebookF },
    { key: 'social.instagram', label: 'Instagram', icon: faInstagram },
    { key: 'social.youtube', label: 'YouTube', icon: faYoutube },
    { key: 'social.linkedin', label: 'LinkedIn', icon: faLinkedinIn },
    { key: 'social.twitter', label: 'X', icon: faXTwitter },
    { key: 'social.telegram', label: 'Telegram', icon: faTelegram },
];

/**
 * Directory indexes for the SEO landing pages.
 *
 * These are route-level, not content rows, so they are declared here rather than
 * managed as a navigation menu — a missing menu record should never make a
 * published landing page unreachable.
 */
const DIRECTORY_LINKS = [
    { label: 'Colleges by state', href: '/colleges/state' },
    { label: 'Colleges by city', href: '/colleges/city' },
    { label: 'Colleges by course', href: '/colleges/course' },
    { label: 'Colleges by exam', href: '/colleges/exam' },
    { label: 'Courses by stream', href: '/courses/category' },
    { label: 'Courses by level', href: '/courses/level' },
    { label: 'Exams by category', href: '/exams/category' },
    { label: 'Scholarships by course', href: '/scholarships/course' },
    { label: 'Counselling by state', href: '/counselling/state' },
];

/** Full site footer — every column, link and contact detail comes from MongoDB. */
export async function SiteFooter() {
    // All five are cached reads, so the footer costs no database round trips on a
    // warm cache even though it renders on every public page.
    const [settings, columns, legal, states, cities] = await Promise.all([
        getSettings(),
        getMenu('footer'),
        getMenu('legal'),
        getFooterStateLinks(),
        getFooterCityLinks(),
    ]);

    const about = readString(settings, 'site.footerAbout', '');
    const phone = readString(settings, 'contact.phone', '');
    const email = readString(settings, 'contact.email', '');
    const address = readString(settings, 'contact.address', '');
    const copyright = readString(settings, 'site.copyright', '');
    const dataNotice = readString(settings, 'legal.dataNotice', '');
    const newsletterEnabled = readBool(settings, 'features.newsletterEnabled', true);
    const androidUrl = readString(settings, 'app.androidUrl', '#');
    const iosUrl = readString(settings, 'app.iosUrl', '#');
    const branding = resolveBranding(settings);

    return (
        <footer className="mt-10 border-t border-navy-800 bg-navy-800 text-white/85">
            <div className="shell py-10">
                <div className="grid gap-8 lg:grid-cols-[minmax(260px,1.15fr)_2.6fr]">
                    {/* Brand + contact */}
                    <div>
                        <BrandLogo variant="dark" branding={branding} />
                        <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-white/70">{about}</p>

                        <div className="mt-4 space-y-2 text-[12.5px]">
                            {phone ? (
                                <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white">
                                    <Phone className="h-3.5 w-3.5 text-orange" aria-hidden />
                                    {phone}
                                </a>
                            ) : null}
                            {email ? (
                                <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white">
                                    <Mail className="h-3.5 w-3.5 text-orange" aria-hidden />
                                    {email}
                                </a>
                            ) : null}
                            {address ? (
                                <p className="flex items-start gap-2 text-white/70">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" aria-hidden />
                                    {address}
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {SOCIALS.map((social) => {
                                const url = readString(settings, social.key, '');
                                if (!url) return null;
                                return (
                                    <a
                                        key={social.key}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.label}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-orange/60 hover:text-white"
                                    >
                                        <BrandIcon icon={social.icon} className="h-4 w-4" />
                                    </a>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex gap-2">
                            <a
                                href={androidUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/5 px-3 py-2 text-[11.5px] font-semibold hover:border-white/30"
                            >
                                <Icon name="Play" className="h-3.5 w-3.5 text-green" />
                                Android App
                            </a>
                            <a
                                href={iosUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/5 px-3 py-2 text-[11.5px] font-semibold hover:border-white/30"
                            >
                                <Icon name="Apple" className="h-3.5 w-3.5" />
                                iOS App
                            </a>
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                        {columns.map((column) => (
                            <div key={column.id}>
                                <p className="mb-2.5 text-[12px] font-bold uppercase tracking-wider text-white">
                                    {column.label}
                                </p>
                                <ul className="space-y-1.5">
                                    {column.children.map((link) => (
                                        <li key={link.id}>
                                            <Link
                                                href={link.url}
                                                className="text-[12.5px] text-white/70 transition-colors hover:text-orange"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Newsletter */}
                {newsletterEnabled ? (
                    <div className="mt-8 grid gap-4 rounded-panel border border-white/10 bg-white/5 p-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                        <div>
                            <p className="text-[15px] font-bold text-white">
                                Get admission alerts before everyone else
                            </p>
                            <p className="mt-1 text-[12.5px] text-white/70">
                                Exam dates, counselling schedules, scholarship deadlines and cut-off updates — straight
                                to your inbox. No spam.
                            </p>
                        </div>
                        <NewsletterForm />
                    </div>
                ) : null}

                {/* SEO landing links */}
                {states.length > 0 || cities.length > 0 ? (
                    <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                        {states.length > 0 ? (
                            <div>
                                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                                    Colleges by state
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                                    {states.map((state) => (
                                        <Link
                                            key={state.id}
                                            href={`/colleges/state/${state.slug}`}
                                            className="text-[11.5px] text-white/60 hover:text-orange"
                                        >
                                            Colleges in {state.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {cities.length > 0 ? (
                            <div>
                                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                                    Colleges by city
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                                    {cities.map((city) => (
                                        <Link
                                            key={city.id}
                                            href={`/colleges/city/${city.slug}`}
                                            className="text-[11.5px] text-white/60 hover:text-orange"
                                        >
                                            Colleges in {city.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Directory indexes. Kept in the footer so every landing
                            page is reachable by a crawler from any page. */}
                        <div>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                                Browse directories
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                                {DIRECTORY_LINKS.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-[11.5px] text-white/60 hover:text-orange"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}

                {dataNotice ? (
                    <p className="mt-6 rounded-[12px] border border-white/10 bg-navy-900/60 p-3 text-[11.5px] leading-relaxed text-white/60">
                        {dataNotice}
                    </p>
                ) : null}
            </div>

            <div className="border-t border-white/10 bg-navy-900">
                <div className="shell flex flex-col items-center justify-between gap-2 py-4 text-[11.5px] text-white/60 md:flex-row">
                    <p>{copyright}</p>
                    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {legal.map((item) => (
                            <li key={item.id}>
                                <Link href={item.url} className="hover:text-orange">
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    );
}
