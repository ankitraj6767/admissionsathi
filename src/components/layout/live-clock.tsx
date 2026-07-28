'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';

/**
 * Live IST date and time for the top utility bar.
 *
 * A client component with no server-rendered value on purpose. The header is
 * rendered on the server and its payload is cached and prefetched, so a
 * server-formatted clock would either be wrong the moment it reached the browser
 * or would trigger a hydration mismatch on every load. Rendering nothing until
 * `useEffect` runs keeps the first client render identical to the server's.
 *
 * `Asia/Kolkata` is hard-coded rather than using the visitor's locale: admission
 * and counselling deadlines on this site are all quoted in IST, so showing a
 * visitor abroad their own local time would be actively misleading.
 */

/** `en-GB` for the date: `en-IN` renders "Tue, 28 Jul, 2026" with a stray comma. */
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
};

/**
 * Subscribes to the tick.
 *
 * Browsers throttle timers in background tabs, so a tab left open can drift by
 * minutes. Re-reading on `visibilitychange` means the first thing a returning
 * visitor sees is correct rather than however far the throttled interval fell
 * behind.
 */
function subscribe(onChange: () => void): () => void {
    const interval = window.setInterval(onChange, 1000);
    document.addEventListener('visibilitychange', onChange);

    return () => {
        window.clearInterval(interval);
        document.removeEventListener('visibilitychange', onChange);
    };
}

/** Whole seconds, so React only re-renders once per visible change. */
const getSnapshot = () => Math.floor(Date.now() / 1000);

/** No clock on the server — see the note above about hydration. */
const getServerSnapshot = () => null;

export function LiveClock({ className }: { className?: string }) {
    const seconds = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const now = seconds === null ? null : new Date(seconds * 1000);

    const formatters = React.useMemo(
        () => ({
            date: new Intl.DateTimeFormat('en-GB', DATE_FORMAT),
            time: new Intl.DateTimeFormat('en-GB', TIME_FORMAT),
        }),
        [],
    );

    return (
        <span
            className={className}
            // `min-w` reserves the space the clock will occupy so the bar does not
            // shift sideways when the value appears after hydration.
            style={{ minWidth: '15.5rem' }}
        >
            <Clock className="h-3.5 w-3.5 shrink-0 text-navy-600" aria-hidden />

            {now ? (
                <time dateTime={now.toISOString()} className="tabular-nums">
                    <span className="font-semibold text-ink">{formatters.date.format(now)}</span>
                    <span className="mx-1.5 text-line" aria-hidden>
                        |
                    </span>
                    <span className="font-semibold text-ink">
                        {/* Both locales emit a lowercase "pm"; uppercase reads better here. */}
                        {formatters.time.format(now).toUpperCase()}
                    </span>
                    <span className="ml-1 text-ink-soft">IST</span>
                </time>
            ) : (
                // Placeholder for the pre-hydration frame only.
                <span className="sr-only">Loading current time</span>
            )}
        </span>
    );
}
