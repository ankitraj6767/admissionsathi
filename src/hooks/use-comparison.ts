'use client';

import { useCallback, useEffect, useState } from 'react';
import { track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

const KEY = 'as_compare_colleges';
const EVENT = 'as_compare_changed';

function read(): string[] {
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

function write(slugs: string[]) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(slugs));
        window.dispatchEvent(new CustomEvent(EVENT, { detail: slugs }));
    } catch {
        /* storage unavailable */
    }
}

/** Shared comparison tray persisted in localStorage and synced across components. */
export function useComparison(maxColleges = 4) {
    const [slugs, setSlugs] = useState<string[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setSlugs(read());
        setReady(true);
        const onChange = (e: Event) => {
            const detail = (e as CustomEvent<string[]>).detail;
            setSlugs(detail ?? read());
        };
        window.addEventListener(EVENT, onChange);
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener(EVENT, onChange);
            window.removeEventListener('storage', onChange);
        };
    }, []);

    const add = useCallback(
        (slug: string) => {
            const current = read();
            if (current.includes(slug)) return { ok: true as const };
            if (current.length >= maxColleges) {
                return { ok: false as const, error: `You can compare up to ${maxColleges} colleges.` };
            }
            const next = [...current, slug];
            write(next);
            setSlugs(next);
            track({ name: ANALYTICS_EVENTS.collegeCompare, properties: { slug, count: next.length } });
            return { ok: true as const };
        },
        [maxColleges],
    );

    const remove = useCallback((slug: string) => {
        const next = read().filter((s) => s !== slug);
        write(next);
        setSlugs(next);
    }, []);

    const toggle = useCallback(
        (slug: string) => (read().includes(slug) ? (remove(slug), { ok: true as const }) : add(slug)),
        [add, remove],
    );

    const clear = useCallback(() => {
        write([]);
        setSlugs([]);
    }, []);

    const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

    return { slugs, ready, add, remove, toggle, clear, has, max: maxColleges };
}

export const COMPARE_STORAGE_KEY = KEY;
