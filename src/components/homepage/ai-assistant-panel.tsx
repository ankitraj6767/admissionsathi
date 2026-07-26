'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles } from 'lucide-react';
import { MIN_QUESTION_LENGTH, buildAssistantHref } from '@/hooks/use-ai-chat';

/**
 * Compact AI composer.
 * The question is handed to the full assistant page (which owns the streaming
 * conversation, rate limiting and source citations) through the shared
 * `use-ai-chat` contract, so both entry points stay in sync.
 */
export function AiAssistantPanel({
    title,
    description,
    placeholder,
    suggestions,
}: {
    title: string;
    description?: string;
    placeholder: string;
    suggestions: string[];
}) {
    const router = useRouter();
    const [value, setValue] = useState('');

    const submit = (question: string) => {
        const clean = question.trim();
        if (clean.length < MIN_QUESTION_LENGTH) return;
        router.push(buildAssistantHref(clean));
    };

    return (
        <section
            aria-labelledby="ai-panel-heading"
            className="relative overflow-hidden rounded-panel bg-teal p-4 text-white shadow-raised"
        >
            <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" />

            <div className="relative flex items-start gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white/15">
                    <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                    <h2 id="ai-panel-heading" className="text-[13.5px] font-extrabold leading-tight">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-1 text-[10.5px] leading-relaxed text-white/80">{description}</p>
                    ) : null}
                </div>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(value);
                }}
                className="relative mt-3"
            >
                <label htmlFor="ai-question" className="sr-only">
                    Ask Admission Sathi AI
                </label>
                <input
                    id="ai-question"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="h-10 w-full rounded-[10px] border border-white/25 bg-white/95 pl-3 pr-11 text-[12px] text-ink outline-none placeholder:text-ink-soft/80 focus:border-white focus:ring-2 focus:ring-white/30"
                />
                <button
                    type="submit"
                    aria-label="Ask the assistant"
                    className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] bg-navy text-white transition-colors hover:bg-navy-800"
                >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                </button>
            </form>

            {suggestions.length > 0 ? (
                <div className="relative mt-2.5 flex flex-wrap gap-1.5">
                    {suggestions.slice(0, 2).map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => submit(suggestion)}
                            className="truncate rounded-pill border border-white/25 bg-white/10 px-2 py-1 text-[9.5px] font-semibold text-white/90 transition-colors hover:bg-white/20"
                        >
                            {suggestion.length > 42 ? `${suggestion.slice(0, 42)}…` : suggestion}
                        </button>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
