import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import { AssistantChat } from '@/components/ai/assistant-chat';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Alert, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { getAiConfig } from '@/services/ai.service';

export const dynamic = 'force-dynamic';

/** Starter prompts cover the six journeys the assistant is grounded for. */
const STARTER_QUESTIONS = [
    'Which courses can I do after 12th with PCM?',
    'Show me good engineering colleges in Maharashtra',
    'What is the eligibility for a B.Tech admission?',
    'How does the admission process work this year?',
    'Which entrance exams should I prepare for?',
    'How does free counselling with Admission Sathi work?',
];

const HOW_IT_WORKS = [
    'Your question is matched against Admission Sathi colleges, courses, exams, articles and FAQs.',
    'The answer is written only from those pages, and every page used is linked below the answer.',
    'Anything it cannot ground — such as this year’s cut-offs — is handed to a counsellor instead of guessed.',
];

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
    const params = await searchParams;
    return buildMetadata({
        title: 'Ask Admission Sathi AI — Instant Admission Guidance',
        description:
            'Ask about courses, colleges, eligibility, entrance exams, the admission process and counselling. Every answer is built from Admission Sathi pages and cites its sources.',
        path: '/ai-assistant',
        noIndex: Boolean(params.q),
    });
}

export default async function AiAssistantPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const [params, config] = await Promise.all([searchParams, getAiConfig()]);

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'AI Assistant', href: '/ai-assistant' },
                ])}
            />

            <PageHeader
                eyebrow="AI guidance"
                title={config.title}
                description={config.greeting}
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'AI Assistant' }]}
                actions={
                    <Button asChild variant="primary" size="sm">
                        <Link href="/book-counselling">
                            <CalendarCheck className="h-4 w-4" aria-hidden />
                            Talk to a counsellor
                        </Link>
                    </Button>
                }
            />

            <div className="shell py-6">
                {!config.enabled ? (
                    <Alert tone="warning" title="The assistant is currently switched off" className="mb-4">
                        Our counsellors are still available. <Link href="/book-counselling">Book a free session</Link> and
                        we will answer your questions directly.
                    </Alert>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <AssistantChat
                        greeting={config.greeting}
                        placeholder={config.placeholder}
                        disclaimer={config.disclaimer}
                        starters={STARTER_QUESTIONS}
                        initialQuestion={params.q}
                        enabled={config.enabled}
                    />

                    <aside className="space-y-4">
                        <SectionCard title="How this answer is built" icon="ShieldCheck">
                            <ul className="space-y-2.5">
                                {HOW_IT_WORKS.map((step, index) => (
                                    <li key={step} className="flex gap-2.5">
                                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-50 text-[10.5px] font-bold text-navy-700">
                                            {index + 1}
                                        </span>
                                        <p className="text-[12px] leading-relaxed text-ink-soft">{step}</p>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] leading-relaxed text-orange-700">
                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                {config.disclaimer}
                            </p>
                        </SectionCard>

                        <SectionCard
                            title="Prefer a human?"
                            icon="CalendarCheck"
                            description="Free, no-obligation counselling"
                        >
                            <p className="text-[12.5px] leading-relaxed text-ink-soft">
                                Counsellors work with your marks, budget and preferred states, and can confirm the
                                details that change every admission season.
                            </p>
                            <div className="mt-3 grid gap-2">
                                <Button asChild variant="primary" full size="md">
                                    <Link href="/book-counselling">
                                        <CalendarCheck className="h-4 w-4" aria-hidden />
                                        Book free counselling
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" full size="md">
                                    <Link href="/college-reviews">
                                        <MessageSquareText className="h-4 w-4" aria-hidden />
                                        Read student reviews
                                    </Link>
                                </Button>
                            </div>
                        </SectionCard>

                        <SectionCard title="Good to know" icon="Sparkles">
                            <ul className="space-y-2 text-[12px] leading-relaxed text-ink-soft">
                                <li className="flex items-start gap-2">
                                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" aria-hidden />
                                    Answers link only to Admission Sathi pages, so you can check everything yourself.
                                </li>
                                <li className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" aria-hidden />
                                    Chats are stored only if you tick the follow-up box.
                                </li>
                            </ul>
                            <p className="mt-3">
                                <Badge tone="neutral">Powered by {config.provider}</Badge>
                            </p>
                        </SectionCard>
                    </aside>
                </div>
            </div>
        </>
    );
}
