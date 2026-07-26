'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { deleteMediaAction } from '@/actions/admin/media.actions';
import { formatDate } from '@/lib/utils';

export interface MediaRow {
    id: string;
    url: string;
    fileName: string;
    originalName: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    folder: string;
    altText?: string;
    tags: string[];
    usageCount: number;
    createdAt: string;
}

export function MediaLibrary({ assets }: { assets: MediaRow[] }) {
    const router = useRouter();
    const [folder, setFolder] = useState('/');
    const [altText, setAltText] = useState('');
    const [tags, setTags] = useState('');
    const [uploading, setUploading] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const upload = async (file: File) => {
        setUploading(true);
        setError(null);
        setNotice(null);

        const body = new FormData();
        body.append('file', file);
        body.append('folder', folder);
        body.append('altText', altText);
        body.append('tags', tags);

        try {
            const response = await fetch('/api/admin/upload', { method: 'POST', body });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) setError(data.error ?? 'Upload failed.');
            else {
                setNotice(`${file.name} uploaded.`);
                setAltText('');
                router.refresh();
            }
        } catch {
            setError('Upload failed. Check your connection and try again.');
        } finally {
            setUploading(false);
        }
    };

    const remove = (id: string) =>
        startTransition(async () => {
            if (!window.confirm('Delete this media asset?')) return;
            const result = await deleteMediaAction(id);
            setNotice(result.ok ? (result.message ?? 'Deleted.') : null);
            setError(result.ok ? null : result.error);
            router.refresh();
        });

    return (
        <div className="space-y-4">
            <section className="rounded-panel border border-line bg-white p-4 shadow-card">
                <h2 className="mb-3 text-[14px] font-extrabold text-navy-800">Upload media</h2>

                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Folder" htmlFor="media-folder">
                        <Input id="media-folder" value={folder} onChange={(e) => setFolder(e.target.value)} />
                    </Field>
                    <Field label="Alt text" htmlFor="media-alt" hint="Required for accessibility on images">
                        <Input id="media-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
                    </Field>
                    <Field label="Tags" htmlFor="media-tags" hint="Comma separated">
                        <Input id="media-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
                    </Field>
                </div>

                <Field
                    label="File"
                    htmlFor="media-file"
                    className="mt-3"
                    hint="Images up to 5 MB (JPEG, PNG, WebP, AVIF, SVG). Documents up to 15 MB (PDF, DOC, XLS, CSV)."
                >
                    <input
                        id="media-file"
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void upload(file);
                        }}
                        className="block w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[12.5px] file:mr-3 file:rounded-[8px] file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-white"
                    />
                </Field>

                {uploading ? (
                    <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Uploading…
                    </p>
                ) : null}
                {notice ? (
                    <p role="status" className="mt-2 text-[12.5px] font-semibold text-green">
                        {notice}
                    </p>
                ) : null}
                {error ? (
                    <p role="alert" className="mt-2 text-[12.5px] font-semibold text-red-alert">
                        {error}
                    </p>
                ) : null}
            </section>

            <section className="rounded-panel border border-line bg-white p-4 shadow-card">
                <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-[14px] font-extrabold text-navy-800">Library</h2>
                    <Badge tone="neutral">{assets.length} assets</Badge>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
                </div>

                {assets.length === 0 ? (
                    <EmptyState icon="Palette" title="No media uploaded yet" />
                ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {assets.map((asset) => (
                            <li key={asset.id} className="overflow-hidden rounded-[12px] border border-line">
                                <div className="relative aspect-[4/3] bg-muted">
                                    {asset.kind === 'image' ? (
                                        <Image
                                            src={asset.url}
                                            alt={asset.altText ?? asset.originalName}
                                            fill
                                            sizes="(min-width: 1024px) 20vw, 45vw"
                                            className="object-contain p-2"
                                        />
                                    ) : (
                                        <span className="flex h-full items-center justify-center text-[11px] font-bold uppercase text-ink-soft">
                                            {asset.mimeType.split('/')[1] ?? asset.kind}
                                        </span>
                                    )}
                                </div>

                                <div className="p-2">
                                    <p className="truncate text-[11.5px] font-bold text-ink">{asset.originalName}</p>
                                    <p className="text-[10px] text-ink-soft">
                                        {(asset.sizeBytes / 1024).toFixed(0)} KB • {formatDate(asset.createdAt)}
                                    </p>
                                    {asset.usageCount > 0 ? (
                                        <Badge tone="green" className="mt-1">
                                            in use ({asset.usageCount})
                                        </Badge>
                                    ) : null}

                                    <div className="mt-1.5 flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void navigator.clipboard.writeText(asset.url);
                                                setNotice('URL copied.');
                                            }}
                                            className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-[7px] border border-line text-[10.5px] font-bold text-ink hover:border-navy-200"
                                        >
                                            <Copy className="h-3 w-3" aria-hidden />
                                            Copy URL
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Delete ${asset.originalName}`}
                                            onClick={() => remove(asset.id)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-line text-ink-soft hover:border-red-alert/40 hover:text-red-alert"
                                        >
                                            <Trash2 className="h-3 w-3" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
