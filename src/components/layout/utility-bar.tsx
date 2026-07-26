import Link from 'next/link';
import { Mail, Phone, ShieldCheck, Smartphone } from 'lucide-react';
import { readBool, readString, type PublicSettings } from '@/services/settings.service';

/** Thin top utility bar: trust message, app links, email and phone. */
export function UtilityBar({ settings }: { settings: PublicSettings }) {
    const message = readString(settings, 'utility.message', '');
    const showApp = readBool(settings, 'utility.showDownloadApp', true);
    const androidUrl = readString(settings, 'app.androidUrl', '#');
    const iosUrl = readString(settings, 'app.iosUrl', '#');
    const email = readString(settings, 'contact.email', '');
    const phone = readString(settings, 'contact.phone', '');

    return (
        <div className="hidden border-b border-line bg-white lg:block">
            <div className="header-shell flex h-9 items-center justify-between gap-4 text-[11.5px] text-ink-soft">
                <p className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-navy-600" aria-hidden />
                    <span className="text-ink">{message}</span>
                </p>

                <div className="flex items-center gap-5">
                    {showApp ? (
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                            <span className="font-semibold text-ink">Download App</span>
                            <Link
                                href={androidUrl}
                                aria-label="Download the Admission Sathi Android app"
                                className="inline-flex items-center rounded p-0.5 hover:bg-muted"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                                    <path
                                        fill="#21A663"
                                        d="M4.5 3.2 15.3 9 4.5 20.8c-.3-.2-.5-.6-.5-1V4.2c0-.4.2-.8.5-1Z"
                                    />
                                    <path fill="#0AA39A" d="m16.7 9.8 3.1 1.7c.7.4.7 1.6 0 2l-3.1 1.7L13.9 12l2.8-2.2Z" />
                                </svg>
                            </Link>
                            <Link
                                href={iosUrl}
                                aria-label="Download the Admission Sathi iOS app"
                                className="inline-flex items-center rounded p-0.5 hover:bg-muted"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink" aria-hidden fill="currentColor">
                                    <path d="M16.4 12.5c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.3-.1-2.5.7-3.1.7-.7 0-1.7-.7-2.8-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.1ZM14.3 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
                                </svg>
                            </Link>
                        </div>
                    ) : null}

                    {email ? (
                        <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-navy-700">
                            <Mail className="h-3.5 w-3.5 text-navy-600" aria-hidden />
                            <span>{email}</span>
                        </a>
                    ) : null}

                    {phone ? (
                        <a
                            href={`tel:${phone.replace(/\s/g, '')}`}
                            className="flex items-center gap-1.5 font-semibold text-ink hover:text-orange"
                            data-analytics="phone_click"
                        >
                            <Phone className="h-3.5 w-3.5 text-green" aria-hidden />
                            <span>{phone}</span>
                        </a>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
