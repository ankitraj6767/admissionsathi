import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_NAV } from '@/config/admin-nav';
import { ADMIN_RESOURCE_KEYS } from '@/config/admin-resources';
import { PERMISSIONS } from '@/config/permissions';

const APP_ADMIN_DIR = join(process.cwd(), 'src', 'app', 'admin');

const navItems = ADMIN_NAV.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label })),
);

/**
 * Every sidebar entry must resolve to something real: either a dedicated page
 * under `src/app/admin/<segment>/page.tsx`, or a key registered in
 * ADMIN_RESOURCES (served by the generic `src/app/admin/[resource]` route).
 */
function resolves(href: string): boolean {
    if (href === '/admin') return existsSync(join(APP_ADMIN_DIR, 'page.tsx'));

    const segment = href.replace(/^\/admin\//, '');
    if (existsSync(join(APP_ADMIN_DIR, segment, 'page.tsx'))) return true;
    return ADMIN_RESOURCE_KEYS.includes(segment);
}

describe('admin navigation', () => {
    it('exposes at least one item per group', () => {
        for (const group of ADMIN_NAV) {
            expect(group.items.length, `group "${group.label}" is empty`).toBeGreaterThan(0);
        }
    });

    it('every nav href resolves to a page or a registered resource', () => {
        const dead = navItems.filter((item) => !resolves(item.href));
        expect(dead.map((item) => item.href)).toEqual([]);
    });

    it('every nav permission is a declared permission key', () => {
        const unknown = navItems
            .filter((item) => item.permission)
            .filter((item) => !(PERMISSIONS as readonly string[]).includes(item.permission!));
        expect(unknown.map((item) => `${item.href} -> ${item.permission}`)).toEqual([]);
    });

    it('does not link the same destination twice', () => {
        const hrefs = navItems.map((item) => item.href);
        expect(hrefs).toHaveLength(new Set(hrefs).size);
    });

    /**
     * A resource with no sidebar entry is only reachable by typing its URL,
     * which in practice means nobody finds it.
     */
    it('every registered admin resource is reachable from the sidebar', () => {
        const linked = new Set(navItems.map((item) => item.href.replace(/^\/admin\/?/, '')));
        const orphaned = ADMIN_RESOURCE_KEYS.filter((key) => !linked.has(key));
        expect(orphaned).toEqual([]);
    });
});
