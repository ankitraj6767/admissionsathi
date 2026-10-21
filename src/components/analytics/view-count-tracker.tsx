'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackContentView } from '@/lib/analytics/client';

type ViewEntity = 'college' | 'course' | 'exam' | 'article';

const EVENT_BY_ENTITY = {
    college: ANALYTICS_EVENTS.collegeView,
    course: ANALYTICS_EVENTS.courseView,
    exam: ANALYTICS_EVENTS.examView,
    article: ANALYTICS_EVENTS.articleView,
} satisfies Record<ViewEntity, string>;

/** Records a content view after render, so static pages keep their existing counters. */
export function ViewCountTracker({
    entity,
    id,
    slug,
}: {
    entity: ViewEntity;
    id: string;
    slug: string;
}) {
    const pathname = usePathname();
    const lastTrackedPath = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname || lastTrackedPath.current === pathname) return;
        lastTrackedPath.current = pathname;

        trackContentView({
            name: EVENT_BY_ENTITY[entity],
            path: pathname,
            entityType: entity,
            entityId: id,
            entitySlug: slug,
        });
    }, [entity, id, pathname, slug]);

    return null;
}
