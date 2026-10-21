'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui/primitives';

/** Keep deadline status current even when the scholarship page is statically cached. */
export function ScholarshipStatus({ deadline }: { deadline: string | null }) {
    const subscribe = useCallback((notify: () => void) => {
        if (!deadline) return () => undefined;
        const millisecondsUntilDeadline = new Date(deadline).getTime() - Date.now();
        if (millisecondsUntilDeadline <= 0) return () => undefined;

        const timeout = window.setTimeout(notify, millisecondsUntilDeadline + 1);
        return () => window.clearTimeout(timeout);
    }, [deadline]);

    const getSnapshot = useCallback(
        () => (!deadline || new Date(deadline).getTime() > Date.now() ? 'open' : 'closed'),
        [deadline],
    );
    const status = useSyncExternalStore(subscribe, getSnapshot, () => 'checking');

    if (status === 'checking') {
        return <span aria-live="polite" className="text-ink-soft">Checking…</span>;
    }

    return status === 'open' ? <Badge tone="green">Open</Badge> : <Badge tone="neutral">Closed</Badge>;
}
