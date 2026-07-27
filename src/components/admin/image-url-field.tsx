'use client';

import * as React from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MediaPicker, type PickedAsset } from '@/components/admin/media-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';

/**
 * Image field for values stored as a bare URL string rather than an `ImageRef`.
 *
 * Site settings (logo, dark logo, favicon) are plain strings consumed by
 * `resolveBranding`, so they cannot use `ImageField` without changing that
 * contract. The text input stays editable because these legitimately point at
 * packaged assets such as `/brand/logo.svg`, which are not in the media library.
 */
export interface ImageUrlFieldProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    label?: string;
}

export function ImageUrlField({ id, value, onChange, onBlur, label }: ImageUrlFieldProps) {
    const [pickerOpen, setPickerOpen] = React.useState(false);

    const apply = (assets: PickedAsset[]) => {
        const asset = assets[0];
        if (asset) onChange(asset.url);
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-2">
                {value ? (
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-line bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={value} alt="" className="h-full w-full object-contain p-1" />
                    </span>
                ) : null}

                <Input
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    placeholder="/brand/logo.svg or an https URL"
                    className="min-w-[180px] flex-1"
                />

                <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    Browse
                </Button>

                {value ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Clear ${label ?? 'image'}`}
                        onClick={() => onChange('')}
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </Button>
                ) : null}
            </div>

            <MediaPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={apply}
                title={label ? `Choose ${label.toLowerCase()}` : 'Choose an image'}
            />
        </div>
    );
}
