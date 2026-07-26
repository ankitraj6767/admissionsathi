'use client';

import Image from 'next/image';
import { track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

/** WhatsApp community CTA with campaign tracking and optional QR code. */
export function WhatsappPanel({
    title,
    description,
    ctaLabel,
    groupUrl,
    qrImageUrl,
    campaign,
    showQr,
}: {
    title: string;
    description?: string;
    ctaLabel: string;
    groupUrl: string;
    qrImageUrl?: string;
    campaign?: string;
    showQr: boolean;
}) {
    const href = campaign
        ? `${groupUrl}${groupUrl.includes('?') ? '&' : '?'}utm_source=website&utm_campaign=${encodeURIComponent(campaign)}`
        : groupUrl;

    return (
        <section
            aria-labelledby="whatsapp-heading"
            className="relative overflow-hidden rounded-panel bg-purple p-4 text-white shadow-raised"
        >
            <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-6 h-32 w-32 rounded-full bg-white/10" />

            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 id="whatsapp-heading" className="text-[13.5px] font-extrabold leading-tight">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-1 text-[10.5px] leading-relaxed text-white/85">{description}</p>
                    ) : null}

                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                            track({
                                name: ANALYTICS_EVENTS.whatsappClick,
                                properties: { placement: 'homepage_community', campaign: campaign ?? '' },
                            })
                        }
                        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[11.5px] font-bold text-purple transition-transform hover:-translate-y-0.5"
                    >
                        {ctaLabel}
                    </a>
                </div>

                {showQr && qrImageUrl ? (
                    <span className="hidden shrink-0 rounded-[10px] bg-white p-1.5 sm:inline-flex">
                        <Image
                            src={qrImageUrl}
                            alt="QR code to join the Admission Sathi WhatsApp community"
                            width={56}
                            height={56}
                            className="h-14 w-14"
                        />
                    </span>
                ) : (
                    <span aria-hidden className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor" aria-hidden>
                            <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.94.56 3.75 1.53 5.28L2 22l5.03-1.68a9.9 9.9 0 0 0 5.01 1.36c5.44 0 9.84-4.4 9.84-9.84C21.88 6.4 17.48 2 12.04 2Zm5.68 13.93c-.24.67-1.4 1.29-1.93 1.34-.53.06-1.03.24-3.5-.73-2.9-1.14-4.71-4.15-4.85-4.34-.14-.2-1.13-1.5-1.13-2.87 0-1.36.71-2.03.96-2.31.25-.28.55-.35.73-.35.18 0 .36 0 .52.01.17.01.4-.06.62.47.22.53.76 1.85.83 1.98.07.14.11.3.02.48-.09.18-.7.9-.7.9-.13.16-.27.33-.12.6.15.26.68 1.12 1.46 1.82 1 .9 1.85 1.18 2.11 1.31.26.14.42.11.57-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.61-.13.25.09 1.57.74 1.84.87.27.13.45.2.52.31.07.11.07.65-.17 1.32Z" />
                        </svg>
                    </span>
                )}
            </div>
        </section>
    );
}
