'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import {
    COUNSELLING_TYPES,
    bookingFormSchema,
    type BookingFormValues,
} from '@/schemas/counselling.schema';
import { createBookingAction, type BookingSuccess } from '@/actions/counselling.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { SelectOption } from '@/types/common';
import type { SlotOption } from '@/services/counselling.service';

export interface BookingFormProps {
    slots: SlotOption[];
    courses: SelectOption[];
    states: SelectOption[];
    consentText: string;
    counsellorSlug?: string;
    counsellorName?: string;
    defaultType?: BookingFormValues['type'];
    collegeSlug?: string;
    examSlug?: string;
    courseSlug?: string;
}

/** Booking form with a slot picker; creates a real booking + CRM lead. */
export function BookingForm({
    slots,
    courses,
    states,
    consentText,
    counsellorSlug,
    counsellorName,
    defaultType = 'general',
    collegeSlug,
    examSlug,
    courseSlug,
}: BookingFormProps) {
    const [success, setSuccess] = useState<BookingSuccess | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const idempotencyKey = useMemo(
        () => `bk_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`,
        [],
    );

    const grouped = useMemo(() => {
        const map = new Map<string, SlotOption[]>();
        slots.forEach((slot) => map.set(slot.dayLabel, [...(map.get(slot.dayLabel) ?? []), slot]));
        return Array.from(map.entries()).slice(0, 5);
    }, [slots]);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormValues>({
        resolver: zodResolver(bookingFormSchema),
        defaultValues: {
            counsellorSlug: counsellorSlug ?? '',
            type: defaultType,
            mode: 'Video Call',
            name: '',
            phone: '',
            email: '',
            stateId: '',
            courseInterest: courseSlug ?? '',
            collegeSlug: collegeSlug ?? '',
            examSlug: examSlug ?? '',
            scheduledAt: slots[0]?.iso ?? '',
            consent: false,
            idempotencyKey,
            website: '',
        },
    });

    const selectedSlot = watch('scheduledAt');

    const onSubmit = async (values: BookingFormValues) => {
        setServerError(null);
        const result = await createBookingAction(values);
        if (result.ok) {
            setSuccess(result.data);
            track({
                name: ANALYTICS_EVENTS.bookingCreated,
                properties: { type: values.type ?? 'general', reference: result.data.reference },
            });
            return;
        }
        if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) =>
                setError(field as keyof BookingFormValues, { message: messages[0] }),
            );
        }
        setServerError(result.error);
    };

    if (success) {
        return (
            <div className="rounded-panel border border-green/30 bg-green-50 p-5 text-center">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-green">
                    <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-3 text-[17px] font-extrabold text-navy-800">Session confirmed</h2>
                <p className="mt-1 text-[13px] text-ink-soft">
                    {new Date(success.scheduledAt).toLocaleString('en-IN', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                    })}
                    {success.counsellorName ? ` with ${success.counsellorName}` : ''}
                </p>
                <p className="mt-2 text-[12.5px] text-ink-soft">
                    Reference <span className="font-bold text-ink">{success.reference}</span>
                </p>
                {success.meetingLink ? (
                    <a
                        href={success.meetingLink}
                        className="mt-3 inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                    >
                        Join link
                    </a>
                ) : null}
                <p className="mt-3 text-[12px] text-ink-soft">
                    Track this session in{' '}
                    <Link href="/dashboard/bookings" className="font-semibold text-navy-600 hover:text-orange">
                        your dashboard
                    </Link>
                    .
                </p>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-panel border border-line bg-white p-4 shadow-card md:p-5"
            noValidate
        >
            <h2 className="mb-1 text-[16px] font-extrabold text-navy-800">
                {counsellorName ? `Book a session with ${counsellorName}` : 'Book your free counselling session'}
            </h2>
            <p className="mb-4 text-[12.5px] text-ink-soft">
                30 minutes, one-to-one, no charge. Pick a slot that works for you.
            </p>

            <input type="hidden" {...register('counsellorSlug')} />
            <input type="hidden" {...register('collegeSlug')} />
            <input type="hidden" {...register('examSlug')} />
            <input type="hidden" {...register('scheduledAt')} />

            <fieldset className="mb-4">
                <legend className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
                    What do you need help with?
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                    {COUNSELLING_TYPES.map((type) => (
                        <label
                            key={type.value}
                            className={cn(
                                'cursor-pointer rounded-[10px] border px-3 py-2.5 text-[12.5px] transition-colors',
                                watch('type') === type.value
                                    ? 'border-orange bg-orange-50 text-orange-700'
                                    : 'border-line hover:border-navy-200',
                            )}
                        >
                            <input type="radio" value={type.value} className="sr-only" {...register('type')} />
                            <span className="block font-bold">{type.label}</span>
                            <span className="block text-[10.5px] text-ink-soft">{type.description}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset className="mb-4">
                <legend className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
                    Choose a slot
                </legend>
                {grouped.length === 0 ? (
                    <p className="rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[12px] text-orange-700">
                        No open slots right now. Submit the form and our team will call you to schedule.
                    </p>
                ) : (
                    <div className="space-y-2.5">
                        {grouped.map(([day, daySlots]) => (
                            <div key={day}>
                                <p className="mb-1.5 text-[11.5px] font-bold text-ink">{day}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {daySlots.map((slot) => (
                                        <button
                                            key={slot.iso}
                                            type="button"
                                            onClick={() => setValue('scheduledAt', slot.iso, { shouldValidate: true })}
                                            aria-pressed={selectedSlot === slot.iso}
                                            className={cn(
                                                'min-h-[36px] rounded-[9px] border px-3 text-[12px] font-semibold transition-colors',
                                                selectedSlot === slot.iso
                                                    ? 'border-navy bg-navy text-white'
                                                    : 'border-line bg-white text-ink hover:border-navy-200',
                                            )}
                                        >
                                            {slot.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {errors.scheduledAt ? (
                    <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-red-alert">
                        {errors.scheduledAt.message}
                    </p>
                ) : null}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your name" htmlFor="bk-name" required error={errors.name?.message}>
                    <Input id="bk-name" autoComplete="name" invalid={Boolean(errors.name)} {...register('name')} />
                </Field>
                <Field label="Mobile number" htmlFor="bk-phone" required error={errors.phone?.message}>
                    <Input
                        id="bk-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        invalid={Boolean(errors.phone)}
                        {...register('phone')}
                    />
                </Field>
                <Field label="Email" htmlFor="bk-email" error={errors.email?.message}>
                    <Input id="bk-email" type="email" autoComplete="email" {...register('email')} />
                </Field>
                <Field label="Mode" htmlFor="bk-mode">
                    <Select
                        id="bk-mode"
                        options={[
                            { label: 'Video call', value: 'Video Call' },
                            { label: 'Phone call', value: 'Phone Call' },
                        ]}
                        {...register('mode')}
                    />
                </Field>
                <Field label="Course of interest" htmlFor="bk-course">
                    <Select
                        id="bk-course"
                        placeholder="Select a course"
                        options={courses.map((c) => ({ label: c.label, value: c.value }))}
                        {...register('courseInterest')}
                    />
                </Field>
                <Field label="State" htmlFor="bk-state">
                    <Select
                        id="bk-state"
                        placeholder="Select your state"
                        options={states.map((s) => ({ label: s.label, value: s.value }))}
                        {...register('stateId')}
                    />
                </Field>
            </div>

            <Field label="Anything specific you want to discuss?" htmlFor="bk-message" className="mt-3">
                <Textarea id="bk-message" rows={3} {...register('message')} />
            </Field>

            <div aria-hidden className="pointer-events-none absolute left-[-9999px]">
                <input tabIndex={-1} autoComplete="off" {...register('website')} />
            </div>

            <label className="mt-3 flex items-start gap-2 text-[11px] text-ink-soft">
                <Checkbox invalid={Boolean(errors.consent)} {...register('consent')} />
                {consentText}
            </label>
            {errors.consent ? (
                <p role="alert" className="mt-1 text-[11.5px] font-semibold text-red-alert">
                    {errors.consent.message}
                </p>
            ) : null}

            {serverError ? (
                <p role="alert" className="mt-3 text-[12.5px] font-semibold text-red-alert">
                    {serverError}
                </p>
            ) : null}

            <Button type="submit" variant="primary" size="lg" full className="mt-4" loading={isSubmitting} loadingText="Confirming…">
                Confirm free session
                <CalendarCheck className="h-4 w-4" aria-hidden />
            </Button>
        </form>
    );
}
