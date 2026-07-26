import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { FaqList } from '@/components/shared/faq-list';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { listGlobalFaqs } from '@/services/faq.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/seo/json-ld';
import type { BreadcrumbItem } from '@/types/common';

export const revalidate = 900;

export const metadata: Metadata = buildMetadata({
    title: 'Frequently Asked Questions — Admissions, Exams & Counselling',
    description:
        'Answers to the questions students ask us most: admissions and eligibility, entrance exams, counselling rounds, fees, education loans, scholarships and how Admission Sathi works.',
    path: '/faqs',
    keywords: ['admission faqs', 'counselling questions', 'entrance exam faq'],
});

const BREADCRUMBS: BreadcrumbItem[] = [{ label: 'Home', href: '/' }, { label: 'FAQs' }];

export default async function FaqsPage() {
    const { total, featured, groups } = await listGlobalFaqs();

    const faqJsonLd = buildFaqJsonLd(
        [...featured, ...groups.flatMap((group) => group.items)]
            // De-duplicate: featured FAQs also appear inside their category group.
            .filter((faq, index, all) => all.findIndex((f) => f.id === faq.id) === index)
            .slice(0, 50)
            .map((faq) => ({ question: faq.question, answer: faq.answerText })),
    );

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'FAQs', href: '/faqs' },
                    ]),
                    ...(faqJsonLd ? [faqJsonLd] : []),
                ]}
            />

            <PageHeader
                eyebrow="Help centre"
                title="Frequently asked questions"
                description="Short, straight answers on admissions, entrance exams, counselling rounds, fees and education finance. Still stuck? Our counsellors reply within a working day."
                breadcrumbs={BREADCRUMBS}
            />

            <div className="shell py-6">
                {total === 0 ? (
                    <EmptyState
                        icon="CircleHelp"
                        title="No FAQs published yet"
                        description="Our content team publishes answers from the admin dashboard. In the meantime, send us your question and we will reply directly."
                        action={
                            <Link
                                href="/contact"
                                className="inline-flex h-11 items-center rounded-[10px] bg-orange px-5 text-[13px] font-bold text-white hover:bg-orange-600"
                            >
                                Ask us a question
                            </Link>
                        }
                    />
                ) : (
                    <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <nav
                            aria-label="FAQ categories"
                            className="rounded-panel border border-line bg-white p-3 shadow-card lg:sticky lg:top-24"
                        >
                            <h2 className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-navy-600">
                                Categories
                            </h2>
                            <ul className="space-y-1">
                                {groups.map((group) => (
                                    <li key={group.slug}>
                                        <a
                                            href={`#${group.slug}`}
                                            className="flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-muted/70 hover:text-navy-700"
                                        >
                                            <span className="min-w-0 truncate">{group.category}</span>
                                            <span className="shrink-0 text-[11px] font-bold text-ink-soft">
                                                {group.items.length}
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 border-t border-line px-1 pt-3 text-[11.5px] leading-relaxed text-ink-soft">
                                Cannot find an answer?{' '}
                                <Link href="/contact" className="font-bold text-navy-600 hover:text-orange">
                                    Contact our team
                                </Link>
                                .
                            </p>
                        </nav>

                        <div className="min-w-0 space-y-4">
                            {featured.length > 0 ? (
                                <section
                                    aria-labelledby="faq-featured-heading"
                                    className="rounded-panel border border-orange-100 bg-orange-50/70 p-4 md:p-5"
                                >
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <h2
                                            id="faq-featured-heading"
                                            className="section-title text-[15px] md:text-[16px]"
                                        >
                                            Most asked
                                        </h2>
                                        <Badge tone="solidOrange">Top {featured.length}</Badge>
                                    </div>
                                    <p className="mb-2 text-[12px] text-ink-soft">
                                        The questions students open first.
                                    </p>
                                    <FaqList faqs={featured} defaultOpenFirst />
                                </section>
                            ) : null}

                            {groups.map((group) => (
                                <SectionCard
                                    key={group.slug}
                                    id={group.slug}
                                    title={group.category}
                                    icon="CircleHelp"
                                    description={`${group.items.length} question${group.items.length === 1 ? '' : 's'}`}
                                >
                                    <FaqList faqs={group.items} />
                                </SectionCard>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
