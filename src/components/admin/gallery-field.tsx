'use client';

import * as React from 'react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ImagePlus,
    Play,
    Trash2,
    Video,
} from 'lucide-react';
import { MediaPicker, type PickedAsset } from '@/components/admin/media-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Badge } from '@/components/ui/primitives';
import { parseVideoUrl, videoProviderLabel } from '@/lib/media/video';
import { cn } from '@/lib/utils';

/**
 * Gallery editor: an ordered list of images and embedded videos.
 *
 * Mirrors `GalleryItem` in `db/models/shared/base.ts` exactly, and derives a
 * video's `embedUrl`/`thumbnailUrl` here so the public page never parses a
 * provider URL while rendering.
 *
 * Reordering is buttons rather than drag and drop on purpose: a gallery is edited
 * rarely and often on a laptop trackpad, and Up/Down works for keyboard and
 * screen-reader users without a drag-and-drop library or a custom a11y story.
 */

export interface GalleryItemValue {
    kind: 'image' | 'video';
    url: string;
    alt?: string;
    caption?: string;
    width?: number;
    height?: number;
    mediaId?: string;
    videoProvider?: 'youtube' | 'vimeo' | 'file';
    embedUrl?: string;
    thumbnailUrl?: string;
    displayOrder: number;
}

export interface GalleryFieldProps {
    id?: string;
    value: GalleryItemValue[];
    onChange: (items: GalleryItemValue[]) => void;
    invalid?: boolean;
}

/** Keeps `displayOrder` equal to array position so it is never ambiguous. */
function reindex(items: GalleryItemValue[]): GalleryItemValue[] {
    return items.map((item, index) => ({ ...item, displayOrder: index }));
}

export function GalleryField({ id, value, onChange, invalid }: GalleryFieldProps) {
    const items = React.useMemo(() => value ?? [], [value]);

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [videoUrl, setVideoUrl] = React.useState('');
    const [videoError, setVideoError] = React.useState<string | null>(null);

    const imageCount = items.filter((item) => item.kind === 'image').length;
    const videoCount = items.length - imageCount;

    const addImages = (assets: PickedAsset[]) => {
        const additions: GalleryItemValue[] = assets.map((asset) => ({
            kind: 'image',
            url: asset.url,
            alt: asset.alt ?? '',
            width: asset.width,
            height: asset.height,
            mediaId: asset.id,
            displayOrder: 0,
        }));
        onChange(reindex([...items, ...additions]));
    };

    const addVideo = () => {
        const parsed = parseVideoUrl(videoUrl);
        if (!parsed) {
            setVideoError('Paste a YouTube or Vimeo link, or a direct .mp4 / .webm URL.');
            return;
        }

        const alreadyAdded = items.some(
            (item) => item.kind === 'video' && item.url === parsed.sourceUrl,
        );
        if (alreadyAdded) {
            setVideoError('That video is already in the gallery.');
            return;
        }

        setVideoError(null);
        setVideoUrl('');
        onChange(
            reindex([
                ...items,
                {
                    kind: 'video',
                    url: parsed.sourceUrl,
                    embedUrl: parsed.embedUrl,
                    thumbnailUrl: parsed.thumbnailUrl,
                    videoProvider: parsed.provider,
                    caption: '',
                    alt: '',
                    displayOrder: 0,
                },
            ]),
        );
    };

    const update = (index: number, patch: Partial<GalleryItemValue>) => {
        onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const remove = (index: number) => {
        onChange(reindex(items.filter((_, i) => i !== index)));
    };

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;

        const next = [...items];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved!);
        onChange(reindex(next));
    };

    return (
        <div
            className={cn(
                'space-y-3 rounded-[10px] border bg-white p-3',
                invalid ? 'border-red-alert' : 'border-line',
            )}
            id={id}
        >
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    Add images
                </Button>
                <span className="text-[11.5px] text-ink-soft">
                    {items.length === 0
                        ? 'Nothing added yet'
                        : `${imageCount} image${imageCount === 1 ? '' : 's'}, ${videoCount} video${videoCount === 1 ? '' : 's'}`}
                </span>
            </div>

            <div className="rounded-[9px] border border-line bg-page p-2.5">
                <label className="mb-1 block text-[11.5px] font-semibold text-ink" htmlFor={`${id}-video`}>
                    Add a video
                </label>
                <div className="flex flex-wrap gap-2">
                    <Input
                        id={`${id}-video`}
                        value={videoUrl}
                        onChange={(event) => {
                            setVideoUrl(event.target.value);
                            setVideoError(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                addVideo();
                            }
                        }}
                        placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                        invalid={Boolean(videoError)}
                        className="h-9 min-w-[220px] flex-1 text-[12.5px]"
                        aria-describedby={`${id}-video-hint`}
                    />
                    <Button type="button" variant="navy" size="sm" onClick={addVideo}>
                        <Video className="h-4 w-4" aria-hidden />
                        Add video
                    </Button>
                </div>
                {videoError ? (
                    <p
                        role="alert"
                        className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-red-alert"
                    >
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        {videoError}
                    </p>
                ) : (
                    <p id={`${id}-video-hint`} className="mt-1 text-[11px] text-ink-soft">
                        Videos are embedded from YouTube or Vimeo, so they stream from the
                        provider rather than using your storage.
                    </p>
                )}
            </div>

            {items.length > 0 ? (
                <ul className="space-y-2">
                    {items.map((item, index) => (
                        <li
                            key={`${item.url}-${index}`}
                            className="flex flex-wrap items-start gap-3 rounded-[9px] border border-line p-2"
                        >
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-[7px] border border-line bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.kind === 'video' ? (item.thumbnailUrl ?? '') : item.url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                                {item.kind === 'video' ? (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                                        <Play className="h-5 w-5 text-white" aria-hidden />
                                    </span>
                                ) : null}
                            </div>

                            <div className="min-w-[220px] flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Badge tone={item.kind === 'video' ? 'purple' : 'neutral'}>
                                        {item.kind === 'video'
                                            ? videoProviderLabel(item.videoProvider ?? 'file')
                                            : 'Image'}
                                    </Badge>
                                    <span className="truncate text-[11px] text-ink-soft">{item.url}</span>
                                </div>

                                <div className="grid gap-1.5 sm:grid-cols-2">
                                    {item.kind === 'image' ? (
                                        <label className="block">
                                            <span className="mb-0.5 block text-[11px] font-semibold text-ink">
                                                Alt text
                                            </span>
                                            <Input
                                                value={item.alt ?? ''}
                                                onChange={(event) => update(index, { alt: event.target.value })}
                                                placeholder="What the photo shows"
                                                className="h-8 text-[12px]"
                                            />
                                        </label>
                                    ) : null}
                                    <label className="block">
                                        <span className="mb-0.5 block text-[11px] font-semibold text-ink">
                                            Caption
                                        </span>
                                        <Input
                                            value={item.caption ?? ''}
                                            onChange={(event) => update(index, { caption: event.target.value })}
                                            placeholder="Shown under the tile (optional)"
                                            className="h-8 text-[12px]"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="iconSm"
                                    aria-label={`Move ${index + 1} up`}
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                >
                                    <ArrowUp className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="iconSm"
                                    aria-label={`Move ${index + 1} down`}
                                    disabled={index === items.length - 1}
                                    onClick={() => move(index, 1)}
                                >
                                    <ArrowDown className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="iconSm"
                                    aria-label={`Remove item ${index + 1}`}
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-[9px] border border-dashed border-line px-3 py-6 text-center text-[12px] text-ink-soft">
                    Add campus photos and a tour video. The first item becomes the gallery
                    cover on the public page.
                </p>
            )}

            <MediaPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={addImages}
                multiple
                title="Add images to the gallery"
            />
        </div>
    );
}
