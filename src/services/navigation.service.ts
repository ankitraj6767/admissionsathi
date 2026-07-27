import 'server-only';
import { cache } from 'react';
import type { NavigationItemDoc } from '@/db/models/site.model';
import {
    deleteNavigationItem,
    findNavigationItemById,
    findNavigationMenuByKey,
    listAllNavigationItems,
    listNavigationItems,
    listNavigationMenus,
    setNavigationItemOrder,
    upsertNavigationItem,
} from '@/db/repositories/site.repository';
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
            const items = await listNavigationItems(menuKey, 400);
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

/* ------------------------------- admin writes ----------------------------- */

export interface SaveNavigationItemInput {
    id?: string;
    menuKey: string;
    parentId?: string;
    label: string;
    url: string;
    icon?: string;
    description?: string;
    itemType: 'link' | 'dropdown' | 'mega' | 'heading' | 'button';
    columnGroup?: string;
    badge?: string;
    hasNewBadge: boolean;
    isFeatured: boolean;
    openInNewTab: boolean;
    visibility: 'public' | 'authenticated' | 'guest' | 'staff';
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
    actorId: string;
}

/**
 * Creates or updates a navigation item.
 * Resolves the menu key to its document first: an item that pointed at a
 * non-existent menu would silently disappear from every rendered menu.
 * Returns `null` when the menu does not exist.
 */
export async function saveNavigationItem(
    input: SaveNavigationItemInput,
): Promise<{ id: string } | null> {
    const menu = await findNavigationMenuByKey(input.menuKey);
    if (!menu) return null;

    const payload: Record<string, unknown> = {
        menu: menu._id,
        menuKey: input.menuKey,
        parent: input.parentId || null,
        label: input.label,
        url: input.url,
        icon: input.icon || undefined,
        description: input.description || undefined,
        itemType: input.itemType,
        columnGroup: input.columnGroup || undefined,
        badge: input.badge || undefined,
        hasNewBadge: input.hasNewBadge,
        isFeatured: input.isFeatured,
        openInNewTab: input.openInNewTab,
        visibility: input.visibility,
        displayOrder: input.displayOrder,
        status: input.status,
        updatedBy: input.actorId,
    };

    const id = await upsertNavigationItem(
        input.id,
        input.id ? payload : { ...payload, createdBy: input.actorId },
    );

    return { id };
}

export interface RemovedNavigationItem {
    menuKey: string;
    label: string;
}

/**
 * Deletes an item and its children.
 * Returns the removed labels so the caller can write a meaningful audit record,
 * or `null` when the item is already gone.
 */
export async function removeNavigationItem(id: string): Promise<RemovedNavigationItem | null> {
    const item = await findNavigationItemById(id);
    if (!item) return null;

    await deleteNavigationItem(id);
    return { menuKey: item.menuKey, label: item.label };
}

export async function reorderNavigationItems(
    items: { id: string; displayOrder: number }[],
    actorId?: string,
): Promise<number> {
    await setNavigationItemOrder(items, actorId);
    return items.length;
}

/* ------------------------------ admin builder ----------------------------- */

export interface NavigationBuilderItem {
    id: string;
    parentId: string | null;
    label: string;
    url: string;
    icon?: string;
    description?: string;
    itemType: 'link' | 'dropdown' | 'mega' | 'heading' | 'button';
    columnGroup?: string;
    badge?: string;
    hasNewBadge: boolean;
    isFeatured: boolean;
    openInNewTab: boolean;
    visibility: 'public' | 'authenticated' | 'guest' | 'staff';
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
}

export interface NavigationBuilderMenu {
    key: string;
    name: string;
    location: string;
    items: NavigationBuilderItem[];
}

/**
 * Every menu with its items, including inactive ones.
 *
 * Unlike `getMenu`, this is intentionally uncached and unfiltered: the builder
 * must show exactly what is stored, including items hidden from the public site.
 */
export async function getNavigationBuilderData(): Promise<NavigationBuilderMenu[]> {
    const [menus, items] = await Promise.all([
        listNavigationMenus(),
        listAllNavigationItems(600),
    ]);

    return menus.map((menu) => ({
        key: menu.key,
        name: menu.name,
        location: menu.location,
        items: items
            .filter((item) => item.menuKey === menu.key)
            .map((item) => ({
                id: String(item._id),
                parentId: item.parent ? String(item.parent) : null,
                label: item.label,
                url: item.url,
                icon: item.icon,
                description: item.description,
                itemType: item.itemType,
                columnGroup: item.columnGroup,
                badge: item.badge,
                hasNewBadge: Boolean(item.hasNewBadge),
                isFeatured: Boolean(item.isFeatured),
                openInNewTab: Boolean(item.openInNewTab),
                visibility: item.visibility,
                displayOrder: item.displayOrder,
                status: item.status,
            })),
    }));
}
