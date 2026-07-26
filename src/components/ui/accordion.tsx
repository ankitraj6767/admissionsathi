'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Accordion primitives on top of Radix.
 * Radix (rather than <details>) so keyboard focus, `aria-expanded` and the
 * single/multiple open behaviour are handled for us.
 */
export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = React.forwardRef<
    React.ComponentRef<typeof AccordionPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
    return (
        <AccordionPrimitive.Item
            ref={ref}
            className={cn('border-b border-line last:border-b-0', className)}
            {...props}
        />
    );
});

export const AccordionTrigger = React.forwardRef<
    React.ComponentRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                ref={ref}
                className={cn(
                    'group flex min-h-11 w-full items-start justify-between gap-3 py-3 text-left text-[13.5px] font-bold text-ink transition-colors hover:text-navy-700',
                    className,
                )}
                {...props}
            >
                <span className="min-w-0">{children}</span>
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:border-orange-200 group-data-[state=open]:text-orange">
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </span>
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
});

export const AccordionContent = React.forwardRef<
    React.ComponentRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
    return (
        <AccordionPrimitive.Content
            ref={ref}
            className={cn('overflow-hidden pb-3.5 text-[12.5px] leading-relaxed text-ink-soft', className)}
            {...props}
        >
            {children}
        </AccordionPrimitive.Content>
    );
});
