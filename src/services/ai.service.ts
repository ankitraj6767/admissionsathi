import 'server-only';
import { randomUUID } from 'node:crypto';
import {
    searchArticlePassages,
    searchFaqPassages,
} from '@/db/repositories/content.repository';
import {
    aggregateAiConversationTurns,
    appendAiMessages,
    countAiConversations,
    listRecentAiConversations,
    markAiConversationHandedOff,
} from '@/db/repositories/system.repository';
import { listUserNamesByIds } from '@/db/repositories/user.repository';
import { findSettingValue } from '@/db/repositories/settings.repository';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { stripHtml, truncate } from '@/lib/utils';
import { globalSearch, type SearchHit } from '@/services/search.service';
import { getSettings, readBool, readString } from '@/services/settings.service';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface AiSource {
    label: string;
    url: string;
}

export interface AiMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: AiSource[];
}

export interface RetrievedPassage {
    label: string;
    url: string;
    text: string;
}

export interface AiAnswer {
    answer: string;
    sources: AiSource[];
    grounded: boolean;
    provider: string;
    model: string;
}

export interface AiConfig {
    enabled: boolean;
    title: string;
    greeting: string;
    placeholder: string;
    disclaimer: string;
    systemPrompt: string;
    provider: string;
    model: string;
}

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

const FALLBACK_SYSTEM_PROMPT =
    'You are Admission Sathi AI, an admission guidance assistant for Indian students. ' +
    'Answer only from the provided platform context. Never invent ranks, cut-offs, fees or eligibility. ' +
    'If the context is insufficient, say so and offer a free counselling session. ' +
    'Always cite the source links provided in the context.';

export async function getAiConfig(): Promise<AiConfig> {
    const settings = await getSettings();
    return {
        enabled: readBool(settings, 'ai.enabled', true),
        title: readString(settings, 'ai.title', 'Ask Admission Sathi AI'),
        greeting: readString(settings, 'ai.greeting', 'Ask anything about courses, colleges, exams, loans or counselling.'),
        placeholder: readString(settings, 'ai.placeholder', 'Type your question…'),
        disclaimer: readString(
            settings,
            'ai.disclaimer',
            'AI answers are generated from Admission Sathi content and may be incomplete. Verify important details with official sources.',
        ),
        // `ai.systemPrompt` is not a public setting, so it is not in the public map.
        systemPrompt: FALLBACK_SYSTEM_PROMPT,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
    };
}

/** Reads the (non-public) system prompt straight from the settings collection. */
export async function getSystemPrompt(): Promise<string> {
    try {
        const value = await findSettingValue('ai.systemPrompt');
        return typeof value === 'string' && value.trim().length > 0 ? value : FALLBACK_SYSTEM_PROMPT;
    } catch {
        return FALLBACK_SYSTEM_PROMPT;
    }
}

/* ------------------------------------------------------------------ *
 * Moderation — cheap, deterministic guard rails.
 * The assistant is scoped to admissions; anything else is refused before
 * a provider call is made (also saves tokens).
 * ------------------------------------------------------------------ */

const BLOCKED_PATTERNS = [
    /\b(hack|crack|leak(ed)?\s+paper|question\s+paper\s+leak|impersonat)\b/i,
    /\b(fake|forged?)\s+(certificate|marksheet|degree|document)/i,
    /\b(bribe|donation\s+seat\s+broker|proxy\s+exam)\b/i,
    /\b(suicide|kill\s+myself|end\s+my\s+life)\b/i,
];

const CRISIS_PATTERN = /\b(suicide|kill\s+myself|end\s+my\s+life|self\s*harm)\b/i;

export interface ModerationVerdict {
    allowed: boolean;
    reason?: string;
    reply?: string;
}

export function moderateQuestion(question: string): ModerationVerdict {
    const text = question.trim();

    if (text.length < 3) {
        return { allowed: false, reason: 'too_short', reply: 'Please type a slightly longer question so I can help.' };
    }
    if (text.length > 600) {
        return {
            allowed: false,
            reason: 'too_long',
            reply: 'That question is very long. Please shorten it to under 600 characters.',
        };
    }
    if (CRISIS_PATTERN.test(text)) {
        return {
            allowed: false,
            reason: 'crisis',
            reply:
                'It sounds like you may be going through something serious, and I am not the right kind of help for that. ' +
                'Please talk to someone you trust right away, or call the Tele-MANAS helpline on 14416 (India, 24×7). ' +
                'If you are in immediate danger, call 112.',
        };
    }
    if (BLOCKED_PATTERNS.some((pattern) => pattern.test(text))) {
        return {
            allowed: false,
            reason: 'policy',
            reply:
                'I can only help with genuine admission, course, exam, loan and counselling questions. ' +
                'I cannot assist with that request.',
        };
    }
    return { allowed: true };
}

/* ------------------------------------------------------------------ *
 * Retrieval — everything the model may use comes from our own data.
 * ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'for', 'of', 'in', 'on', 'at', 'to',
    'and', 'or', 'but', 'with', 'without', 'my', 'me', 'i', 'you', 'your', 'we', 'our', 'it', 'its',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'can', 'could', 'should', 'would',
    'do', 'does', 'did', 'get', 'got', 'about', 'from', 'into', 'best', 'good', 'please', 'tell',
    'give', 'want', 'need', 'help', 'there', 'this', 'that', 'these', 'those', 'any', 'all',
]);

export function extractKeywords(question: string, limit = 6): string[] {
    const words = question
        .toLowerCase()
        .replace(/[^a-z0-9+.\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // Preserve order but de-duplicate; longer words first tends to be more selective.
    const unique = Array.from(new Set(words));
    return unique.sort((a, b) => b.length - a.length).slice(0, limit);
}

async function retrieveFaqs(keywords: string[], limit = 3): Promise<RetrievedPassage[]> {
    if (keywords.length === 0) return [];
    try {
        const rows = await searchFaqPassages(keywords, limit);

        return rows.map((row) => ({
            label: `FAQ — ${row.question}`,
            url: '/faqs',
            text: truncate(stripHtml(row.answerHtml), 500),
        }));
    } catch {
        return [];
    }
}

async function retrieveArticles(keywords: string[], limit = 3): Promise<RetrievedPassage[]> {
    if (keywords.length === 0) return [];
    try {
        const rows = await searchArticlePassages(keywords, limit);

        return rows.map((row) => ({
            label: row.title,
            url: `/articles/${row.slug}`,
            text: truncate(row.excerpt ? row.excerpt : stripHtml(row.contentHtml), 600),
        }));
    } catch {
        return [];
    }
}

function hitToPassage(hit: SearchHit): RetrievedPassage {
    const bits = [hit.sublabel, hit.meta].filter(Boolean).join(' · ');
    return {
        label: hit.label,
        url: hit.url,
        text: bits ? `${hit.label} (${bits}). Listed on Admission Sathi at ${hit.url}.` : `${hit.label} — ${hit.url}`,
    };
}

/** Gathers platform passages relevant to the question. */
export async function retrieveContext(question: string): Promise<RetrievedPassage[]> {
    const keywords = extractKeywords(question);
    const searchTerm = keywords.slice(0, 3).join(' ') || question.slice(0, 60);

    const [search, faqs, articles] = await Promise.all([
        globalSearch(searchTerm, { limitPerGroup: 3 }).catch(() => null),
        retrieveFaqs(keywords),
        retrieveArticles(keywords),
    ]);

    const entityPassages = (search?.groups ?? [])
        .flatMap((group) => group.hits.slice(0, 3))
        .slice(0, 10)
        .map(hitToPassage);

    const all = [...faqs, ...articles, ...entityPassages];

    // De-duplicate by URL, keep the richest passage first.
    const seen = new Set<string>();
    return all.filter((passage) => {
        if (seen.has(passage.url)) return false;
        seen.add(passage.url);
        return true;
    });
}

function buildContextBlock(passages: RetrievedPassage[]): string {
    if (passages.length === 0) return 'NO CONTEXT AVAILABLE.';
    return passages
        .map((passage, index) => `[${index + 1}] ${passage.label}\nURL: ${passage.url}\n${passage.text}`)
        .join('\n\n');
}

/* ------------------------------------------------------------------ *
 * Provider adapters
 * Every adapter receives exactly the same grounded prompt so switching
 * providers cannot change the safety posture.
 * ------------------------------------------------------------------ */

interface ProviderRequest {
    systemPrompt: string;
    contextBlock: string;
    history: AiMessage[];
    question: string;
}

interface ProviderAdapter {
    id: string;
    model: string;
    complete(request: ProviderRequest): Promise<string>;
}

const NO_CONTEXT_REPLY =
    'I could not find anything on Admission Sathi that answers this reliably, so I would rather not guess. ' +
    'A counsellor can answer it properly — you can [book a free session](/book-counselling) or ' +
    '[browse our guides](/articles).';

/**
 * Extractive fallback assistant.
 * It never writes new facts: it stitches together the retrieved passages and
 * always points at the source pages. This is the default in development and
 * whenever no model credentials are configured.
 */
const mockAdapter: ProviderAdapter = {
    id: 'mock',
    model: 'extractive-retrieval',
    async complete({ contextBlock, question }) {
        if (contextBlock === 'NO CONTEXT AVAILABLE.') return NO_CONTEXT_REPLY;

        const blocks = contextBlock.split('\n\n').slice(0, 4);
        const lines = blocks.map((block) => {
            const [labelLine, urlLine, ...rest] = block.split('\n');
            const label = (labelLine ?? '').replace(/^\[\d+\]\s*/, '');
            const url = (urlLine ?? '').replace(/^URL:\s*/, '');
            const text = rest.join(' ').trim();
            return `- **[${label}](${url})** — ${truncate(text, 220)}`;
        });

        return [
            `Here is what Admission Sathi has on “${truncate(question, 90)}”:`,
            '',
            ...lines,
            '',
            'These pages carry the detail, including the parts that change every year. ' +
            'If you want this narrowed down to your marks, budget and preferred state, ' +
            '[book a free counselling session](/book-counselling).',
        ].join('\n');
    },
};

function buildMessages({ systemPrompt, contextBlock, history, question }: ProviderRequest) {
    const system = [
        systemPrompt,
        '',
        'RULES:',
        '1. Use ONLY the CONTEXT below. Do not use outside knowledge for facts.',
        '2. Never state a rank, cut-off, fee, seat count, ranking or eligibility rule that is not in the CONTEXT.',
        '3. When the CONTEXT does not cover the question, say so plainly and suggest booking free counselling.',
        '4. Cite pages as markdown links using the URLs given in the CONTEXT.',
        '5. Keep answers under 220 words, in plain English, and mention that figures should be verified with official sources.',
        '',
        'CONTEXT:',
        contextBlock,
    ].join('\n');

    return [
        { role: 'system' as const, content: system },
        ...history.slice(-6).map((message) => ({
            role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: message.content,
        })),
        { role: 'user' as const, content: question },
    ];
}

const openaiAdapter: ProviderAdapter = {
    id: 'openai',
    model: env.AI_MODEL,
    async complete(request) {
        if (!env.OPENAI_API_KEY) return mockAdapter.complete(request);
        const messages = buildMessages(request);

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: env.AI_MODEL, messages, temperature: 0.2, max_tokens: 700 }),
            cache: 'no-store',
        });

        if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        return data.choices?.[0]?.message?.content?.trim() || NO_CONTEXT_REPLY;
    },
};

const anthropicAdapter: ProviderAdapter = {
    id: 'anthropic',
    model: env.AI_MODEL,
    async complete(request) {
        if (!env.ANTHROPIC_API_KEY) return mockAdapter.complete(request);
        const messages = buildMessages(request);
        const system = messages[0]!.content;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: env.AI_MODEL,
                system,
                max_tokens: 700,
                temperature: 0.2,
                messages: messages.slice(1),
            }),
            cache: 'no-store',
        });

        if (!res.ok) throw new Error(`Anthropic responded ${res.status}`);
        const data = (await res.json()) as { content?: { text?: string }[] };
        return data.content?.map((part) => part.text ?? '').join('').trim() || NO_CONTEXT_REPLY;
    },
};

function adapterFor(provider: string): ProviderAdapter {
    if (provider === 'openai') return openaiAdapter;
    if (provider === 'anthropic') return anthropicAdapter;
    return mockAdapter;
}

/* ------------------------------------------------------------------ *
 * Answer pipeline
 * ------------------------------------------------------------------ */

export interface AskInput {
    question: string;
    history?: AiMessage[];
    sessionId?: string;
    userId?: string;
    anonymousId?: string;
    consentGiven?: boolean;
}

export async function askAssistant(input: AskInput): Promise<AiAnswer & { sessionId: string }> {
    const sessionId = input.sessionId ?? randomUUID();
    const config = await getAiConfig();

    if (!config.enabled) {
        return {
            sessionId,
            answer:
                'The AI assistant is currently switched off. Our counsellors are still available — ' +
                '[book a free session](/book-counselling).',
            sources: [],
            grounded: false,
            provider: 'disabled',
            model: 'none',
        };
    }

    const verdict = moderateQuestion(input.question);
    if (!verdict.allowed) {
        return {
            sessionId,
            answer: verdict.reply ?? 'I cannot help with that request.',
            sources: [],
            grounded: false,
            provider: 'moderation',
            model: verdict.reason ?? 'blocked',
        };
    }

    const passages = await retrieveContext(input.question);
    const contextBlock = buildContextBlock(passages);
    const systemPrompt = await getSystemPrompt();
    const adapter = adapterFor(config.provider);

    let answer: string;
    try {
        answer = await adapter.complete({
            systemPrompt,
            contextBlock,
            history: input.history ?? [],
            question: input.question,
        });
    } catch (error) {
        logger.error('ai.provider_failed', {
            provider: adapter.id,
            error: error instanceof Error ? error.message : String(error),
        });
        answer = await mockAdapter.complete({
            systemPrompt,
            contextBlock,
            history: input.history ?? [],
            question: input.question,
        });
    }

    const sources: AiSource[] = passages.slice(0, 6).map((passage) => ({
        label: truncate(passage.label, 90),
        url: passage.url,
    }));

    return {
        sessionId,
        answer,
        sources,
        grounded: passages.length > 0,
        provider: adapter.id,
        model: adapter.model,
    };
}

/* ------------------------------------------------------------------ *
 * Persistence — only with explicit consent.
 * ------------------------------------------------------------------ */

export async function saveConversationTurn(input: {
    sessionId: string;
    userId?: string;
    anonymousId?: string;
    consentGiven: boolean;
    question: string;
    answer: string;
    sources: AiSource[];
    provider: string;
    model: string;
    flagged?: boolean;
}): Promise<void> {
    if (!input.consentGiven) return;

    try {
        const now = new Date();
        await appendAiMessages(
            input.sessionId,
            [
                {
                    role: 'user',
                    content: truncate(input.question, 4000),
                    createdAt: now,
                    flagged: input.flagged ?? false,
                },
                {
                    role: 'assistant',
                    content: truncate(input.answer, 8000),
                    sources: input.sources,
                    createdAt: now,
                },
            ],
            { provider: input.provider, model: input.model },
            {
                user: input.userId,
                anonymousId: input.userId ? undefined : input.anonymousId,
                consentGiven: true,
            },
        );
    } catch (error) {
        logger.warn('ai.persist_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function markHandedOff(sessionId: string, leadId?: string): Promise<void> {
    try {
        await markAiConversationHandedOff(sessionId, leadId);
    } catch {
        /* non-critical */
    }
}

/* ------------------------------------------------------------------ *
 * Admin reporting
 * ------------------------------------------------------------------ */

export interface AiConversationSummary {
    id: string;
    sessionId: string;
    turns: number;
    firstQuestion: string;
    lastAnswer: string;
    provider?: string;
    model?: string;
    handedOff: boolean;
    flagged: boolean;
    identified: boolean;
    /** Citations attached to the latest answer — a proxy for how grounded it was. */
    sourceCount: number;
    /** Display label for the admin console: real name when signed in, else guest id. */
    userLabel: string;
    createdAt: Date;
    updatedAt: Date;
}

export async function listRecentConversations(limit = 25): Promise<AiConversationSummary[]> {
    const rows = await listRecentAiConversations(limit);

    // Resolve names in one extra query rather than populating each row.
    const userIds = rows.map((row) => row.user).filter(Boolean);
    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
        const users = await listUserNamesByIds(userIds);
        users.forEach((user) => nameById.set(String(user._id), user.name || user.email || 'User'));
    }

    return rows.map((row) => {
        const messages = row.messages ?? [];
        const firstUser = messages.find((m) => m.role === 'user');
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
        return {
            id: String(row._id),
            sessionId: row.sessionId,
            turns: messages.length,
            firstQuestion: truncate(firstUser?.content ?? '—', 160),
            lastAnswer: truncate(stripHtml(lastAssistant?.content ?? '—'), 200),
            provider: row.provider,
            model: row.model,
            handedOff: Boolean(row.handedOffToCounsellor),
            flagged: messages.some((m) => m.flagged),
            identified: Boolean(row.user),
            sourceCount: lastAssistant?.sources?.length ?? 0,
            userLabel: row.user
                ? (nameById.get(String(row.user)) ?? 'Signed-in user')
                : row.anonymousId
                    ? `Guest · ${row.anonymousId.slice(-6)}`
                    : 'Guest',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    });
}

export async function getAiStats(): Promise<{
    conversations: number;
    turns: number;
    handedOff: number;
    last7Days: number;
}> {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [conversations, handedOff, last7Days, turns] = await Promise.all([
        countAiConversations({}),
        countAiConversations({ handedOffToCounsellor: true }),
        countAiConversations({ createdAt: { $gte: since } }),
        aggregateAiConversationTurns(),
    ]);

    return {
        conversations,
        turns,
        handedOff,
        last7Days,
    };
}
