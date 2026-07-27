'use client';

import * as React from 'react';
import { CheckCircle2, Play, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/field';
import { parseVideoUrl, videoProviderLabel } from '@/lib/media/video';

/**
 * Single video URL field with a live preview.
 *
 * The point of the preview is that an editor finds out the link is wrong here,
 * not after publishing — a bad embed renders as a blank box on the public page
 * with nothing to indicate why.
 */
export interface VideoUrlFieldProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    invalid?: boolean;
}

export function VideoUrlField({ id, value, onChange, onBlur, invalid }: VideoUrlFieldProps) {
    const parsed = React.useMemo(() => (value ? parseVideoUrl(value) : null), [value]);
    const unrecognised = Boolean(value) && !parsed;

    return (
        <div className="space-y-2">
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                invalid={invalid || unrecognised}
                placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                aria-describedby={`${id}-status`}
            />

            <p id={`${id}-status`} className="text-[11.5px]">
                {unrecognised ? (
                    <span className="flex items-center gap-1.5 font-semibold text-red-alert">
                        <XCircle className="h-3.5 w-3.5" aria-hidden />
                        Not a supported video link. Use YouTube, Vimeo, or a direct .mp4 URL.
                    </span>
                ) : parsed ? (
                    <span className="flex items-center gap-1.5 font-semibold text-green">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {videoProviderLabel(parsed.provider)} video recognised
                    </span>
                ) : (
                    <span className="text-ink-soft">
                        Paste a link to embed a campus tour. Leave empty for none.
                    </span>
                )}
            </p>

            {parsed ? (
                <div className="relative max-w-[320px] overflow-hidden rounded-[9px] border border-line bg-muted">
                    <div className="aspect-video">
                        {parsed.thumbnailUrl ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={parsed.thumbnailUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Play className="h-8 w-8 text-white" aria-hidden />
                                </span>
                            </>
                        ) : (
                            <span className="flex h-full items-center justify-center gap-2 text-[12px] text-ink-soft">
                                <Play className="h-4 w-4" aria-hidden />
                                Preview unavailable — the link is still valid
                            </span>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
