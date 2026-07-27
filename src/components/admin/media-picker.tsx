'use client';

import * as React from 'react';
import { AlertTriangle, Check, Loader2, Search, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn, formatBytes } from '@/lib/utils';

/**
 * Media library browser and uploader.
 *
 * One component serves every image field in the console: single-select for a logo
 * or banner, multi-select for a gallery. It reads through `/api/admin/media` and
 * uploads through `/api/admin/upload`, so permissions and MIME/size validation
 * stay server-side — this is purely the picking surface.
 */

export interface PickedAsset {
    id?: string;
    url: string;
    alt?: string;
    width?: number;
    height?: number;
}

interface LibraryAsset {
    id: string;
    url: string;
    fileName: string;
    originalName: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    altText?: string;
    folder: string;
}

export interface MediaPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (assets: PickedAsset[]) => void;
    multiple?: boolean;
    /** Restrict the library to one kind. Defaults to images. */
    kind?: 'image' | 'document' | 'video';
    title?: string;
}

export function MediaPicker({
    open,
    onClose,
    onSelect,
    multiple = false,
    kind = 'image',
    title,
}: MediaPickerProps) {
    const [assets, setAssets] = React.useState<LibraryAsset[]>([]);
    const [folders, setFolders] = React.useState<string[]>([]);
    const [query, setQuery] = React.useState('');
    const [folder, setFolder] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [selected, setSelected] = React.useState<Record<string, LibraryAsset>>({});
    const [uploading, setUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    /* Reset per opening so a previous selection never leaks into a new field. */
    React.useEffect(() => {
        if (open) {
            setSelected({});
            setQuery('');
            setFolder('');
            setPage(1);
            setError(null);
        }
    }, [open]);

    const load = React.useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ kind, page: String(page) });
                if (query) params.set('q', query);
                if (folder) params.set('folder', folder);

                const response = await fetch(`/api/admin/media?${params.toString()}`, { signal });
                const data = (await response.json()) as {
                    items?: LibraryAsset[];
                    folders?: string[];
                    totalPages?: number;
                    error?: string;
                };

                if (!response.ok) throw new Error(data.error ?? 'Could not load media.');

                setAssets(data.items ?? []);
                setFolders(data.folders ?? []);
                setTotalPages(data.totalPages ?? 1);
            } catch (caught) {
                if ((caught as Error).name === 'AbortError') return;
                setError(caught instanceof Error ? caught.message : 'Could not load media.');
            } finally {
                setLoading(false);
            }
        },
        [folder, kind, page, query],
    );

    /* Debounced so typing in the search box does not fire a request per keystroke. */
    React.useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        const timer = setTimeout(() => void load(controller.signal), query ? 300 : 0);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [open, load, query]);

    const toggle = (asset: LibraryAsset) => {
        setSelected((previous) => {
            if (previous[asset.id]) {
                const { [asset.id]: _removed, ...rest } = previous;
                return rest;
            }
            return multiple ? { ...previous, [asset.id]: asset } : { [asset.id]: asset };
        });
    };

    const confirm = () => {
        const picked = Object.values(selected).map((asset) => ({
            id: asset.id,
            url: asset.url,
            alt: asset.altText,
            width: asset.width,
            height: asset.height,
        }));
        if (picked.length === 0) return;
        onSelect(picked);
        onClose();
    };

    const upload = async (files: FileList) => {
        setUploading(true);
        setError(null);

        const uploaded: PickedAsset[] = [];
        const failures: string[] = [];

        for (const file of Array.from(files)) {
            const body = new FormData();
            body.append('file', file);
            body.append('folder', folder || '/');

            try {
                const response = await fetch('/api/admin/upload', { method: 'POST', body });
                const data = (await response.json()) as {
                    asset?: { id: string; url: string };
                    error?: string;
                };

                if (!response.ok || !data.asset) {
                    failures.push(`${file.name}: ${data.error ?? 'upload failed'}`);
                    continue;
                }
                uploaded.push({ id: data.asset.id, url: data.asset.url });
            } catch {
                failures.push(`${file.name}: network error`);
            }
        }

        setUploading(false);
        if (failures.length > 0) setError(failures.join(' • '));

        if (uploaded.length > 0) {
            // Freshly uploaded files are what the editor wanted — attach immediately
            // rather than making them hunt for them in the grid.
            onSelect(uploaded);
            if (failures.length === 0) onClose();
            else void load();
        }
    };

    const selectedCount = Object.keys(selected).length;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title ?? (multiple ? 'Add images' : 'Choose an image')}
            description="Pick from the media library, or upload a new file."
            size="full"
            footer={
                <>
                    <Button type="button" variant="primary" onClick={confirm} disabled={selectedCount === 0}>
                        <Check className="h-4 w-4" aria-hidden />
                        {selectedCount > 0
                            ? `Use ${selectedCount} ${selectedCount === 1 ? 'file' : 'files'}`
                            : 'Use selected'}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <span className="ml-auto text-[11.5px] text-ink-soft">
                        JPEG, PNG, WebP, AVIF or SVG up to 5 MB
                    </span>
                </>
            }
        >
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                        aria-hidden
                    />
                    <label className="sr-only" htmlFor="media-picker-search">
                        Search media
                    </label>
                    <input
                        id="media-picker-search"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by file name, alt text or tag…"
                        className="h-9 w-full rounded-[9px] border border-line bg-white pl-8 pr-3 text-[12.5px] outline-none focus:border-navy-300"
                    />
                </div>

                <label className="sr-only" htmlFor="media-picker-folder">
                    Folder
                </label>
                <select
                    id="media-picker-folder"
                    value={folder}
                    onChange={(event) => {
                        setFolder(event.target.value);
                        setPage(1);
                    }}
                    className="h-9 rounded-[9px] border border-line bg-white px-2 text-[12.5px]"
                >
                    <option value="">All folders</option>
                    {folders.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                    multiple={multiple}
                    className="sr-only"
                    onChange={(event) => {
                        if (event.target.files?.length) void upload(event.target.files);
                        event.target.value = '';
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploading}
                    loadingText="Uploading…"
                >
                    <Upload className="h-4 w-4" aria-hidden />
                    Upload
                </Button>
            </div>

            {error ? (
                <p
                    role="alert"
                    className="mb-3 flex items-start gap-2 rounded-[9px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-alert"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {error}
                </p>
            ) : null}

            {loading ? (
                <p className="flex items-center justify-center gap-2 py-12 text-[12.5px] text-ink-soft">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading media…
                </p>
            ) : assets.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="text-[13px] font-bold text-ink">Nothing in the library yet</p>
                    <p className="mt-1 text-[12px] text-ink-soft">
                        Upload a file to get started. Uploads are stored through the configured
                        storage provider.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {assets.map((asset) => {
                        const isSelected = Boolean(selected[asset.id]);
                        return (
                            <li key={asset.id}>
                                <button
                                    type="button"
                                    onClick={() => toggle(asset)}
                                    aria-pressed={isSelected}
                                    className={cn(
                                        'group relative block w-full overflow-hidden rounded-[10px] border-2 bg-page text-left transition-colors',
                                        isSelected
                                            ? 'border-orange'
                                            : 'border-transparent hover:border-navy-200',
                                    )}
                                >
                                    <span className="block aspect-[4/3] overflow-hidden bg-muted">
                                        {/*
                                          A plain <img> on purpose: these are
                                          arbitrary library URLs, and next/image
                                          would need every storage host in
                                          remotePatterns to avoid a 400.
                                        */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={asset.url}
                                            alt={asset.altText ?? asset.originalName}
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    </span>
                                    <span className="block truncate px-2 py-1 text-[10.5px] text-ink">
                                        {asset.originalName}
                                    </span>
                                    <span className="block px-2 pb-1.5 text-[10px] text-ink-soft">
                                        {asset.width && asset.height
                                            ? `${asset.width}×${asset.height} • `
                                            : ''}
                                        {formatBytes(asset.sizeBytes)}
                                    </span>
                                    {isSelected ? (
                                        <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange text-white">
                                            <Check className="h-3 w-3" aria-hidden />
                                        </span>
                                    ) : null}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {totalPages > 1 ? (
                <div className="mt-3 flex items-center justify-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-[12px] text-ink-soft">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            ) : null}
        </Modal>
    );
}
