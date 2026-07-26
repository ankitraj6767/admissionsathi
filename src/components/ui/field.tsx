'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ---------------------------------- Label -------------------------------- */

export function Label({
    className,
    required,
    children,
    ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
    return (
        <label className={cn('block text-[13px] font-semibold text-ink', className)} {...props}>
            {children}
            {required ? (
                <span className="ml-0.5 text-red-alert" aria-hidden>
                    *
                </span>
            ) : null}
        </label>
    );
}

/* ---------------------------------- Input -------------------------------- */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
    tone?: 'light' | 'dark';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, invalid, tone = 'light', ...props },
    ref,
) {
    return (
        <input
            ref={ref}
            aria-invalid={invalid || undefined}
            className={cn(
                'h-11 w-full rounded-[10px] border px-3.5 text-sm transition-colors outline-none placeholder:text-ink-soft/80',
                tone === 'light'
                    ? 'border-line bg-white text-ink focus:border-navy-300 focus:ring-2 focus:ring-navy-100'
                    : 'border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-2 focus:ring-white/20',
                invalid && 'border-red-alert focus:border-red-alert focus:ring-red-alert/20',
                'disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            {...props}
        />
    );
});

/* -------------------------------- Textarea ------------------------------- */

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            aria-invalid={invalid || undefined}
            className={cn(
                'w-full rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/80 focus:border-navy-300 focus:ring-2 focus:ring-navy-100',
                invalid && 'border-red-alert focus:border-red-alert focus:ring-red-alert/20',
                className,
            )}
            {...props}
        />
    );
});

/* --------------------------------- Select -------------------------------- */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
    tone?: 'light' | 'dark';
    placeholder?: string;
    options?: { label: string; value: string; disabled?: boolean }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
    { className, invalid, tone = 'light', placeholder, options, children, ...props },
    ref,
) {
    return (
        <div className="relative">
            <select
                ref={ref}
                aria-invalid={invalid || undefined}
                className={cn(
                    'h-11 w-full appearance-none rounded-[10px] border px-3.5 pr-9 text-sm outline-none transition-colors',
                    tone === 'light'
                        ? 'border-line bg-white text-ink focus:border-navy-300 focus:ring-2 focus:ring-navy-100'
                        : 'border-white/20 bg-white/10 text-white focus:border-white/40 focus:ring-2 focus:ring-white/20',
                    invalid && 'border-red-alert focus:border-red-alert focus:ring-red-alert/20',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    className,
                )}
                {...props}
            >
                {placeholder ? (
                    <option value="" className="text-ink">
                        {placeholder}
                    </option>
                ) : null}
                {options?.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled} className="text-ink">
                        {o.label}
                    </option>
                ))}
                {children}
            </select>
            <svg
                className={cn(
                    'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2',
                    tone === 'light' ? 'text-ink-soft' : 'text-white/70',
                )}
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
            >
                <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
        </div>
    );
});

/* -------------------------------- Checkbox ------------------------------- */

export const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Checkbox({ className, invalid, ...props }, ref) {
    return (
        <input
            ref={ref}
            type="checkbox"
            aria-invalid={invalid || undefined}
            className={cn(
                'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line text-orange accent-orange focus-visible:ring-2 focus-visible:ring-orange/50',
                invalid && 'border-red-alert',
                className,
            )}
            {...props}
        />
    );
});

/* ------------------------------- Field shell ----------------------------- */

export function FieldError({ message, id }: { message?: string; id?: string }) {
    if (!message) return null;
    return (
        <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-alert">
            {message}
        </p>
    );
}

export function FieldHint({ children, id }: { children: React.ReactNode; id?: string }) {
    return (
        <p id={id} className="mt-1 text-xs text-ink-soft">
            {children}
        </p>
    );
}

export function Field({
    label,
    htmlFor,
    required,
    error,
    hint,
    children,
    className,
}: {
    label?: string;
    htmlFor?: string;
    required?: boolean;
    error?: string;
    hint?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            {label ? (
                <Label htmlFor={htmlFor} required={required}>
                    {label}
                </Label>
            ) : null}
            {children}
            {hint && !error ? <FieldHint id={htmlFor ? `${htmlFor}-hint` : undefined}>{hint}</FieldHint> : null}
            <FieldError id={htmlFor ? `${htmlFor}-error` : undefined} message={error} />
        </div>
    );
}
