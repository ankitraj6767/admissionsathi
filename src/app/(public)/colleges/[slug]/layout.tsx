import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CollegeHero } from '@/components/colleges/college-hero';
import { getCollegeDetail } from '@/services/college.service';
import { incrementViewCount } from '@/services/analytics.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildCollegeJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';
import { getSettings, readString } from '@/services/settings.service';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}

export const revalidate = 600;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) {
        return buildMetadata({ title: 'College not found', path: `/colleges/${slug}`, noIndex: true });
    }

    const { college } = detail;
    return buildMetadata({
        title:
            college.seo?.title ??
            `${college.name}, ${college.cityName} — Courses, Fees, Placements & Admission`,
        description:
            college.seo?.description ??
            `${college.name} in ${college.cityName}: courses, fee structure, admission process, cut-offs, placements, facilities and student reviews.`,
        path: `/colleges/${college.slug}`,
        ogImage: college.banner?.url ?? college.logo?.url,
        noIndex: college.seo?.noIndex,
    });
}

export default async function CollegeLayout({ children, params }: LayoutProps) {
    const { slug } = await params;
    const [detail, settings] = await Promise.all([getCollegeDetail(slug), getSettings()]);

    if (!detail) notFound();
    if ('redirectTo' in detail) redirect(`/colleges/${detail.redirectTo}`);

    const { college } = detail;
    void incrementViewCount('college', String(college._id));

    const faqJson = buildFaqJsonLd(
        (college.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
    );

    return (
        <>
            <JsonLd
                data={[
                    buildCollegeJsonLd({
                        name: college.name,
                        slug: college.slug,
                        description: college.description,
                        logoUrl: college.logo?.url,
                        cityName: college.cityName,
                        stateName: college.stateName,
                        address: college.address,
                        phone: college.contact?.phone,
                        website: college.contact?.website,
                        foundingDate: college.establishedYear,
                        rating: college.rating,
                    }),
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                        { label: college.name, href: `/colleges/${college.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <CollegeHero college={college} />

            <div className="shell py-6">{children}</div>

            <div className="shell pb-8">
                <p className="rounded-[10px] border border-line bg-white px-3 py-2 text-[11px] text-ink-soft">
                    {readString(
                        settings,
                        'legal.dataNotice',
                        'Figures are collected from public sources and may change. Confirm with the institute.',
                    )}
                </p>
            </div>
        </>
    );
}
