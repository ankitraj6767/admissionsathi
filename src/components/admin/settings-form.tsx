'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { updateSettingsAction } from '@/actions/admin/settings.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { ImageUrlField } from '@/components/admin/image-url-field';
import { cn } from '@/lib/utils';

export interface SettingRow {
    key: string;
    group: string;
    label: string;
    description?: string;
    valueType: 'string' | 'number' | 'boolean' | 'json' | 'image' | 'richtext';
    value: unknown;
    isSecret: boolean;
}

const GROUP_LABELS: Record<string, string> = {
    general: 'General & branding',
    contact: 'Contact & utility bar',
    app: 'Mobile apps',
    social: 'Social links',
    whatsapp: 'WhatsApp community',
    ai: 'AI assistant',
    features: 'Feature switches',
    seo: 'SEO defaults',
    legal: 'Legal & consent',
    integrations: 'Integrations',
};

/** Grouped settings editor. Secret values are shown read-only. */
export function SettingsForm({ settings }: { settings: SettingRow[] }) {
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fieldNameByKey = new Map(
        settings.map((setting, index) => [setting.key, `setting_${index}`]),
    );

    const defaults = Object.fromEntries(
        settings.flatMap((setting) =>
            setting.isSecret
                ? []
                : [[
                    fieldNameByKey.get(setting.key)!,
                    setting.valueType === 'boolean'
                        ? Boolean(setting.value)
                        : setting.valueType === 'json'
                            ? JSON.stringify(setting.value ?? {}, null, 2)
                            : (setting.value ?? ''),
                ]],
        ),
    );

    const {
        register,
        control,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<Record<string, unknown>>({ defaultValues: defaults });

    const groups = Array.from(new Set(settings.map((setting) => setting.group)));

    const onSubmit = async (values: Record<string, unknown>) => {
        setMessage(null);
        setError(null);
        const flatValues = Object.fromEntries(
            settings.flatMap((setting) =>
                setting.isSecret
                    ? []
                    : [[setting.key, values[fieldNameByKey.get(setting.key)!]]],
            ),
        );
        const result = await updateSettingsAction({ values: flatValues });
        if (result.ok) {
            setMessage(result.message ?? 'Saved.');
            // Re-render the active root/admin layouts so branding changes are
            // visible immediately without a manual browser refresh.
            router.refresh();
        } else setError(result.error);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {message ? (
                <p role="status" className="rounded-[10px] border border-green/30 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                    {message}
                </p>
            ) : null}
            {error ? (
                <p role="alert" className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-alert">
                    {error}
                </p>
            ) : null}

            {groups.map((group) => (
                <section key={group} className="rounded-panel border border-line bg-white p-4 shadow-card">
                    <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-navy-700">
                        {GROUP_LABELS[group] ?? group}
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {settings
                            .filter((setting) => setting.group === group)
                            .map((setting) => {
                                const id = `setting-${setting.key.replace(/\./g, '-')}`;
                                const fieldName = fieldNameByKey.get(setting.key)!;

                                if (setting.isSecret) {
                                    return (
                                        <Field
                                            key={setting.key}
                                            label={setting.label}
                                            htmlFor={id}
                                            hint="Managed through environment variables"
                                        >
                                            <Input id={id} value="••••••••" readOnly disabled />
                                        </Field>
                                    );
                                }

                                if (setting.valueType === 'boolean') {
                                    return (
                                        <label key={setting.key} className="flex items-start gap-2 py-1.5 text-[12.5px] text-ink">
                                            <Checkbox id={id} {...register(fieldName)} />
                                            <span>
                                                {setting.label}
                                                {setting.description ? (
                                                    <span className="block text-[11px] text-ink-soft">{setting.description}</span>
                                                ) : null}
                                            </span>
                                        </label>
                                    );
                                }

                                const isLong = setting.valueType === 'richtext' || setting.valueType === 'json';

                                return (
                                    <Field
                                        key={setting.key}
                                        label={setting.label}
                                        htmlFor={id}
                                        hint={setting.description ?? setting.key}
                                        className={cn(isLong && 'sm:col-span-2')}
                                    >
                                        {setting.valueType === 'richtext' ? (
                                            <Controller
                                                name={fieldName}
                                                control={control}
                                                render={({ field }) => (
                                                    <RichTextEditor
                                                        id={id}
                                                        rows={5}
                                                        label={setting.label}
                                                        value={typeof field.value === 'string' ? field.value : ''}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                        aria-describedby={`${id}-hint`}
                                                    />
                                                )}
                                            />
                                        ) : setting.valueType === 'image' ? (
                                            <Controller
                                                name={fieldName}
                                                control={control}
                                                render={({ field }) => (
                                                    <ImageUrlField
                                                        id={id}
                                                        label={setting.label}
                                                        value={typeof field.value === 'string' ? field.value : ''}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                    />
                                                )}
                                            />
                                        ) : isLong ? (
                                            <Textarea
                                                id={id}
                                                rows={6}
                                                className="font-mono text-[12px]"
                                                {...register(fieldName)}
                                            />
                                        ) : (
                                            <Input
                                                id={id}
                                                type={setting.valueType === 'number' ? 'number' : 'text'}
                                                {...register(fieldName)}
                                            />
                                        )}
                                    </Field>
                                );
                            })}
                    </div>
                </section>
            ))}

            <div className="sticky bottom-0 rounded-panel border border-line bg-white/95 p-3 shadow-raised backdrop-blur">
                <Button type="submit" variant="primary" loading={isSubmitting} loadingText="Saving…">
                    <Save className="h-4 w-4" aria-hidden />
                    Save all settings
                </Button>
            </div>
        </form>
    );
}
