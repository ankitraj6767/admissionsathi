'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChevronDown,
    Eye,
    GripVertical,
    Loader2,
    RotateCcw,
    Save,
    Upload,
} from 'lucide-react';
import {
    publishHomepageDraftAction,
    reorderHomepageSectionsAction,
    resetHomepageSectionAction,
    toggleHomepageSectionAction,
    updateHomepageSectionAction,
} from '@/actions/admin/homepage.actions';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { HomepageSectionKey } from '@/config/constants';

export interface BuilderSection {
    key: HomepageSectionKey;
    name: string;
    isEnabled: boolean;
    displayOrder: number;
    heading?: string;
    subheading?: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    config: Record<string, unknown>;
    hasUnpublishedChanges: boolean;
}

/**
 * Homepage builder: reorder with drag-and-drop, toggle sections, edit copy and
 * edit the validated section config. Config is JSON so new keys never need a
 * new UI, and the server validates it against the section schema.
 */
export function HomepageBuilder({ sections }: { sections: BuilderSection[] }) {
    const router = useRouter();
    const [order, setOrder] = useState<HomepageSectionKey[]>(sections.map((section) => section.key));
    const [dragKey, setDragKey] = useState<string | null>(null);
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const ordered = order
        .map((key) => sections.find((section) => section.key === key))
        .filter((section): section is BuilderSection => Boolean(section));

    const onDrop = (targetKey: HomepageSectionKey) => {
        if (!dragKey || dragKey === targetKey) return;
        const next = [...order];
        const from = next.indexOf(dragKey as HomepageSectionKey);
        const to = next.indexOf(targetKey);
        next.splice(to, 0, next.splice(from, 1)[0]!);
        setOrder(next);
        setDragKey(null);
    };

    const saveOrder = () =>
        startTransition(async () => {
            const result = await reorderHomepageSectionsAction({ order });
            setNotice(result.ok ? (result.message ?? 'Order saved.') : result.error);
            router.refresh();
        });

    const toggle = (key: HomepageSectionKey, isEnabled: boolean) =>
        startTransition(async () => {
            const result = await toggleHomepageSectionAction(key, isEnabled);
            setNotice(result.ok ? (result.message ?? 'Updated.') : result.error);
            router.refresh();
        });

    const publishDraft = (key: HomepageSectionKey) =>
        startTransition(async () => {
            const result = await publishHomepageDraftAction(key);
            setNotice(result.ok ? (result.message ?? 'Published.') : result.error);
            router.refresh();
        });

    const reset = (key: HomepageSectionKey) =>
        startTransition(async () => {
            if (!window.confirm('Reset this section to the default configuration?')) return;
            const result = await resetHomepageSectionAction(key);
            setNotice(result.ok ? (result.message ?? 'Reset.') : result.error);
            router.refresh();
        });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-panel border border-line bg-white p-3 shadow-card">
                <p className="text-[12.5px] text-ink-soft">
                    Drag sections to reorder, then save. Toggling a section hides it from the live homepage instantly.
                </p>
                <span className="ml-auto flex items-center gap-2">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
                    <Button variant="navy" size="sm" onClick={saveOrder}>
                        <Save className="h-3.5 w-3.5" aria-hidden />
                        Save order
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/" target="_blank">
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            Preview homepage
                        </Link>
                    </Button>
                </span>
            </div>

            {notice ? (
                <p role="status" className="rounded-[10px] border border-green/30 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                    {notice}
                </p>
            ) : null}

            <ul className="space-y-2">
                {ordered.map((section, index) => (
                    <li
                        key={section.key}
                        draggable
                        onDragStart={() => setDragKey(section.key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(section.key)}
                        className={cn(
                            'rounded-panel border bg-white shadow-card transition-colors',
                            dragKey === section.key ? 'border-orange' : 'border-line',
                        )}
                    >
                        <div className="flex flex-wrap items-center gap-2 p-3">
                            <span className="cursor-grab text-ink-soft" aria-hidden>
                                <GripVertical className="h-4 w-4" />
                            </span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-50 text-[10.5px] font-bold text-navy-700">
                                {index + 1}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-extrabold text-ink">{section.name}</span>
                                <span className="block truncate text-[11px] text-ink-soft">
                                    key: {section.key}
                                    {section.heading ? ` • “${section.heading}”` : ''}
                                </span>
                            </span>

                            {section.hasUnpublishedChanges ? (
                                <Badge tone="amber">Draft pending</Badge>
                            ) : null}

                            <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
                                <input
                                    type="checkbox"
                                    checked={section.isEnabled}
                                    onChange={(e) => toggle(section.key, e.target.checked)}
                                    className="h-3.5 w-3.5 accent-orange"
                                />
                                {section.isEnabled ? 'Enabled' : 'Disabled'}
                            </label>

                            <button
                                type="button"
                                onClick={() => setOpenKey(openKey === section.key ? null : section.key)}
                                aria-expanded={openKey === section.key}
                                className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-line px-2.5 text-[11.5px] font-bold text-ink hover:border-navy-200"
                            >
                                Edit
                                <ChevronDown
                                    className={cn('h-3.5 w-3.5 transition-transform', openKey === section.key && 'rotate-180')}
                                    aria-hidden
                                />
                            </button>
                        </div>

                        {openKey === section.key ? (
                            <SectionEditor
                                section={section}
                                onSaved={(message) => {
                                    setNotice(message);
                                    router.refresh();
                                }}
                                onPublishDraft={() => publishDraft(section.key)}
                                onReset={() => reset(section.key)}
                            />
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SectionEditor({
    section,
    onSaved,
    onPublishDraft,
    onReset,
}: {
    section: BuilderSection;
    onSaved: (message: string) => void;
    onPublishDraft: () => void;
    onReset: () => void;
}) {
    const [heading, setHeading] = useState(section.heading ?? '');
    const [subheading, setSubheading] = useState(section.subheading ?? '');
    const [description, setDescription] = useState(section.description ?? '');
    const [ctaLabel, setCtaLabel] = useState(section.ctaLabel ?? '');
    const [ctaUrl, setCtaUrl] = useState(section.ctaUrl ?? '');
    const [config, setConfig] = useState(JSON.stringify(section.config ?? {}, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async (saveAsDraft: boolean) => {
        setError(null);
        setSaving(true);

        let parsedConfig: unknown;
        try {
            parsedConfig = JSON.parse(config);
        } catch {
            setSaving(false);
            setError('Section configuration is not valid JSON.');
            return;
        }

        const result = await updateHomepageSectionAction({
            key: section.key,
            heading,
            subheading,
            description,
            ctaLabel,
            ctaUrl,
            config: parsedConfig,
            saveAsDraft,
        });

        setSaving(false);
        if (result.ok) onSaved(result.message ?? 'Saved.');
        else setError(result.error);
    };

    return (
        <div className="space-y-3 border-t border-line p-3">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Heading" htmlFor={`heading-${section.key}`}>
                    <Input id={`heading-${section.key}`} value={heading} onChange={(e) => setHeading(e.target.value)} />
                </Field>
                <Field label="Subheading" htmlFor={`sub-${section.key}`}>
                    <Input id={`sub-${section.key}`} value={subheading} onChange={(e) => setSubheading(e.target.value)} />
                </Field>
                <Field label="Description" htmlFor={`desc-${section.key}`} className="sm:col-span-2">
                    <Textarea
                        id={`desc-${section.key}`}
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Field>
                <Field label="CTA label" htmlFor={`cta-${section.key}`}>
                    <Input id={`cta-${section.key}`} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                </Field>
                <Field label="CTA URL" htmlFor={`ctaurl-${section.key}`}>
                    <Input id={`ctaurl-${section.key}`} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                </Field>
            </div>

            <Field
                label="Section configuration (JSON)"
                htmlFor={`config-${section.key}`}
                hint="Validated against this section's schema on save — invalid keys are rejected."
            >
                <Textarea
                    id={`config-${section.key}`}
                    rows={12}
                    className="font-mono text-[11.5px]"
                    value={config}
                    onChange={(e) => setConfig(e.target.value)}
                />
            </Field>

            {error ? (
                <p role="alert" className="text-[12px] font-semibold text-red-alert">
                    {error}
                </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" loading={saving} onClick={() => submit(false)}>
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    Publish section
                </Button>
                <Button variant="outline" size="sm" onClick={() => submit(true)} disabled={saving}>
                    Save as draft
                </Button>
                {section.hasUnpublishedChanges ? (
                    <Button variant="soft" size="sm" onClick={onPublishDraft}>
                        Publish saved draft
                    </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={onReset}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Reset to default
                </Button>
            </div>
        </div>
    );
}
