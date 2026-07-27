'use client';

import * as React from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/field';
import { displayHost, safeWebUrl } from '@/lib/url';

/**
 * External web address field with live validation and a "test" link.
 *
 * The feedback matters because a URL is the one field where an editor cannot tell
 * from the form whether it will work: a typo saves fine and then shows up as a
 * dead link on a public page. The same `safeWebUrl` runs on the server, so what is
 * previewed here is what gets stored.
 */
export interface UrlFieldProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    invalid?: boolean;
    placeholder?: string;
}

export function UrlField({ id, value, onChange, onBlur, invalid, placeholder }: UrlFieldProps) {
    const normalised = React.useMemo(() => (value ? safeWebUrl(value) : null), [value]);
    const unrecognised = Boolean(value.trim()) && !normalised;

    return (
        <div className="space-y-1.5">
            <Input
                id={id}
                type="url"
                inputMode="url"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                invalid={invalid || unrecognised}
                placeholder={placeholder ?? 'https://example.org'}
                aria-describedby={`${id}-status`}
            />

            <p id={`${id}-status`} className="text-[11.5px]">
                {unrecognised ? (
                    <span className="flex items-center gap-1.5 font-semibold text-red-alert">
                        <XCircle className="h-3.5 w-3.5" aria-hidden />
                        Enter a full web address, for example https://example.org
                    </span>
                ) : normalised ? (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1.5 font-semibold text-green">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            Links to {displayHost(normalised)}
                        </span>
                        <a
                            href={normalised}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-navy-600 underline underline-offset-2"
                        >
                            Test link
                            <ExternalLink className="h-3 w-3" aria-hidden />
                            <span className="sr-only">(opens in a new tab)</span>
                        </a>
                    </span>
                ) : (
                    <span className="text-ink-soft">Leave empty for none.</span>
                )}
            </p>
        </div>
    );
}
