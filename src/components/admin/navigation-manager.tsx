'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import {
    deleteNavigationItemAction,
    upsertNavigationItemAction,
} from '@/actions/admin/settings.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export interface NavItemRow {
    id: string;
    parentId: string | null;
    label: string;
    url: string;
    icon?: string;
    description?: string;
    itemType: string;
    columnGroup?: string;
    badge?: string;
    hasNewBadge: boolean;
    isFeatured: boolean;
    openInNewTab: boolean;
    visibility: string;
    displayOrder: number;
    status: string;
}

export interface NavMenu {
    key: string;
    name: string;
    location: string;
    items: NavItemRow[];
}

const EMPTY: Omit<NavItemRow, 'id'> = {
    parentId: null,
    label: '',
    url: '',
    icon: '',
    description: '',
    itemType: 'link',
    columnGroup: '',
    badge: '',
    hasNewBadge: false,
    isFeatured: false,
    openInNewTab: false,
    visibility: 'public',
    displayOrder: 0,
    status: 'active',
};

/** Menu-by-menu navigation editor with nested children. */
export function NavigationManager({ menus }: { menus: NavMenu[] }) {
    const router = useRouter();
    const [activeMenu, setActiveMenu] = useState(menus[0]?.key ?? 'header');
    const [editing, setEditing] = useState<(Partial<NavItemRow> & { menuKey: string }) | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const menu = menus.find((item) => item.key === activeMenu);
    const roots = (menu?.items ?? []).filter((item) => !item.parentId);
    const childrenOf = (id: string) => (menu?.items ?? []).filter((item) => item.parentId === id);

    const save = async (values: Partial<NavItemRow> & { menuKey: string }) => {
        const result = await upsertNavigationItemAction({
            id: values.id,
            menuKey: values.menuKey,
            parentId: values.parentId ?? '',
            label: values.label ?? '',
            url: values.url ?? '',
            icon: values.icon ?? '',
            description: values.description ?? '',
            itemType: values.itemType ?? 'link',
            columnGroup: values.columnGroup ?? '',
            badge: values.badge ?? '',
            hasNewBadge: values.hasNewBadge ?? false,
            isFeatured: values.isFeatured ?? false,
            openInNewTab: values.openInNewTab ?? false,
            visibility: values.visibility ?? 'public',
            displayOrder: values.displayOrder ?? 0,
            status: values.status ?? 'active',
        });

        setNotice(result.ok ? (result.message ?? 'Saved.') : result.error);
        if (result.ok) {
            setEditing(null);
            router.refresh();
        }
    };

    const remove = (id: string) =>
        startTransition(async () => {
            if (!window.confirm('Delete this item and its children?')) return;
            const result = await deleteNavigationItemAction(id);
            setNotice(result.ok ? (result.message ?? 'Deleted.') : result.error);
            router.refresh();
        });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-panel border border-line bg-white p-2.5 shadow-card">
                {menus.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveMenu(item.key)}
                        className={cn(
                            'inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[12px] font-bold transition-colors',
                            activeMenu === item.key ? 'bg-navy text-white' : 'text-ink hover:bg-muted',
                        )}
                    >
                        {item.name}
                        <span className="text-[10px] opacity-70">{item.items.length}</span>
                    </button>
                ))}

                <span className="ml-auto flex items-center gap-2">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setEditing({ ...EMPTY, menuKey: activeMenu, displayOrder: (roots.length + 1) * 10 })}
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Add item
                    </Button>
                </span>
            </div>

            {notice ? (
                <p role="status" className="rounded-[10px] border border-green/30 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                    {notice}
                </p>
            ) : null}

            {editing ? (
                <NavItemForm
                    value={editing}
                    onCancel={() => setEditing(null)}
                    onSubmit={save}
                    parentOptions={roots.map((item) => ({ label: item.label, value: item.id }))}
                />
            ) : null}

            <div className="rounded-panel border border-line bg-white shadow-card">
                {roots.length === 0 ? (
                    <p className="p-6 text-center text-[13px] text-ink-soft">This menu has no items yet.</p>
                ) : (
                    <ul className="divide-y divide-line">
                        {roots
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((item) => (
                                <li key={item.id}>
                                    <div className="flex flex-wrap items-center gap-2 p-3">
                                        <span className="inline-flex h-6 w-8 items-center justify-center rounded-[6px] bg-muted text-[10.5px] font-bold text-ink-soft">
                                            {item.displayOrder}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-bold text-ink">{item.label}</span>
                                            <span className="block truncate text-[11px] text-ink-soft">{item.url}</span>
                                        </span>
                                        <Badge tone="neutral">{item.itemType}</Badge>
                                        {item.status !== 'active' ? <Badge tone="red">{item.status}</Badge> : null}
                                        {item.visibility !== 'public' ? <Badge tone="amber">{item.visibility}</Badge> : null}
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={() => setEditing({ ...item, menuKey: activeMenu })}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={() =>
                                                setEditing({
                                                    ...EMPTY,
                                                    menuKey: activeMenu,
                                                    parentId: item.id,
                                                    displayOrder: (childrenOf(item.id).length + 1) * 10,
                                                })
                                            }
                                        >
                                            <Plus className="h-3 w-3" aria-hidden />
                                            Child
                                        </Button>
                                        <button
                                            type="button"
                                            aria-label={`Delete ${item.label}`}
                                            onClick={() => remove(item.id)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-line text-ink-soft hover:border-red-alert/40 hover:text-red-alert"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                        </button>
                                    </div>

                                    {childrenOf(item.id).length > 0 ? (
                                        <ul className="border-t border-line bg-page/60">
                                            {childrenOf(item.id)
                                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                                .map((child) => (
                                                    <li
                                                        key={child.id}
                                                        className="flex flex-wrap items-center gap-2 border-b border-line/60 px-3 py-2 pl-10 last:border-0"
                                                    >
                                                        <span className="inline-flex h-5 w-7 items-center justify-center rounded-[5px] bg-white text-[10px] font-bold text-ink-soft">
                                                            {child.displayOrder}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[12.5px] font-semibold text-ink">
                                                                {child.label}
                                                                {child.columnGroup ? (
                                                                    <span className="ml-1.5 text-[10px] font-normal text-ink-soft">
                                                                        ({child.columnGroup})
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                            <span className="block truncate text-[10.5px] text-ink-soft">{child.url}</span>
                                                        </span>
                                                        {child.hasNewBadge ? <Badge tone="orange">New</Badge> : null}
                                                        <Button
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() => setEditing({ ...child, menuKey: activeMenu })}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <button
                                                            type="button"
                                                            aria-label={`Delete ${child.label}`}
                                                            onClick={() => remove(child.id)}
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-soft hover:text-red-alert"
                                                        >
                                                            <Trash2 className="h-3 w-3" aria-hidden />
                                                        </button>
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : null}
                                </li>
                            ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function NavItemForm({
    value,
    parentOptions,
    onSubmit,
    onCancel,
}: {
    value: Partial<NavItemRow> & { menuKey: string };
    parentOptions: { label: string; value: string }[];
    onSubmit: (values: Partial<NavItemRow> & { menuKey: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [form, setForm] = useState(value);
    const [saving, setSaving] = useState(false);

    const set = <K extends keyof NavItemRow>(key: K, next: NavItemRow[K]) =>
        setForm((prev) => ({ ...prev, [key]: next }));

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                await onSubmit(form);
                setSaving(false);
            }}
            className="rounded-panel border border-orange-200 bg-orange-50/40 p-4"
        >
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-navy-800">
                {form.id ? 'Edit navigation item' : 'New navigation item'}
                <ChevronDown className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Label" htmlFor="nav-label" required>
                    <Input id="nav-label" value={form.label ?? ''} onChange={(e) => set('label', e.target.value)} required />
                </Field>
                <Field label="URL" htmlFor="nav-url" required>
                    <Input id="nav-url" value={form.url ?? ''} onChange={(e) => set('url', e.target.value)} required />
                </Field>
                <Field label="Parent item" htmlFor="nav-parent">
                    <Select
                        id="nav-parent"
                        placeholder="Top level"
                        options={parentOptions}
                        value={form.parentId ?? ''}
                        onChange={(e) => set('parentId', e.target.value || null)}
                    />
                </Field>
                <Field label="Item type" htmlFor="nav-type">
                    <Select
                        id="nav-type"
                        options={['link', 'dropdown', 'mega', 'heading', 'button'].map((v) => ({ label: v, value: v }))}
                        value={form.itemType ?? 'link'}
                        onChange={(e) => set('itemType', e.target.value)}
                    />
                </Field>
                <Field label="Icon (Lucide name)" htmlFor="nav-icon">
                    <Input id="nav-icon" value={form.icon ?? ''} onChange={(e) => set('icon', e.target.value)} />
                </Field>
                <Field label="Mega-menu column" htmlFor="nav-column">
                    <Input
                        id="nav-column"
                        value={form.columnGroup ?? ''}
                        onChange={(e) => set('columnGroup', e.target.value)}
                    />
                </Field>
                <Field label="Description" htmlFor="nav-desc" className="sm:col-span-2">
                    <Input
                        id="nav-desc"
                        value={form.description ?? ''}
                        onChange={(e) => set('description', e.target.value)}
                    />
                </Field>
                <Field label="Display order" htmlFor="nav-order">
                    <Input
                        id="nav-order"
                        type="number"
                        value={form.displayOrder ?? 0}
                        onChange={(e) => set('displayOrder', Number(e.target.value))}
                    />
                </Field>
                <Field label="Visibility" htmlFor="nav-visibility">
                    <Select
                        id="nav-visibility"
                        options={['public', 'authenticated', 'guest', 'staff'].map((v) => ({ label: v, value: v }))}
                        value={form.visibility ?? 'public'}
                        onChange={(e) => set('visibility', e.target.value)}
                    />
                </Field>
                <Field label="Status" htmlFor="nav-status">
                    <Select
                        id="nav-status"
                        options={['active', 'inactive', 'archived'].map((v) => ({ label: v, value: v }))}
                        value={form.status ?? 'active'}
                        onChange={(e) => set('status', e.target.value)}
                    />
                </Field>
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[12px] text-ink">
                    <Checkbox checked={form.hasNewBadge ?? false} onChange={(e) => set('hasNewBadge', e.target.checked)} />
                    Show “New” badge
                </label>
                <label className="flex items-center gap-2 text-[12px] text-ink">
                    <Checkbox checked={form.isFeatured ?? false} onChange={(e) => set('isFeatured', e.target.checked)} />
                    Featured
                </label>
                <label className="flex items-center gap-2 text-[12px] text-ink">
                    <Checkbox checked={form.openInNewTab ?? false} onChange={(e) => set('openInNewTab', e.target.checked)} />
                    Open in new tab
                </label>
            </div>

            <div className="mt-4 flex gap-2">
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                    Save item
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
