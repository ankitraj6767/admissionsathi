'use client';

import type { AnalyticsPayload } from './events';

/**
 * Client-side analytics adapter.
 *
 * Providers are configured through NEXT_PUBLIC_ANALYTICS_PROVIDERS so the platform
 * can run first-party only, or add GA4 / GTM / Meta Pixel without code changes.
 */
export type ProviderId = 'first-party' | 'ga' | 'gtm' | 'meta';

interface AnalyticsAdapter {
    id: ProviderId;
    isReady(): boolean;
    track(payload: AnalyticsPayload): void;
    pageView(path: string): void;
}

const ANON_KEY = 'as_anon_id';
const SESSION_KEY = 'as_session_id';

function randomId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getAnonymousId(): string {
    if (typeof window === 'undefined') return '';
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
        id = randomId('anon');
        window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
}

export function getSessionId(): string {
    if (typeof window === 'undefined') return '';
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        id = randomId('sess');
        window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

function deviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
}

/** First-party adapter: posts to our own Route Handler (no third-party cookies). */
const firstParty: AnalyticsAdapter = {
    id: 'first-party',
    isReady: () => true,
    track(payload) {
        const body = JSON.stringify({
            ...payload,
            path: payload.path ?? window.location.pathname,
            anonymousId: getAnonymousId(),
            sessionId: getSessionId(),
            device: deviceType(),
            referrer: document.referrer || undefined,
        });

        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/collect', new Blob([body], { type: 'application/json' }));
            return;
        }
        void fetch('/api/analytics/collect', {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
        }).catch(() => undefined);
    },
    pageView(path) {
        this.track({ name: 'page_view', path });
    },
};

type WindowWithTrackers = Window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
};

const ga: AnalyticsAdapter = {
    id: 'ga',
    isReady: () => typeof (window as WindowWithTrackers).gtag === 'function',
    track(payload) {
        (window as WindowWithTrackers).gtag?.('event', payload.name, {
            ...payload.properties,
            entity_type: payload.entityType,
            entity_slug: payload.entitySlug,
        });
    },
    pageView(path) {
        (window as WindowWithTrackers).gtag?.('event', 'page_view', { page_path: path });
    },
};

const gtm: AnalyticsAdapter = {
    id: 'gtm',
    isReady: () => Array.isArray((window as WindowWithTrackers).dataLayer),
    track(payload) {
        (window as WindowWithTrackers).dataLayer?.push({ event: payload.name, ...payload.properties });
    },
    pageView(path) {
        (window as WindowWithTrackers).dataLayer?.push({ event: 'page_view', page_path: path });
    },
};

const meta: AnalyticsAdapter = {
    id: 'meta',
    isReady: () => typeof (window as WindowWithTrackers).fbq === 'function',
    track(payload) {
        (window as WindowWithTrackers).fbq?.('trackCustom', payload.name, payload.properties ?? {});
    },
    pageView() {
        (window as WindowWithTrackers).fbq?.('track', 'PageView');
    },
};

const ALL: Record<ProviderId, AnalyticsAdapter> = { 'first-party': firstParty, ga, gtm, meta };

function enabledProviders(): AnalyticsAdapter[] {
    const raw = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDERS ?? 'first-party';
    return raw
        .split(',')
        .map((s) => s.trim() as ProviderId)
        .filter((id): id is ProviderId => Boolean(ALL[id]))
        .map((id) => ALL[id]);
}

export function track(payload: AnalyticsPayload): void {
    if (typeof window === 'undefined') return;
    for (const adapter of enabledProviders()) {
        try {
            if (adapter.isReady()) adapter.track(payload);
        } catch {
            /* analytics must never break the UI */
        }
    }
}

export function trackPageView(path: string): void {
    if (typeof window === 'undefined') return;
    for (const adapter of enabledProviders()) {
        try {
            if (adapter.isReady()) adapter.pageView(path);
        } catch {
            /* noop */
        }
    }
}

/** Reads UTM + click ids from the current URL, persisted for the session. */
export function captureUtm(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const stored = window.sessionStorage.getItem('as_utm');
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    const found: Record<string, string> = {};
    keys.forEach((k) => {
        const v = params.get(k);
        if (v) found[k] = v.slice(0, 160);
    });

    if (Object.keys(found).length > 0) {
        const merged = { ...(stored ? (JSON.parse(stored) as Record<string, string>) : {}), ...found };
        merged.landing_page = merged.landing_page ?? window.location.pathname;
        merged.referrer = merged.referrer ?? (document.referrer || '');
        window.sessionStorage.setItem('as_utm', JSON.stringify(merged));
        return merged;
    }

    if (stored) return JSON.parse(stored) as Record<string, string>;
    return {
        landing_page: window.location.pathname,
        referrer: document.referrer || '',
    };
}
