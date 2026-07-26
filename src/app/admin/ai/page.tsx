import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Settings } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState, IconTile } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { requirePermissionPage } from '@/lib/auth/session';
import { formatDate, truncate } from '@/lib/utils';
import { getAiConfig, getAiStats, listRecentConversations } from '@/services/ai.service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'AI assistant' };

/** Settings keys that control the assistant, edited on /admin/settings (group “ai”). */
const CONFIG_KEYS = [
    { key: 'ai.enabled', label: 'Assistant on/off' },
    { key: 'ai.title', label: 'Panel title' },
    { key: 'ai.greeting', label: 'Greeting' },
    { key: 'ai.placeholder', label: 'Input placeholder' },
    { key: 'ai.disclaimer', label: 'Disclaimer shown under every answer' },
    { key: 'ai.systemPrompt', label: 'System prompt (not exposed publicly)' },
];

export default async function AdminAiPage() {
    await requirePermissionPage('ai.manage');

    const [stats, conversations, config] = await Promise.all([
        getAiStats(),
        listRecentConversations(25),
        getAiConfig(),
    ]);

    const cards = [
        { label: 'Conversations', value: stats.conversations, icon: 'MessageCircle', note: 'Stored with consent only' },
        { label: 'Messages', value: stats.turns, icon: 'MessagesSquare', note: 'User + assistant turns' },
        { label: 'Handed to counsellors', value: stats.handedOff, icon: 'UserCheck', note: 'Escalated sessions' },
        { label: 'New in last 7 days', value: stats.last7Days, icon: 'TrendingUp', note: 'Conversations started' },
    ];

    return (
        <>
            <AdminPageHeader
                title="AI assistant"
                description="Usage of the grounded admission assistant. Answers are built only from platform content (colleges, courses, exams, articles, FAQs) and every answer cites the pages it used."
                icon="Sparkles"
                breadcrumbs={[{ label: 'AI assistant' }]}
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/ai-assistant">
                                Open public assistant
                                <ArrowUpRight className="h-4 w-4" aria-hidden />
                            </Link>
                        </Button>
                        <Button asChild variant="navy" size="sm">
                            <Link href="/admin/settings">
                                <Settings className="h-4 w-4" aria-hidden />
                                Edit AI settings
                            </Link>
                        </Button>
                    </>
                }
            />

            <ul className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map((card) => (
                    <li key={card.label} className="rounded-panel border border-line bg-white p-3.5 shadow-card">
                        <IconTile icon={card.icon} tone="navy" size="sm" />
                        <p className="mt-2 text-[20px] font-extrabold leading-none text-navy-800">
                            {card.value.toLocaleString('en-IN')}
                        </p>
                        <p className="mt-1 text-[11.5px] font-semibold text-ink">{card.label}</p>
                        <p className="mt-0.5 text-[10.5px] text-ink-soft">{card.note}</p>
                    </li>
                ))}
            </ul>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <SectionCard
                    title="Recent conversations"
                    icon="MessageCircle"
                    description="Newest 25 sessions. Only sessions where the visitor opted in are stored."
                >
                    {conversations.length === 0 ? (
                        <EmptyState
                            icon="MessageCircle"
                            title="No stored conversations yet"
                            description="Visitors can chat without being recorded. A session appears here only when the visitor ticks the follow-up consent box."
                            className="py-8"
                        />
                    ) : (
                        <ul className="divide-y divide-line">
                            {conversations.map((conversation) => (
                                <li key={conversation.id} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone={conversation.handedOff ? 'green' : 'neutral'}>
                                            {conversation.handedOff ? 'Handed off' : 'Self-serve'}
                                        </Badge>
                                        {conversation.flagged ? <Badge tone="red">Flagged</Badge> : null}
                                        <Badge tone={conversation.sourceCount > 0 ? 'navy' : 'amber'}>
                                            {conversation.sourceCount} source{conversation.sourceCount === 1 ? '' : 's'}
                                        </Badge>
                                        <span className="text-[11px] text-ink-soft">
                                            {conversation.turns} message{conversation.turns === 1 ? '' : 's'}
                                        </span>
                                        <span className="ml-auto text-[11px] text-ink-soft">
                                            {conversation.userLabel} •{' '}
                                            {formatDate(conversation.updatedAt, {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>

                                    <p className="mt-1.5 text-[12.5px] font-semibold text-ink">
                                        {conversation.firstQuestion}
                                    </p>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                                        {truncate(conversation.lastAnswer, 200)}
                                    </p>
                                    <p className="mt-1 font-mono text-[10px] text-ink-soft">
                                        session {conversation.sessionId.slice(0, 12)} • {conversation.provider ?? '—'}/
                                        {conversation.model ?? '—'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <div className="space-y-4">
                    <SectionCard title="Current configuration" icon="Cog">
                        <dl className="space-y-2 text-[12px]">
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-ink-soft">Status</dt>
                                <dd>
                                    <Badge tone={config.enabled ? 'green' : 'red'}>
                                        {config.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-ink-soft">Provider</dt>
                                <dd className="font-semibold text-ink">{config.provider}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-ink-soft">Model</dt>
                                <dd className="truncate font-semibold text-ink">{config.model}</dd>
                            </div>
                            <div>
                                <dt className="text-ink-soft">Disclaimer</dt>
                                <dd className="mt-0.5 rounded-[9px] border border-line bg-muted/60 p-2 text-[11.5px] leading-relaxed text-ink">
                                    {config.disclaimer}
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
                            Provider and model come from environment variables (<code>AI_PROVIDER</code>,{' '}
                            <code>AI_MODEL</code>) and can only be changed at deploy time.
                        </p>
                    </SectionCard>

                    <SectionCard
                        title="Where to edit copy & prompt"
                        icon="Settings"
                        description="Settings → group “AI assistant”"
                    >
                        <ul className="space-y-1.5">
                            {CONFIG_KEYS.map((item) => (
                                <li key={item.key} className="rounded-[9px] border border-line px-2.5 py-2">
                                    <p className="font-mono text-[11px] font-bold text-navy-700">{item.key}</p>
                                    <p className="text-[11.5px] text-ink-soft">{item.label}</p>
                                </li>
                            ))}
                        </ul>
                        <Button asChild variant="outline" size="sm" full className="mt-3">
                            <Link href="/admin/settings">
                                <Settings className="h-4 w-4" aria-hidden />
                                Open system settings
                            </Link>
                        </Button>
                    </SectionCard>
                </div>
            </div>
        </>
    );
}
