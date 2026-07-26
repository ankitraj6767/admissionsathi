'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { updateRolePermissionsAction } from '@/actions/admin/role.actions';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/primitives';

export interface RoleOption {
    id: string;
    key: string;
    name: string;
    permissions: string[];
    isSystem: boolean;
}

/** Permission matrix editor for one role at a time. */
export function RolePermissionEditor({
    roles,
    groups,
}: {
    roles: RoleOption[];
    groups: { label: string; permissions: string[] }[];
}) {
    const router = useRouter();
    const [roleKey, setRoleKey] = useState(roles[0]?.key ?? '');
    const [selected, setSelected] = useState<string[]>(roles[0]?.permissions ?? []);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const role = roles.find((item) => item.key === roleKey);

    const switchRole = (key: string) => {
        setRoleKey(key);
        setSelected(roles.find((item) => item.key === key)?.permissions ?? []);
        setMessage(null);
        setError(null);
    };

    const toggle = (permission: string) =>
        setSelected((prev) =>
            prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission],
        );

    const toggleGroup = (permissions: string[], enable: boolean) =>
        setSelected((prev) =>
            enable
                ? Array.from(new Set([...prev, ...permissions]))
                : prev.filter((item) => !permissions.includes(item)),
        );

    const save = async () => {
        setSaving(true);
        setError(null);
        const result = await updateRolePermissionsAction({ roleKey, permissions: selected });
        setSaving(false);
        if (result.ok) {
            setMessage(result.message ?? 'Saved.');
            router.refresh();
        } else setError(result.error);
    };

    return (
        <section className="rounded-panel border border-line bg-white p-4 shadow-card">
            <div className="mb-3 flex flex-wrap items-end gap-3">
                <label className="text-[12px] font-bold text-ink">
                    Role
                    <Select
                        className="mt-1 w-[240px]"
                        value={roleKey}
                        onChange={(e) => switchRole(e.target.value)}
                        options={roles.map((item) => ({ label: item.name, value: item.key }))}
                        aria-label="Select role"
                    />
                </label>

                <span className="flex items-center gap-2">
                    <Badge tone="neutral" size="lg">
                        {selected.length} permissions
                    </Badge>
                    {role?.isSystem ? <Badge tone="amber" size="lg">System role</Badge> : null}
                </span>

                <Button className="ml-auto" variant="primary" size="sm" onClick={save} loading={saving}>
                    <Save className="h-3.5 w-3.5" aria-hidden />
                    Save permissions
                </Button>
            </div>

            {message ? (
                <p role="status" className="mb-3 rounded-[10px] border border-green/30 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                    {message}
                </p>
            ) : null}
            {error ? (
                <p role="alert" className="mb-3 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-alert">
                    {error}
                </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => {
                    const allSelected = group.permissions.every((permission) => selected.includes(permission));
                    return (
                        <fieldset key={group.label} className="rounded-[12px] border border-line p-3">
                            <legend className="flex items-center gap-2 px-1 text-[11.5px] font-bold uppercase tracking-wide text-navy-700">
                                {group.label}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.permissions, !allSelected)}
                                    className="text-[10px] font-semibold normal-case text-orange hover:underline"
                                >
                                    {allSelected ? 'clear' : 'select all'}
                                </button>
                            </legend>

                            <ul className="space-y-1">
                                {group.permissions.map((permission) => (
                                    <li key={permission}>
                                        <label className="flex items-center gap-2 text-[12px] text-ink">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(permission)}
                                                onChange={() => toggle(permission)}
                                                className="h-3.5 w-3.5 accent-orange"
                                            />
                                            <span className="font-mono text-[11px]">{permission}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </fieldset>
                    );
                })}
            </div>
        </section>
    );
}
