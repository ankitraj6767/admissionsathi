import 'server-only';
import { cache } from 'react';
import { NavigationItem, type NavigationItemDoc } from '@/db/models/site.model';
import { findLean } from '@/db/repositories/base.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { FALLBACK_MENUS } from '@/config/navigation-fallback';

export interface NavNode {
    id: string;
    label: string;
    url: string;
    icon?: string;
    description?: string;
    itemType: 'link' | 'dropdown' | 'mega' | 'heading' | 'button';
    columnGroup?: string;
    badge?: string;
    isNew: boolean;
    isFeatured: boolean;
    openInNewTab: boolean;
    visibility: 'public' | 'authenticated' | 'guest' | 'staff';
    requiredPermission?: string;
    children: NavNode[];
}

function toNode(item: NavigationItemDoc): NavNode {
    return {
        id: String(item._id),
        label: item.label,
        url: item.url,
        icon: item.icon,
        description: item.description,
        itemType: item.itemType,
        columnGroup: item.columnGroup,
        badge: item.badge,
        isNew: item.hasNewBadge,
        isFeatured: item.isFeatured,
        openInNewTab: item.openInNewTab,
        visibility: item.visibility,
        requiredPermission: item.requiredPermission,
        children: [],
    };
}

function buildTree(items: NavigationItemDoc[]): NavNode[] {
    const byId = new Map<string, NavNode>();
    const roots: NavNode[] = [];

    items.forEach((item) => byId.set(String(item._id), toNode(item)));

    items.forEach((item) => {
        const node = byId.get(String(item._id));
        if (!node) return;
        const parentId = item.parent ? String(item.parent) : null;
        if (parentId && byId.has(parentId)) {
            byId.get(parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

const loadMenu = cached(
    async (menuKey: string): Promise<NavNode[]> => {
        try {
            const items = await findLean<NavigationItemDoc>(
                NavigationItem,
                { menuKey, status: 'active' },
                { sort: { displayOrder: 1 }, limit: 400 },
            );
            if (items.length === 0) return FALLBACK_MENUS[menuKey] ?? [];
            return buildTree(items);
        } catch (error) {
            logger.error('navigation.load_failed', {
                menuKey,
                error: error instanceof Error ? error.message : String(error),
            });
            return FALLBACK_MENUS[menuKey] ?? [];
        }
    },
    ['navigation-menu'],
    { tags: [CACHE_TAGS.navigation], revalidate: CACHE_TTL.long },
);

export const getMenu = cache(async (menuKey: string): Promise<NavNode[]> => loadMenu(menuKey));

/** Filters nodes the current visitor should not see. */
export function filterNavForViewer(
    nodes: NavNode[],
    viewer: { isAuthenticated: boolean; isStaff: boolean; permissions: string[] },
): NavNode[] {
    const allowed = (node: NavNode): boolean => {
        if (node.visibility === 'authenticated' && !viewer.isAuthenticated) return false;
        if (node.visibility === 'guest' && viewer.isAuthenticated) return false;
        if (node.visibility === 'staff' && !viewer.isStaff) return false;
        if (node.requiredPermission && !viewer.permissions.includes(node.requiredPermission)) {
            return false;
        }
        return true;
    };

    return nodes
        .filter(allowed)
        .map((node) => ({ ...node, children: filterNavForViewer(node.children, viewer) }));
}
