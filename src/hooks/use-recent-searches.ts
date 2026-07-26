'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'as_recent_searches';
const MAX = 6;

/** Recent search terms persisted in localStorage (no server round-trip). */
export function useRecentSearches() {
    const [recent, setRecent] = useState<string[]>([]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(KEY);
            if (raw) setRecent(JSON.parse(raw) as string[]);
        } catch {
            setRecent([]);
        }
    }, []);

    const push = useCallback((term: string) => {
        const clean = term.trim();
        if (clean.length < 2) return;
        setRecent((prev) => {
            const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX);
            try {
                window.localStorage.setItem(KEY, JSON.stringify(next));
            } catch {
                /* storage disabled */
            }
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setRecent([]);
        try {
            window.localStorage.removeItem(KEY);
        } catch {
            /* noop */
        }
    }, []);

    return { recent, push, clear };
}
