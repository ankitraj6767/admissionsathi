'use client';

import Link from 'next/link';
import { CalendarCheck, MessageCircle, Phone } from 'lucide-react';
import { track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

/**
 * Sticky bottom counselling CTA.
 * Always stays at the bottom of the homepage while its matching body offset
 * keeps the footer reachable above it.
 */
export function StickyCta({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    phone,
    whatsappUrl,
    showCall,
    showWhatsapp,
    callLabel,
    whatsappLabel,
    whatsappSubLabel,
}: {
    heading: string;
    description?: string;
    ctaLabel: string;
    ctaUrl: string;
    phone?: string;
    whatsappUrl?: string;
    showCall: boolean;
    showWhatsapp: boolean;
    callLabel: string;
    whatsappLabel: string;
    whatsappSubLabel: string;
}) {
    return (
        <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-900/40 bg-navy-800/98 pb-[env(safe-area-inset-bottom)] backdrop-blur"
            role="region"
            aria-label="Counselling call to action"
            data-home-sticky-cta
        >
            <div className="shell flex items-center justify-between gap-3 py-2.5">
                <div className="hidden min-w-0 md:block">
                    <p className="truncate text-[13px] font-extrabold text-white">{heading}</p>
                    {description ? (
                        <p className="truncate text-[11px] text-white/70">{description}</p>
                    ) : null}
                </div>

                <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-end">
                    {showCall && phone ? (
                        <a
                            href={`tel:${phone.replace(/\s/g, '')}`}
                            onClick={() => track({ name: ANALYTICS_EVENTS.phoneClick, properties: { placement: 'sticky_cta' } })}
                            className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-2 text-white"
                        >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12">
                                <Phone className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            <span className="hidden leading-tight sm:block">
                                <span className="block text-[9.5px] text-white/60">{callLabel}</span>
                                <span className="block text-[11.5px] font-bold">{phone}</span>
                            </span>
                        </a>
                    ) : null}

                    {showWhatsapp && whatsappUrl ? (
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                                track({ name: ANALYTICS_EVENTS.whatsappClick, properties: { placement: 'sticky_cta' } })
                            }
                            className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-2 text-white"
                        >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green/25">
                                <MessageCircle className="h-3.5 w-3.5 text-green" aria-hidden />
                            </span>
                            <span className="hidden leading-tight sm:block">
                                <span className="block text-[9.5px] text-white/60">{whatsappLabel}</span>
                                <span className="block text-[11.5px] font-bold">{whatsappSubLabel}</span>
                            </span>
                        </a>
                    ) : null}

                    <Link
                        href={ctaUrl}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-orange px-4 text-[12.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(255,107,23,0.9)] transition-colors hover:bg-orange-600 md:flex-none"
                    >
                        {ctaLabel}
                        <CalendarCheck className="h-4 w-4" aria-hidden />
                    </Link>
                </div>
            </div>
        </div>
    );
}
