'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Save, ShieldAlert } from 'lucide-react';
import { notificationPreferencesSchema, updateProfileSchema } from '@/schemas/auth.schema';
import {
    deleteMyAccountAction,
    exportMyDataAction,
    updateNotificationPreferencesAction,
    updateProfileAction,
} from '@/actions/account.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { SectionCard } from '@/components/shared/content-blocks';
import { GENDERS, RESERVATION_CATEGORIES } from '@/config/constants';
import type { SelectOption } from '@/types/common';
import type { z } from 'zod';

type ProfileValues = z.input<typeof updateProfileSchema>;
type PrefValues = z.input<typeof notificationPreferencesSchema>;

export function ProfileForms({
    states,
    defaults,
    preferences,
}: {
    states: SelectOption[];
    defaults: ProfileValues;
    preferences: PrefValues;
}) {
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [prefMessage, setPrefMessage] = useState<string | null>(null);
    const [dangerMessage, setDangerMessage] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const profileForm = useForm<ProfileValues>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: defaults,
    });

    const prefForm = useForm<PrefValues>({
        resolver: zodResolver(notificationPreferencesSchema),
        defaultValues: preferences,
    });

    const onExport = () =>
        startTransition(async () => {
            const result = await exportMyDataAction();
            if (!result.ok) {
                setDangerMessage(result.error);
                return;
            }
            const blob = new Blob([result.data.json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'admission-sathi-my-data.json';
            link.click();
            URL.revokeObjectURL(url);
            setDangerMessage('Data export downloaded.');
        });

    const onDelete = () => {
        if (!window.confirm('This closes your account and removes your saved items. Continue?')) return;
        startTransition(async () => {
            const result = await deleteMyAccountAction();
            setDangerMessage(result.ok ? 'Account closed. Signing you out…' : result.error);
            if (result.ok) window.location.href = '/';
        });
    };

    return (
        <div className="space-y-4">
            <SectionCard title="Profile" icon="UserCheck">
                <form
                    onSubmit={profileForm.handleSubmit(async (values) => {
                        const result = await updateProfileAction(values);
                        setProfileMessage(result.ok ? (result.message ?? 'Saved.') : result.error);
                    })}
                    className="space-y-3"
                    noValidate
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Full name" htmlFor="pf-name" required error={profileForm.formState.errors.name?.message}>
                            <Input id="pf-name" {...profileForm.register('name')} />
                        </Field>
                        <Field label="Mobile number" htmlFor="pf-phone" error={profileForm.formState.errors.phone?.message}>
                            <Input id="pf-phone" type="tel" inputMode="numeric" {...profileForm.register('phone')} />
                        </Field>
                        <Field label="State" htmlFor="pf-state">
                            <Select
                                id="pf-state"
                                placeholder="Select your state"
                                options={states.map((s) => ({ label: s.label, value: s.value }))}
                                {...profileForm.register('stateId')}
                            />
                        </Field>
                        <Field label="Current qualification" htmlFor="pf-qual">
                            <Input id="pf-qual" placeholder="e.g. Class 12 (PCM)" {...profileForm.register('currentQualification')} />
                        </Field>
                        <Field label="Passing year" htmlFor="pf-year">
                            <Input id="pf-year" type="number" inputMode="numeric" {...profileForm.register('passingYear')} />
                        </Field>
                        <Field label="Category" htmlFor="pf-category">
                            <Select
                                id="pf-category"
                                placeholder="Select category"
                                options={RESERVATION_CATEGORIES.map((c) => ({ label: c, value: c }))}
                                {...profileForm.register('category')}
                            />
                        </Field>
                        <Field label="Gender" htmlFor="pf-gender">
                            <Select
                                id="pf-gender"
                                placeholder="Prefer not to say"
                                options={GENDERS.map((g) => ({ label: g, value: g }))}
                                {...profileForm.register('gender')}
                            />
                        </Field>
                    </div>

                    {profileMessage ? (
                        <p role="status" className="text-[12px] font-semibold text-green">
                            {profileMessage}
                        </p>
                    ) : null}

                    <Button type="submit" variant="navy" loading={profileForm.formState.isSubmitting}>
                        <Save className="h-4 w-4" aria-hidden />
                        Save profile
                    </Button>
                </form>
            </SectionCard>

            <SectionCard title="Notification preferences" icon="BellRing">
                <form
                    onSubmit={prefForm.handleSubmit(async (values) => {
                        const result = await updateNotificationPreferencesAction(values);
                        setPrefMessage(result.ok ? (result.message ?? 'Saved.') : result.error);
                    })}
                    className="space-y-3"
                >
                    <fieldset>
                        <legend className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
                            Channels
                        </legend>
                        <div className="flex flex-wrap gap-3">
                            {(['email', 'whatsapp', 'sms', 'in_app'] as const).map((channel) => (
                                <label key={channel} className="flex items-center gap-2 text-[12.5px] text-ink">
                                    <Checkbox value={channel} {...prefForm.register('channels')} />
                                    {channel.replace('_', '-')}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-[12.5px] text-ink">
                            <Checkbox {...prefForm.register('examAlerts')} /> Exam date and registration alerts
                        </label>
                        <label className="flex items-center gap-2 text-[12.5px] text-ink">
                            <Checkbox {...prefForm.register('admissionAlerts')} /> Admission deadline alerts
                        </label>
                        <label className="flex items-center gap-2 text-[12.5px] text-ink">
                            <Checkbox {...prefForm.register('savedCollegeUpdates')} /> Updates on saved colleges
                        </label>
                        <label className="flex items-center gap-2 text-[12.5px] text-ink">
                            <Checkbox {...prefForm.register('marketing')} /> Offers and product updates
                        </label>
                    </div>

                    {prefMessage ? (
                        <p role="status" className="text-[12px] font-semibold text-green">
                            {prefMessage}
                        </p>
                    ) : null}

                    <Button type="submit" variant="outline" loading={prefForm.formState.isSubmitting}>
                        Save preferences
                    </Button>
                </form>
            </SectionCard>

            <SectionCard title="Privacy & data" icon="Shield">
                <p className="text-[12.5px] text-ink-soft">
                    You can export everything we hold about you, or close your account. Closing the account
                    anonymises your profile and deletes your saved items.
                </p>

                {dangerMessage ? (
                    <p role="status" className="mt-2 text-[12px] font-semibold text-ink">
                        {dangerMessage}
                    </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={onExport} loading={pending}>
                        <Download className="h-4 w-4" aria-hidden />
                        Export my data
                    </Button>
                    <Button variant="danger" onClick={onDelete} disabled={pending}>
                        <ShieldAlert className="h-4 w-4" aria-hidden />
                        Close my account
                    </Button>
                </div>
            </SectionCard>
        </div>
    );
}
