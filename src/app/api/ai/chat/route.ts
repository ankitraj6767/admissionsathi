import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentActor } from '@/lib/auth/session';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { saveConversationTurn, streamAssistant } from '@/services/ai.service';
import { recordAnalyticsEvent } from '@/services/analytics.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
    question: z.string().min(1).max(600),
    sessionId: z.string().max(80).optional(),
    anonymousId: z.string().max(80).optional(),
    consent: z.boolean().optional(),
    history: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().max(4000),
            }),
        )
        .max(12)
        .optional(),
});

/**
 * Streaming assistant endpoint.
 *
 * A Route Handler rather than a Server Action because the response is streamed
 * token-by-token to keep the UI responsive. Retrieval, moderation and provider
 * selection all live in `ai.service` so nothing model-related runs client-side.
 */
export async function POST(request: NextRequest) {
    let payload: z.infer<typeof bodySchema>;
    try {
        payload = bodySchema.parse(await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const actor = await getCurrentActor();
    const limited = await rateLimit({ ...RATE_LIMITS.aiChat, identifier: actor?.id });
    if (!limited.success) {
        return NextResponse.json(
            {
                error: `You have reached the question limit. Please try again in about ${Math.ceil(
                    limited.retryAfterSeconds / 60,
                )} minute(s), or book a free counselling session.`,
            },
            { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
        );
    }

    let result: Awaited<ReturnType<typeof streamAssistant>>;
    try {
        result = await streamAssistant({
            question: payload.question,
            history: payload.history,
            sessionId: payload.sessionId,
            userId: actor?.id,
            anonymousId: payload.anonymousId,
            consentGiven: payload.consent ?? false,
            abortSignal: request.signal,
        });
    } catch (error) {
        logger.error('ai.chat_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { error: 'The assistant is unavailable right now. Please try again shortly.' },
            { status: 503 },
        );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            send('meta', {
                sessionId: result.sessionId,
                provider: result.provider,
                grounded: result.grounded,
            });

            let answer = '';
            try {
                for await (const text of result.textStream) {
                    answer += text;
                    send('delta', { text });
                }

                send('sources', { sources: result.sources });
                send('done', { sessionId: result.sessionId });
            } catch (error) {
                logger.error('ai.response_stream_failed', {
                    provider: result.provider,
                    error: error instanceof Error ? error.message : String(error),
                });
            } finally {
                if (answer.trim() && !request.signal.aborted) {
                    void saveConversationTurn({
                        sessionId: result.sessionId,
                        userId: actor?.id,
                        anonymousId: payload.anonymousId,
                        consentGiven: payload.consent ?? false,
                        question: payload.question,
                        answer,
                        sources: result.sources,
                        provider: result.provider,
                        model: result.model,
                    });

                    void recordAnalyticsEvent({
                        name: 'ai_question_asked',
                        path: '/ai-assistant',
                        userId: actor?.id,
                        anonymousId: payload.anonymousId,
                        sessionId: result.sessionId,
                        properties: {
                            provider: result.provider,
                            grounded: result.grounded,
                            sourceCount: result.sources.length,
                        },
                    });
                }

                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
