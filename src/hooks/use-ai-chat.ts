'use client';

import { useCallback, useRef, useState } from 'react';
import { getAnonymousId } from '@/lib/analytics/client';
import type { AiSource } from '@/services/ai.service';

/**
 * Single source of truth for the browser side of the assistant.
 *
 * Both the compact homepage composer and the full `/ai-assistant` page speak the
 * same contract: the composer only builds the hand-off link, the full page owns
 * the streamed conversation. Keeping the limits and the URL builder here means a
 * change to the API contract cannot drift between the two entry points.
 */
export const MIN_QUESTION_LENGTH = 3;
export const MAX_QUESTION_LENGTH = 600;

/** Hand-off link used by every compact entry point (homepage panel, nav, CTAs). */
export function buildAssistantHref(question: string): string {
    const clean = question.trim();
    if (clean.length < MIN_QUESTION_LENGTH) return '/ai-assistant';
    return `/ai-assistant?q=${encodeURIComponent(clean.slice(0, MAX_QUESTION_LENGTH))}`;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources: AiSource[];
    /** True while deltas are still arriving, so the UI can show a caret. */
    streaming: boolean;
}

export type AiChatStatus = 'idle' | 'thinking' | 'streaming' | 'error';

export interface AiChatError {
    message: string;
    /** Set when the API refused the question because of the rate limit. */
    rateLimited: boolean;
}

interface StreamMeta {
    sessionId?: string;
    provider?: string;
    grounded?: boolean;
}

function messageId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEvent(block: string): { event: string; data: unknown } | null {
    const lines = block.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event:'));
    const dataLine = lines.find((line) => line.startsWith('data:'));
    if (!eventLine || !dataLine) return null;
    try {
        return {
            event: eventLine.slice(6).trim(),
            data: JSON.parse(dataLine.slice(5).trim()) as unknown,
        };
    } catch {
        return null;
    }
}

export interface UseAiChatResult {
    messages: ChatMessage[];
    status: AiChatStatus;
    error: AiChatError | null;
    /** True when the last answer could not be grounded in platform content. */
    uncertain: boolean;
    isBusy: boolean;
    ask: (question: string) => Promise<void>;
    reset: () => void;
}

/**
 * Streams an answer from `/api/ai/chat`.
 *
 * The endpoint returns server-sent events (`meta` → `delta`* → `sources` → `done`),
 * so we read the body as a stream rather than awaiting JSON: the first words show
 * up while the rest is still being written.
 */
export function useAiChat(options: { consent?: boolean } = {}): UseAiChatResult {
    const consent = options.consent ?? false;
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<AiChatStatus>('idle');
    const [error, setError] = useState<AiChatError | null>(null);
    const [uncertain, setUncertain] = useState(false);
    const sessionIdRef = useRef<string | undefined>(undefined);
    const busyRef = useRef(false);

    const reset = useCallback(() => {
        setMessages([]);
        setStatus('idle');
        setError(null);
        setUncertain(false);
        sessionIdRef.current = undefined;
    }, []);

    const ask = useCallback(
        async (question: string) => {
            const clean = question.trim().slice(0, MAX_QUESTION_LENGTH);
            if (clean.length < MIN_QUESTION_LENGTH || busyRef.current) return;

            busyRef.current = true;
            setError(null);
            setUncertain(false);
            setStatus('thinking');

            const assistantId = messageId();
            const history = messages.slice(-6).map((message) => ({
                role: message.role,
                content: message.content,
            }));

            setMessages((prev) => [
                ...prev,
                { id: messageId(), role: 'user', content: clean, sources: [], streaming: false },
                { id: assistantId, role: 'assistant', content: '', sources: [], streaming: true },
            ]);

            const finish = (failure?: AiChatError) => {
                busyRef.current = false;
                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === assistantId ? { ...message, streaming: false } : message,
                    ),
                );
                if (failure) {
                    setError(failure);
                    setStatus('error');
                } else {
                    setStatus('idle');
                }
            };

            try {
                const response = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: clean,
                        sessionId: sessionIdRef.current,
                        anonymousId: getAnonymousId(),
                        consent,
                        history,
                    }),
                });

                if (!response.ok || !response.body) {
                    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                    const rateLimited = response.status === 429;
                    setMessages((prev) => prev.filter((message) => message.id !== assistantId));
                    finish({
                        rateLimited,
                        message:
                            payload?.error ??
                            (rateLimited
                                ? 'You have asked a lot of questions in a short time. Please try again shortly, or talk to a counsellor.'
                                : 'The assistant could not answer right now. Please try again in a moment.'),
                    });
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let grounded = true;

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const blocks = buffer.split('\n\n');
                    buffer = blocks.pop() ?? '';

                    for (const block of blocks) {
                        const parsed = parseEvent(block);
                        if (!parsed) continue;

                        if (parsed.event === 'meta') {
                            const meta = parsed.data as StreamMeta;
                            if (meta.sessionId) sessionIdRef.current = meta.sessionId;
                            grounded = meta.grounded !== false;
                            setStatus('streaming');
                        } else if (parsed.event === 'delta') {
                            const { text } = parsed.data as { text?: string };
                            if (!text) continue;
                            setMessages((prev) =>
                                prev.map((message) =>
                                    message.id === assistantId
                                        ? { ...message, content: message.content + text }
                                        : message,
                                ),
                            );
                        } else if (parsed.event === 'sources') {
                            const { sources } = parsed.data as { sources?: AiSource[] };
                            setMessages((prev) =>
                                prev.map((message) =>
                                    message.id === assistantId
                                        ? { ...message, sources: sources ?? [] }
                                        : message,
                                ),
                            );
                        }
                    }
                }

                setUncertain(!grounded);
                finish();
            } catch {
                setMessages((prev) => prev.filter((message) => message.id !== assistantId));
                finish({
                    rateLimited: false,
                    message: 'Your connection dropped before the answer arrived. Please try again.',
                });
            }
        },
        [consent, messages],
    );

    return { messages, status, error, uncertain, isBusy: status === 'thinking' || status === 'streaming', ask, reset };
}
