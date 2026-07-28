'use client';

import { useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { CheckCircle2, ExternalLink, Save, Trash2 } from 'lucide-react';
import { createResourceAction, deleteResourceAction, updateResourceAction } from '@/actions/admin/crud.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { ImageField, type ImageValue } from '@/components/admin/image-field';
import { GalleryField, type GalleryItemValue } from '@/components/admin/gallery-field';
import { VideoUrlField } from '@/components/admin/video-url-field';
import { UrlField } from '@/components/admin/url-field';
import { cn, slugify } from '@/lib/utils';
import type { AdminField, AdminResource } from '@/config/admin-resources';

/**
 * The editor is the heaviest part of this form and most resources have no
 * richtext field at all, so it is fetched only when one is actually rendered
 * rather than shipped with every create/edit screen.
 */
const RichTextEditor = dynamic(
    () => import('@/components/admin/rich-text-editor').then((m) => m.RichTextEditor),
    {
        ssr: false,
        loading: () => <div className="skeleton h-64 w-full rounded-[10px]" aria-hidden />,
    },
);

export interface ResourceFormProps {
    resource: Pick<
        AdminResource,
        'key' | 'label' | 'labelSingular' | 'fields' | 'titleField' | 'slugField'
    >;
    mode: 'create' | 'edit';
    docId?: string;
    initialValues: Record<string, unknown>;
    referenceOptions: Record<string, { label: string; value: string }[]>;
    publicUrl?: string;
    canDelete: boolean;
}

function readPath(values: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
        if (value && typeof value === 'object') return (value as Record<string, unknown>)[key];
        return undefined;
    }, values);
}

/**
 * Reads a field out of React Hook Form state, nested path first then literal key.
 *
 * RHF treats `.` in a field name as a path, so editing `contact.website` writes
 * `{ contact: { website } }` while the untouched default still sits under the
 * literal `'contact.website'` key. Resolving nested-first is what makes an edit
 * win over the stale default; the literal fallback mirrors RHF's own `get` and is
 * what returns the stored value for a field nobody touched.
 */
function readFormValue(values: Record<string, unknown>, path: string): unknown {
    if (!path.includes('.')) return values[path];

    const nested = readPath(values, path);
    return nested === undefined ? values[path] : nested;
}

/**
 * Collapses RHF state back into the flat, dotted payload the resource schema and
 * the Mongo `$set` are keyed by. Driven by the field list rather than by walking
 * the object, so a stray nested key can never reach the server.
 */
function toFlatPayload(
    fields: AdminField[],
    values: Record<string, unknown>,
): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    fields
        .filter((field) => !field.readOnly)
        .forEach((field) => {
            payload[field.name] = readFormValue(values, field.name);
        });
    return payload;
}

/** Field errors are stored nested for dotted names, so they read the same way. */
function readFieldError(
    errors: Record<string, unknown>,
    path: string,
): string | undefined {
    const entry = readFormValue(errors, path) as { message?: unknown } | undefined;
    return typeof entry?.message === 'string' ? entry.message : undefined;
}

function toInputValue(field: AdminField, value: unknown): unknown {
    if (value === undefined || value === null) {
        if (field.type === 'boolean') return false;
        if (field.type === 'multiselect' || field.type === 'tags') return [];
        if (field.type === 'gallery') return [];
        // `image` stays undefined rather than '' so a cleared field is
        // distinguishable from one that was never set.
        if (field.type === 'image') return undefined;
        return '';
    }
    // Object and array shapes are handed to their controlled editors untouched.
    if (field.type === 'image' || field.type === 'gallery') return value;
    if (field.type === 'boolean') return Boolean(value);
    if (field.type === 'multiselect') return (value as string[]).map(String);
    if (field.type === 'tags') return (value as string[]).map(String);
    if (field.type === 'json') return JSON.stringify(value, null, 2);
    if (field.type === 'date') return new Date(String(value)).toISOString().slice(0, 10);
    if (field.type === 'datetime') return new Date(String(value)).toISOString().slice(0, 16);
    if (field.type === 'reference') return String(value);
    return String(value);
}

/** Generic create/edit form generated from the resource field configuration. */
export function ResourceForm({
    resource,
    mode,
    docId,
    initialValues,
    referenceOptions,
    publicUrl,
    canDelete,
}: ResourceFormProps) {
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const defaults = useMemo(() => {
        const out: Record<string, unknown> = {};
        resource.fields.forEach((field) => {
            out[field.name] = toInputValue(field, readPath(initialValues, field.name));
        });
        return out;
    }, [initialValues, resource.fields]);

    const {
        register,
        control,
        handleSubmit,
        setValue,
        getValues,
        setError: setFieldError,
        formState: { errors, isSubmitting },
    } = useForm<Record<string, unknown>>({ defaultValues: defaults });

    const groups = useMemo(() => {
        const map = new Map<string, AdminField[]>();
        resource.fields.forEach((field) => {
            const group = field.group ?? 'Details';
            map.set(group, [...(map.get(group) ?? []), field]);
        });
        return Array.from(map.entries());
    }, [resource.fields]);

    const onSubmit = async (values: Record<string, unknown>) => {
        setError(null);
        setMessage(null);

        const payload = toFlatPayload(resource.fields, values);

        const result =
            mode === 'create'
                ? await createResourceAction(resource.key, payload)
                : await updateResourceAction(resource.key, docId!, payload);

        if (result.ok) {
            setMessage(result.message ?? 'Saved.');
            if (mode === 'create') router.push(`/admin/${resource.key}/${result.data.id}`);
            else router.refresh();
            return;
        }

        if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) =>
                setFieldError(field, { message: messages[0] }),
            );
        }
        setError(result.error);
    };

    const onDelete = () => {
        if (!docId) return;
        if (!window.confirm(`Delete this ${resource.labelSingular.toLowerCase()}?`)) return;
        startTransition(async () => {
            const result = await deleteResourceAction(resource.key, docId);
            if (result.ok) router.push(`/admin/${resource.key}`);
            else setError(result.error);
        });
    };

    const renderField = (field: AdminField) => {
        const fieldError = readFieldError(errors as Record<string, unknown>, field.name);
        const id = `field-${field.name.replace(/\./g, '-')}`;

        if (field.type === 'boolean') {
            return (
                <label key={field.name} className="flex items-start gap-2 py-1.5 text-[12.5px] text-ink">
                    <Checkbox id={id} {...register(field.name)} />
                    <span>
                        {field.label}
                        {field.help ? <span className="block text-[11px] text-ink-soft">{field.help}</span> : null}
                    </span>
                </label>
            );
        }

        const inputControl = (() => {
            switch (field.type) {
                case 'textarea':
                    return <Textarea id={id} rows={3} invalid={Boolean(fieldError)} {...register(field.name)} />;
                case 'richtext':
                    // Controlled, not `register`, because the editor is a
                    // contentEditable surface rather than a native input.
                    return (
                        <Controller
                            name={field.name}
                            control={control}
                            render={({ field: controlled }) => (
                                <RichTextEditor
                                    id={id}
                                    label={field.label}
                                    value={typeof controlled.value === 'string' ? controlled.value : ''}
                                    onChange={controlled.onChange}
                                    onBlur={controlled.onBlur}
                                    invalid={Boolean(fieldError)}
                                    placeholder={field.placeholder ?? 'Start typing, or paste from a document…'}
                                    aria-describedby={
                                        fieldError ? `${id}-error` : field.help ? `${id}-hint` : undefined
                                    }
                                />
                            )}
                        />
                    );
                case 'image':
                    return (
                        <Controller
                            name={field.name}
                            control={control}
                            render={({ field: controlled }) => (
                                <ImageField
                                    id={id}
                                    label={field.label}
                                    aspect={field.imageAspect}
                                    value={controlled.value as ImageValue | undefined}
                                    onChange={controlled.onChange}
                                    invalid={Boolean(fieldError)}
                                />
                            )}
                        />
                    );
                case 'gallery':
                    return (
                        <Controller
                            name={field.name}
                            control={control}
                            render={({ field: controlled }) => (
                                <GalleryField
                                    id={id}
                                    value={(controlled.value as GalleryItemValue[]) ?? []}
                                    onChange={controlled.onChange}
                                    invalid={Boolean(fieldError)}
                                />
                            )}
                        />
                    );
                case 'url':
                    return (
                        <Controller
                            name={field.name}
                            control={control}
                            render={({ field: controlled }) => (
                                <UrlField
                                    id={id}
                                    value={typeof controlled.value === 'string' ? controlled.value : ''}
                                    onChange={controlled.onChange}
                                    onBlur={controlled.onBlur}
                                    invalid={Boolean(fieldError)}
                                    placeholder={field.placeholder}
                                />
                            )}
                        />
                    );
                case 'video':
                    return (
                        <Controller
                            name={field.name}
                            control={control}
                            render={({ field: controlled }) => (
                                <VideoUrlField
                                    id={id}
                                    value={typeof controlled.value === 'string' ? controlled.value : ''}
                                    onChange={controlled.onChange}
                                    onBlur={controlled.onBlur}
                                    invalid={Boolean(fieldError)}
                                />
                            )}
                        />
                    );
                case 'json':
                    return (
                        <Textarea
                            id={id}
                            rows={6}
                            className="font-mono text-[12px]"
                            invalid={Boolean(fieldError)}
                            {...register(field.name)}
                        />
                    );
                case 'number':
                    return (
                        <Input
                            id={id}
                            type="number"
                            step={field.step ?? 1}
                            min={field.min}
                            max={field.max}
                            invalid={Boolean(fieldError)}
                            {...register(field.name)}
                        />
                    );
                case 'date':
                    return <Input id={id} type="date" invalid={Boolean(fieldError)} {...register(field.name)} />;
                case 'datetime':
                    return <Input id={id} type="datetime-local" invalid={Boolean(fieldError)} {...register(field.name)} />;
                case 'select':
                    return (
                        <Select
                            id={id}
                            placeholder={field.required ? undefined : 'Not set'}
                            options={(field.options ?? []).map((option) => ({ label: String(option), value: String(option) }))}
                            invalid={Boolean(fieldError)}
                            {...register(field.name)}
                        />
                    );
                case 'multiselect':
                    return (
                        <select
                            id={id}
                            multiple
                            size={Math.min(6, (field.options ?? []).length || 4)}
                            className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-navy-300"
                            {...register(field.name)}
                        >
                            {(field.options ?? []).map((option) => (
                                <option key={String(option)} value={String(option)}>
                                    {String(option)}
                                </option>
                            ))}
                        </select>
                    );
                case 'reference': {
                    const options = referenceOptions[field.name] ?? [];
                    return (
                        <Select
                            id={id}
                            placeholder="Not set"
                            options={options}
                            invalid={Boolean(fieldError)}
                            {...register(field.name)}
                        />
                    );
                }
                case 'tags':
                    return (
                        <Input
                            id={id}
                            placeholder="Comma separated values"
                            invalid={Boolean(fieldError)}
                            defaultValue={(defaults[field.name] as string[])?.join(', ') ?? ''}
                            onChange={(e) =>
                                setValue(
                                    field.name,
                                    e.target.value
                                        .split(',')
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                )
                            }
                        />
                    );
                case 'slug':
                    return (
                        <div className="flex gap-2">
                            <Input id={id} invalid={Boolean(fieldError)} {...register(field.name)} />
                            <Button
                                type="button"
                                variant="outline"
                                size="md"
                                onClick={() => {
                                    const source = getValues(resource.titleField);
                                    if (typeof source === 'string') setValue(field.name, slugify(source));
                                }}
                            >
                                Generate
                            </Button>
                        </div>
                    );
                default:
                    return (
                        <Input
                            id={id}
                            placeholder={field.placeholder}
                            invalid={Boolean(fieldError)}
                            {...register(field.name)}
                        />
                    );
            }
        })();

        return (
            <Field
                key={field.name}
                label={field.label}
                htmlFor={id}
                required={field.required}
                error={fieldError}
                hint={field.help}
                className={cn(field.colSpan === 2 && 'sm:col-span-2')}
            >
                {inputControl}
            </Field>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {message ? (
                <p role="status" className="flex items-center gap-2 rounded-[10px] border border-green/30 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {message}
                </p>
            ) : null}
            {error ? (
                <p role="alert" className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-alert">
                    {error}
                </p>
            ) : null}

            {groups.map(([group, fields]) => (
                <section key={group} className="rounded-panel border border-line bg-white p-4 shadow-card">
                    <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-navy-700">{group}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">{fields.map(renderField)}</div>
                </section>
            ))}

            <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-panel border border-line bg-white/95 p-3 shadow-raised backdrop-blur">
                <Button type="submit" variant="primary" loading={isSubmitting} loadingText="Saving…">
                    <Save className="h-4 w-4" aria-hidden />
                    {mode === 'create' ? `Create ${resource.labelSingular.toLowerCase()}` : 'Save changes'}
                </Button>

                <Button asChild variant="outline">
                    <Link href={`/admin/${resource.key}`}>Back to list</Link>
                </Button>

                {publicUrl ? (
                    <Button asChild variant="ghost">
                        <Link href={publicUrl} target="_blank">
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            View live
                        </Link>
                    </Button>
                ) : null}

                {mode === 'edit' && canDelete ? (
                    <Button variant="danger" className="ml-auto" onClick={onDelete} disabled={pending}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Delete
                    </Button>
                ) : null}
            </div>
        </form>
    );
}
