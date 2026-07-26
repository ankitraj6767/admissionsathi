'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Link2, RotateCcw, Send, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    MAX_QUESTION_LENGTH,
    MIN_QUESTION_LENGTH,
    useAiChat,
    type ChatMessage,
} from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';

/** Markdown subset the assistant actually emits: `[label](url)` and `**bold**`. */
const INLINE_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/**
 * Renders assistant text without `dangerouslySetInnerHTML`.
 * Only in-platform links (paths starting with `/`) become anchors — an answer can
 * never turn into an outbound link we did not author.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let index = 0;

    for (const match of text.matchAll(INLINE_PATTERN)) {
        const start = match.index ?? 0;
        if (start > cursor) nodes.push(text.slice(cursor, start));

        const [, label, href, bold] = match;
        if (label && href) {
            nodes.push(
                href.startsWith('/') ? (
                    <Link
                        key={`${keyPrefix}-l${index}`}
                        href={href}
                        className="font-semibold text-navy-600 underline underline-offset-2 hover:text-orange"
                    >
                        {label}
                    </Link>
                ) : (
                    <span key={`${keyPrefix}-t${index}`} className="font-semibold text-ink">
                        {label}
                    </span>
                ),
            );
        } else if (bold) {
            // The assistant emits bold-wrapped links (`**[label](/url)**`), so the
            // inner text is rendered through the same pass.
            nodes.push(
                <strong key={`${keyPrefix}-b${index}`} className="font-bold text-ink">
                    {renderInline(bold, `${keyPrefix}-b${index}`)}
                </strong>,
            );
        }

        cursor = start + match[0].length;
        index += 1;
    }

    if (cursor < text.length) nodes.push(text.slice(cursor));
    return nodes;
}

function AnswerBody({ id, content }: { id: string; content: string }) {
    const blocks: React.ReactNode[] = [];
    const lines = content.split('\n');
    let bullets: string[] = [];

    const flushBullets = (key: string) => {
        if (bullets.length === 0) return;
        blocks.push(
            <ul key={key} className="ml-4 list-disc space-y-1">
                {bullets.map((bullet, i) => (
                    <li key={`${key}-${i}`}>{renderInline(bullet, `${key}-${i}`)}</li>
                ))}
            </ul>,
        );
        bullets = [];
    };

    lines.forEach((raw, lineIndex) => {
        const line = raw.trim();
        if (line.startsWith('- ') || line.startsWith('* ')) {
            bullets.push(line.slice(2));
            return;
        }
        flushBullets(`${id}-ul-${lineIndex}`);
        if (line.length > 0) {
            blocks.push(<p key={`${id}-p-${lineIndex}`}>{renderInline(line, `${id}-p-${lineIndex}`)}</p>);
        }
    });
    flushBullets(`${id}-ul-end`);

    return <div className="space-y-2 text-[13px] leading-relaxed text-ink">{blocks}</div>;
}

function SourceList({ message }: { message: ChatMessage }) {
    const internal = message.sources.filter((source) => source.url.startsWith('/'));
    if (internal.length === 0) return null;

    return (
        <div className="mt-3 border-t border-line pt-2.5">
            <p className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                <Link2 className="h-3 w-3" aria-hidden />
                Sources on Admission Sathi
            </p>
            <ul className="flex flex-wrap gap-1.5">
                {internal.map((source) => (
                    <li key={`${message.id}-${source.url}`}>
                        <Link
                            href={source.url}
                            className="inline-flex min-h-[32px] max-w-full items-center gap-1 rounded-pill border border-line bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-navy-700 hover:border-navy-200 hover:bg-navy-50"
                        >
                            <span className="truncate">{source.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export interface AssistantChatProps {
    greeting: string;
    placeholder: string;
    disclaimer: string;
    starters: string[];
    /** Pre-filled question handed over from a compact composer (`?q=`). */
    initialQuestion?: string;
    enabled: boolean;
}

/**
 * Full assistant conversation.
 * All retrieval, moderation and provider selection stay server-side behind
 * `/api/ai/chat`; this component only renders what the stream sends, so it can
 * never present a fact the service did not ground and cite.
 */
export function AssistantChat({
    greeting,
    placeholder,
    disclaimer,
    starters,
    initialQuestion,
    enabled,
}: AssistantChatProps) {
    const [value, setValue] = React.useState('');
    const [consent, setConsent] = React.useState(false);
    const { messages, status, error, uncertain, isBusy, ask, reset } = useAiChat({ consent });
    const threadRef = React.useRef<HTMLDivElement | null>(null);
    const autoAsked = React.useRef(false);

    // Hand-off from the homepage composer: ask straight away, once.
    React.useEffect(() => {
        if (autoAsked.current || !enabled) return;
        const question = initialQuestion?.trim();
        if (!question || question.length < MIN_QUESTION_LENGTH) return;
        autoAsked.current = true;
        void ask(question);
    }, [ask, enabled, initialQuestion]);

    React.useEffect(() => {
        const node = threadRef.current;
        if (!node || messages.length === 0) return;
        const reduced =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        node.scrollTo({ top: node.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    }, [messages]);

    const submit = (question: string) => {
        if (!enabled || isBusy) return;
        const clean = question.trim();
        if (clean.length < MIN_QUESTION_LENGTH) return;
        setValue('');
        void ask(clean);
    };

    const showCounsellorCta = uncertain || Boolean(error);

    return (
        <section aria-labelledby="assistant-heading" className="rounded-panel border border-line bg-white shadow-card">
            <h2 id="assistant-heading" className="sr-only">
                Conversation with Admission Sathi AI
            </h2>

            <div
                ref={threadRef}
                aria-live="polite"
                aria-atomic="false"
                aria-busy={isBusy}
                className="max-h-[58vh] min-h-[240px] space-y-3 overflow-y-auto p-3.5 md:max-h-[62vh] md:p-4"
            >
                {messages.length === 0 ? (
                    <div className="rounded-[14px] border border-line bg-muted/60 p-3.5">
                        <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-navy-800">
                            <Sparkles className="h-4 w-4 text-orange" aria-hidden />
                            {enabled ? 'Ready when you are' : 'Assistant paused'}
                        </p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                            {enabled
                                ? greeting
                                : 'The assistant is switched off right now. Our counsellors can still answer your questions.'}
                        </p>
                    </div>
                ) : null}

                {messages.map((message) =>
                    message.role === 'user' ? (
                        <div key={message.id} className="flex justify-end gap-2">
                            <p className="max-w-[85%] rounded-[14px] rounded-br-[6px] bg-navy-800 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                                {message.content}
                            </p>
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                                <User className="h-3.5 w-3.5" aria-hidden />
                            </span>
                        </div>
                    ) : (
                        <div key={message.id} className="flex gap-2">
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            <div className="min-w-0 max-w-[88%] rounded-[14px] rounded-bl-[6px] border border-line bg-page px-3.5 py-2.5">
                                {message.content.length === 0 ? (
                                    <p className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                                        <span className="inline-flex gap-1" aria-hidden>
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300 motion-reduce:animate-none" />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300 [animation-delay:120ms] motion-reduce:animate-none" />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300 [animation-delay:240ms] motion-reduce:animate-none" />
                                        </span>
                                        Reading Admission Sathi pages…
                                    </p>
                                ) : (
                                    <>
                                        <AnswerBody id={message.id} content={message.content} />
                                        {message.streaming ? (
                                            <span className="sr-only">Answer still being written</span>
                                        ) : (
                                            <SourceList message={message} />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ),
                )}

                {error ? (
                    <p
                        role="alert"
                        className={cn(
                            'rounded-[12px] border px-3 py-2.5 text-[12.5px] leading-relaxed',
                            error.rateLimited
                                ? 'border-orange-100 bg-orange-50 text-orange-700'
                                : 'border-red-100 bg-red-50 text-red-alert',
                        )}
                    >
                        {error.message}
                    </p>
                ) : null}
            </div>

            {showCounsellorCta ? (
                <div className="mx-3.5 mb-3 flex flex-col gap-2.5 rounded-[14px] bg-navy-800 p-3.5 text-white sm:flex-row sm:items-center sm:justify-between md:mx-4">
                    <div className="min-w-0">
                        <p className="text-[13px] font-extrabold">Talk to a counsellor instead</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/75">
                            {error?.rateLimited
                                ? 'You have hit the question limit for now. A counsellor can pick this up straight away.'
                                : 'This one needs a human — our counsellors answer with verified, up-to-date information.'}
                        </p>
                    </div>
                    <Button asChild variant="primary" size="sm" className="shrink-0">
                        <Link href="/book-counselling">
                            <CalendarCheck className="h-4 w-4" aria-hidden />
                            Book free counselling
                        </Link>
                    </Button>
                </div>
            ) : null}

            {enabled && starters.length > 0 && messages.length === 0 ? (
                <div className="border-t border-line px-3.5 py-3 md:px-4">
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                        Try one of these
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                        {starters.map((starter) => (
                            <li key={starter}>
                                <button
                                    type="button"
                                    onClick={() => submit(starter)}
                                    className="chip min-h-[36px] text-left text-[11.5px]"
                                >
                                    {starter}
                                    <ArrowRight className="h-3 w-3" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    submit(value);
                }}
                className="border-t border-line p-3.5 md:p-4"
            >
                <label htmlFor="assistant-input" className="sr-only">
                    Ask Admission Sathi AI a question
                </label>
                <div className="flex items-end gap-2">
                    <textarea
                        id="assistant-input"
                        value={value}
                        onChange={(event) => setValue(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                submit(value);
                            }
                        }}
                        rows={2}
                        maxLength={MAX_QUESTION_LENGTH}
                        disabled={!enabled}
                        placeholder={enabled ? placeholder : 'The assistant is switched off'}
                        aria-describedby="assistant-disclaimer"
                        className="min-h-[44px] w-full resize-none rounded-[12px] border border-line bg-page px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft/80 focus:border-navy-300 disabled:opacity-60"
                    />
                    <Button
                        type="submit"
                        size="md"
                        loading={isBusy}
                        loadingText="Thinking…"
                        disabled={!enabled || value.trim().length < MIN_QUESTION_LENGTH}
                        className="min-h-[44px]"
                    >
                        <Send className="h-4 w-4" aria-hidden />
                        <span className="hidden sm:inline">Ask</span>
                    </Button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex min-h-[32px] cursor-pointer items-center gap-2 text-[11.5px] text-ink-soft">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                            className="h-3.5 w-3.5 accent-orange"
                        />
                        Save this chat so a counsellor can follow up
                    </label>
                    <span className="flex items-center gap-2">
                        <span className="text-[11px] text-ink-soft">
                            {value.length}/{MAX_QUESTION_LENGTH}
                        </span>
                        {messages.length > 0 ? (
                            <button
                                type="button"
                                onClick={reset}
                                className="inline-flex min-h-[32px] items-center gap-1 text-[11.5px] font-semibold text-navy-600 hover:text-orange"
                            >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                                New chat
                            </button>
                        ) : null}
                    </span>
                </div>

                <p id="assistant-disclaimer" className="mt-2.5 text-[11px] leading-relaxed text-ink-soft">
                    {disclaimer}
                </p>
                <p className="sr-only" role="status">
                    {status === 'streaming' ? 'Answer streaming' : status === 'thinking' ? 'Preparing answer' : ''}
                </p>
            </form>
        </section>
    );
}
