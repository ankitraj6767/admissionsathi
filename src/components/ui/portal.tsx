'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into `document.body`.
 *
 * Required for any `position: fixed` overlay declared inside the site header.
 * `HeaderShell` applies `backdrop-blur-md`, and per the CSS Filter Effects spec
 * an element with a `backdrop-filter` other than `none` becomes the containing
 * block for its fixed-position descendants — so `fixed inset-0` resolved to the
 * ~64px header box instead of the viewport. The header is also a `z-50` stacking
 * context, which capped the overlay's own z-index against the rest of the page.
 *
 * Portalling out of the header sidesteps both without touching the header's
 * visual treatment.
 *
 * Returns `null` until mounted so server and first client render agree (there is
 * no `document` during SSR), which keeps hydration clean.
 */
export function Portal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;
    return createPortal(children, document.body);
}
