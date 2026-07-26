import Link from 'next/link';
import { BrandLogo } from '@/components/layout/brand-logo';
import { siteConfig } from '@/config/site';
import { getSettings, readString } from '@/services/settings.service';
import { resolveBranding } from '@/lib/branding';

const HIGHLIGHTS = [
    'Save colleges, courses and comparisons in one place',
    'Track predictor runs and counselling sessions',
    'Get deadline alerts for your target exams',
    'Free one-to-one counselling, whenever you need it',
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const settings = await getSettings();
    const branding = resolveBranding(settings);
    const description = readString(settings, 'seo.defaultDescription', siteConfig.description);

    return (
        <div className="min-h-dvh bg-page">
            <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
                {/* Brand panel */}
                <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy-800 p-10 text-white lg:flex">
                    <div aria-hidden className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-white/5" />
                    <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-orange/10" />

                    <BrandLogo variant="dark" branding={branding} />

                    <div className="relative max-w-md">
                        <h2 className="font-display text-[26px] font-extrabold leading-tight">
                            Your career decisions deserve better than guesswork.
                        </h2>
                        <p className="mt-3 text-[13px] leading-relaxed text-white/75">
                            {description}
                        </p>

                        <ul className="mt-6 space-y-2.5">
                            {HIGHLIGHTS.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-[13px] text-white/85">
                                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green text-[10px] font-bold text-white">
                                        ✓
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="relative text-[11.5px] text-white/50">
                        © {new Date().getFullYear()} {branding.name}. {branding.tagline}.
                    </p>
                </aside>

                {/* Form panel */}
                <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
                    <div className="mx-auto w-full max-w-[400px]">
                        <div className="mb-6 lg:hidden">
                            <BrandLogo branding={branding} />
                        </div>
                        {children}
                        <p className="mt-8 text-center text-[11.5px] text-ink-soft">
                            <Link href="/" className="font-semibold text-navy-600 hover:text-orange">
                                ← Back to {branding.name}
                            </Link>
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
