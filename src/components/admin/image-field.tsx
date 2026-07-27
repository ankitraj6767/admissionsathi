'use client';

import * as React from 'react';
import { ImagePlus, Replace, Trash2 } from 'lucide-react';
import { MediaPicker, type PickedAsset } from '@/components/admin/media-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * Single-image field (logo, banner, hero, thumbnail, counsellor photo).
 *
 * Stores the shape the models already use for `ImageRef`, so nothing downstream
 * changes: `{ url, alt, width, height, mediaId }`. Width and height are carried
 * through from the library because `next/image` needs them to reserve space and
 * avoid layout shift.
 */

export interface ImageValue {
    url?: string;
    alt?: string;
    width?: number;
    height?: number;
    mediaId?: string;
}

export interface ImageFieldProps {
    id?: string;
    value?: ImageValue | null;
    onChange: (value: ImageValue | undefined) => void;
    label?: string;
    invalid?: boolean;
    /** Preview box aspect ratio. Logos read better square. */
    aspect?: 'square' | 'wide' | 'video';
}

const ASPECT_CLASS = {
    square: 'aspect-square max-w-[140px]',
    wide: 'aspect-[3/1]',
    video: 'aspect-video max-w-[280px]',
} as const;

export function ImageField({
    id,
    value,
    onChange,
    label,
    invalid,
    aspect = 'video',
}: ImageFieldProps) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const hasImage = Boolean(value?.url);

    const apply = (assets: PickedAsset[]) => {
        const asset = assets[0];
        if (!asset) return;
        onChange({
            url: asset.url,
            // Keep any alt text the editor already wrote for this field.
            alt: value?.alt || asset.alt || '',
            width: asset.width,
            height: asset.height,
            mediaId: asset.id,
        });
    };

    return (
        <div
            className={cn(
                'rounded-[10px] border bg-white p-2.5',
                invalid ? 'border-red-alert' : 'border-line',
            )}
        >
            {hasImage ? (
                <div className="flex flex-wrap items-start gap-3">
                    <div
                        className={cn(
                            'w-full shrink-0 overflow-hidden rounded-[8px] border border-line bg-muted',
                            ASPECT_CLASS[aspect],
                        )}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={value!.url}
                            alt={value?.alt || 'Selected image preview'}
                            className="h-full w-full object-contain"
                        />
                    </div>

                    <div className="min-w-[200px] flex-1 space-y-2">
                        <div>
                            <label
                                className="mb-1 block text-[11.5px] font-semibold text-ink"
                                htmlFor={`${id}-alt`}
                            >
                                Alt text
                            </label>
                            <Input
                                id={`${id}-alt`}
                                value={value?.alt ?? ''}
                                onChange={(event) => onChange({ ...value, alt: event.target.value })}
                                placeholder="Describe the image for screen readers"
                                className="h-9 text-[12.5px]"
                            />
                            <p className="mt-1 text-[11px] text-ink-soft">
                                Required for accessibility. Describe what is shown, not
                                &ldquo;image of&rdquo;.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                                <Replace className="h-4 w-4" aria-hidden />
                                Replace
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onChange(undefined)}
                            >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    id={id}
                    onClick={() => setPickerOpen(true)}
                    className="flex w-full flex-col items-center gap-1.5 rounded-[8px] border border-dashed border-line bg-page px-4 py-6 text-center transition-colors hover:border-navy-300 hover:bg-navy-50/40"
                >
                    <ImagePlus className="h-6 w-6 text-ink-soft" aria-hidden />
                    <span className="text-[12.5px] font-bold text-navy-700">
                        Choose or upload an image
                    </span>
                    <span className="text-[11px] text-ink-soft">
                        JPEG, PNG, WebP, AVIF or SVG up to 5 MB
                    </span>
                </button>
            )}

            <MediaPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={apply}
                title={label ? `Choose ${label.toLowerCase()}` : 'Choose an image'}
            />
        </div>
    );
}
