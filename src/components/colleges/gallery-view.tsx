'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, Play } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

/**
 * College gallery: a responsive tile grid plus a keyboard-navigable lightbox.
 *
 * A client component because the lightbox is interactive, but the tiles are
 * plain markup — the grid renders and is fully usable before hydration, so a
 * slow connection still sees the photos.
 *
 * Videos are only mounted as an `iframe` once their tile is opened. Embedding
 * every video up front would pull in a provider player per tile and dominate the
 * page's JavaScript and network cost for content most visitors never play.
 */

export interface GalleryTile {
    kind: 'image' | 'video';
    url: string;
    alt?: string;
    caption?: string;
    width?: number;
    height?: number;
    blurDataUrl?: string;
    embedUrl?: string;
    thumbnailUrl?: string;
    videoProvider?: 'youtube' | 'vimeo' | 'file';
}

export interface GalleryViewProps {
    items: GalleryTile[];
    collegeName: string;
    /** Legacy single campus-tour video, featured above the grid. */
    tourEmbedUrl?: string | null;
}

type Filter = 'all' | 'image' | 'video';

/**
 * `next/image` only accepts hosts listed in `remotePatterns`. Gallery URLs can
 * come from any configured storage provider, so anything not clearly local falls
 * back to an unoptimised `img` rather than rendering a 400.
 */
function isLocalAsset(url: string): boolean {
    return url.startsWith('/');
}

function Thumbnail({ item, index, collegeName }: { item: GalleryTile; index: number; collegeName: string }) {
    const src = item.kind === 'video' ? (item.thumbnailUrl ?? '') : item.url;
    const alt = item.alt || item.caption || `${collegeName} campus ${item.kind} ${index + 1}`;

    if (!src) {
        return (
            <span className="flex h-full w-full items-center justify-center bg-navy-800 text-white/70">
                <Play className="h-7 w-7" aria-hidden />
            </span>
        );
    }

    if (isLocalAsset(src)) {
        return (
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={item.blurDataUrl}
                // The first row is above the fold on most viewports.
                priority={index < 4}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            loading={index < 4 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
    );
}

export function GalleryView({ items, collegeName, tourEmbedUrl }: GalleryViewProps) {
    const [filter, setFilter] = React.useState<Filter>('all');
    const [openIndex, setOpenIndex] = React.useState<number | null>(null);

    const imageCount = items.filter((item) => item.kind === 'image').length;
    const videoCount = items.length - imageCount;

    const visible = React.useMemo(
        () => (filter === 'all' ? items : items.filter((item) => item.kind === filter)),
        [filter, items],
    );

    /* Reset the lightbox if filtering would leave it pointing at a different tile. */
    React.useEffect(() => {
        setOpenIndex(null);
    }, [filter]);

    const current = openIndex === null ? null : visible[openIndex];

    const step = React.useCallback(
        (direction: -1 | 1) => {
            setOpenIndex((previous) => {
                if (previous === null || visible.length === 0) return previous;
                // Wraps, so arrow keys never dead-end at either edge.
                return (previous + direction + visible.length) % visible.length;
            });
        },
        [visible.length],
    );

    const filters: { key: Filter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: items.length },
        { key: 'image', label: 'Photos', count: imageCount },
        { key: 'video', label: 'Videos', count: videoCount },
    ];

    return (
        <div className="space-y-3">
            {tourEmbedUrl ? (
                <div className="overflow-hidden rounded-panel border border-line bg-navy-900">
                    <div className="aspect-video">
                        <iframe
                            src={tourEmbedUrl}
                            title={`${collegeName} campus tour`}
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                        />
                    </div>
                </div>
            ) : null}

            {/* Only worth offering when there is a mix to filter. */}
            {imageCount > 0 && videoCount > 0 ? (
                <div role="group" aria-label="Filter gallery" className="flex flex-wrap gap-1.5">
                    {filters
                        .filter((option) => option.count > 0)
                        .map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                aria-pressed={filter === option.key}
                                onClick={() => setFilter(option.key)}
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold transition-colors',
                                    filter === option.key
                                        ? 'border-navy bg-navy text-white'
                                        : 'border-line bg-white text-ink hover:border-navy-200',
                                )}
                            >
                                {option.label}
                                <span
                                    className={cn(
                                        'text-[11px]',
                                        filter === option.key ? 'text-white/70' : 'text-ink-soft',
                                    )}
                                >
                                    {option.count}
                                </span>
                            </button>
                        ))}
                </div>
            ) : null}

            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((item, index) => (
                    <li key={`${item.url}-${index}`}>
                        <button
                            type="button"
                            onClick={() => setOpenIndex(index)}
                            className="group relative block w-full overflow-hidden rounded-[12px] border border-line bg-muted text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                        >
                            <span className="relative block aspect-[4/3] overflow-hidden">
                                <Thumbnail item={item} index={index} collegeName={collegeName} />

                                {item.kind === 'video' ? (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-card">
                                            <Play className="ml-0.5 h-5 w-5 text-navy-800" aria-hidden />
                                        </span>
                                    </span>
                                ) : (
                                    <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                        <Expand className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                )}
                            </span>

                            <span className="block px-2 py-1.5 text-[11.5px] text-ink-soft">
                                {item.caption || item.alt || (
                                    <span className="sr-only">
                                        {item.kind === 'video' ? 'Play video' : 'View photo'}
                                    </span>
                                )}
                            </span>

                            <span className="sr-only">
                                {item.kind === 'video'
                                    ? `Play video ${index + 1} of ${visible.length}`
                                    : `Open photo ${index + 1} of ${visible.length} full screen`}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            <Modal
                open={current !== null}
                onClose={() => setOpenIndex(null)}
                tone="dark"
                size="full"
                hideTitle
                title={
                    current?.caption ||
                    current?.alt ||
                    `${collegeName} gallery item ${(openIndex ?? 0) + 1} of ${visible.length}`
                }
                onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') step(1);
                    if (event.key === 'ArrowLeft') step(-1);
                }}
            >
                {current ? (
                    <div className="flex flex-col gap-3">
                        <div className="relative flex items-center justify-center">
                            {current.kind === 'video' && current.embedUrl ? (
                                <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-[12px] bg-black">
                                    {current.videoProvider === 'file' ? (
                                        // eslint-disable-next-line jsx-a11y/media-has-caption
                                        <video
                                            src={current.embedUrl}
                                            controls
                                            autoPlay
                                            className="h-full w-full"
                                        />
                                    ) : (
                                        <iframe
                                            src={`${current.embedUrl}?autoplay=1`}
                                            title={current.caption || `${collegeName} video`}
                                            referrerPolicy="strict-origin-when-cross-origin"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="h-full w-full"
                                        />
                                    )}
                                </div>
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={current.url}
                                    alt={current.alt || current.caption || `${collegeName} campus photo`}
                                    className="max-h-[75vh] w-auto max-w-full rounded-[12px] object-contain"
                                />
                            )}

                            {visible.length > 1 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => step(-1)}
                                        aria-label="Previous item"
                                        className="absolute left-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                                    >
                                        <ChevronLeft className="h-5 w-5" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => step(1)}
                                        aria-label="Next item"
                                        className="absolute right-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                                    >
                                        <ChevronRight className="h-5 w-5" aria-hidden />
                                    </button>
                                </>
                            ) : null}
                        </div>

                        <div className="text-center">
                            {current.caption || current.alt ? (
                                <p className="text-[13px] font-semibold text-white">
                                    {current.caption || current.alt}
                                </p>
                            ) : null}
                            <p aria-live="polite" className="mt-0.5 text-[11.5px] text-white/60">
                                {(openIndex ?? 0) + 1} of {visible.length}
                            </p>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
