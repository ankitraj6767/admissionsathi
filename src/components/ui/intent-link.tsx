'use client';

import { useState, type ComponentProps } from 'react';
import Link from 'next/link';

/** Fetch the complete destination on intent, without flooding MongoDB on render. */
export function IntentLink({ onMouseEnter, onFocus, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
    const [ready, setReady] = useState(false);

    return (
        <Link
            {...props}
            prefetch={ready}
            onMouseEnter={(event) => {
                setReady(true);
                onMouseEnter?.(event);
            }}
            onFocus={(event) => {
                setReady(true);
                onFocus?.(event);
            }}
            onTouchStart={(event) => {
                setReady(true);
                onTouchStart?.(event);
            }}
        />
    );
}
