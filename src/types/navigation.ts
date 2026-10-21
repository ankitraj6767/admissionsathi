/** Public navigation shape shared by server data loaders and client navigation. */
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

export interface NavViewer {
    isAuthenticated: boolean;
    isStaff: boolean;
    permissions: string[];
}

/** Filters navigation items for the current viewer without importing server code. */
export function filterNavForViewer(nodes: NavNode[], viewer: NavViewer): NavNode[] {
    const allowed = (node: NavNode): boolean => {
        if (node.visibility === 'authenticated' && !viewer.isAuthenticated) return false;
        if (node.visibility === 'guest' && viewer.isAuthenticated) return false;
        if (node.visibility === 'staff' && !viewer.isStaff) return false;
        if (node.requiredPermission && !viewer.permissions.includes(node.requiredPermission)) return false;
        return true;
    };

    return nodes
        .filter(allowed)
        .map((node) => ({ ...node, children: filterNavForViewer(node.children, viewer) }));
}
