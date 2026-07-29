import Image from 'next/image';
import { Check, Smartphone } from 'lucide-react';
import { SafeLink } from '@/components/shared/safe-link';
import { BrandIcon } from '@/components/ui/brand-icon';
import { faApple } from '@fortawesome/free-brands-svg-icons/faApple';
import { faGooglePlay } from '@fortawesome/free-brands-svg-icons/faGooglePlay';
import { cn } from '@/lib/utils';
import type { AppDownloadConfig } from '@/schemas/homepage.schema';

const TONE_CLASSES: Record<string, string> = {
    navy: 'from-navy-800 to-navy-900',
    teal: 'from-teal to-navy-800',
    purple: 'from-purple to-navy-800',
    orange: 'from-orange to-orange-700',
    green: 'from-green to-teal-600',
    pink: 'from-pink to-purple',
    blue: 'from-blue to-navy-800',
};

/**
 * App download band.
 *
 * Store links come from site settings rather than this section's config, so they stay
 * in step with the top utility bar and the footer. Ships disabled by default: an
 * install prompt for an app that is not published yet costs more trust than it earns,
 * so an editor turns it on when the listings are live.
 */
export function AppDownloadSection({
    heading,
    description,
    config,
    androidUrl,
    iosUrl,
    qrImageUrl,
}: {
    heading: string;
    description?: string;
    config: AppDownloadConfig;
    androidUrl?: string;
    iosUrl?: string;
    qrImageUrl?: string;
}) {
    // Nothing to send anyone to — render nothing rather than a dead band.
    if (!androidUrl && !iosUrl) return null;

    return (
        <section
            aria-labelledby="app-download-heading"
            className={cn(
                'relative overflow-hidden rounded-panel bg-gradient-to-br p-5 text-white shadow-card md:p-6',
                TONE_CLASSES[config.tone] ?? TONE_CLASSES.navy,
            )}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/5"
            />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider">
                        <Smartphone className="h-3 w-3" aria-hidden />
                        Mobile app
                    </p>
                    <h2 id="app-download-heading" className="font-display text-[20px] font-extrabold leading-tight md:text-[24px]">
                        {heading}
                    </h2>
                    {description ? (
                        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/80">{description}</p>
                    ) : null}

                    {config.highlights.length > 0 ? (
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {config.highlights.map((item) => (
                                <li key={item} className="flex items-start gap-1.5 text-[12px] text-white/85">
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" aria-hidden />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    {config.showQr && qrImageUrl ? (
                        <Image
                            src={qrImageUrl}
                            alt="QR code to download the Admission Sathi app"
                            width={92}
                            height={92}
                            className="h-[92px] w-[92px] rounded-[12px] bg-white p-1.5"
                        />
                    ) : null}

                    <div className="flex flex-col gap-2">
                        {androidUrl ? (
                            <SafeLink
                                href={androidUrl}
                                showIcon={false}
                                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800 transition-transform hover:-translate-y-0.5"
                            >
                                <BrandIcon icon={faGooglePlay} className="h-4 w-4" />
                                Google Play
                            </SafeLink>
                        ) : null}
                        {iosUrl ? (
                            <SafeLink
                                href={iosUrl}
                                showIcon={false}
                                className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/30 bg-white/10 px-4 text-[13px] font-bold text-white transition-colors hover:bg-white/20"
                            >
                                <BrandIcon icon={faApple} className="h-4 w-4" />
                                App Store
                            </SafeLink>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
