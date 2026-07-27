'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Portal } from '@/components/ui/portal';
import { cn } from '@/lib/utils';

/**
 * Accessible modal shell used by the admin media picker and the public gallery
 * lightbox.
 *
 * Hand-rolled rather than pulled from Radix because both callers need arrow-key
 * handling on the overlay itself, which fights a library's own key management.
 * The four things a dialog has to get right are all here: focus moves in on open
 * and returns to the trigger on close, Tab is trapped, Escape closes, and the
 * page behind cannot scroll.
 */
export interface ModalProps {
    open: boolean;
    onClose: () => void;
    /** Accessible name. Rendered visibly unless `hideTitle` is set. */
    title: string;
    hideTitle?: boolean;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'md' | 'lg' | 'full';
    /** Extra keyboard handling, e.g. arrow navigation in the lightbox. */
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    className?: string;
    /** Dark chrome for media viewing. */
    tone?: 'light' | 'dark';
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
    open,
    onClose,
    title,
    hideTitle,
    description,
    children,
    footer,
    size = 'lg',
    onKeyDown,
    className,
    tone = 'light',
}: ModalProps) {
    /**
     * Tracked as state, not a plain ref, because `Portal` renders `null` until it
     * has mounted. A ref-based effect keyed only on `open` would run while the
     * panel does not exist yet, leave focus outside the dialog, and silently break
     * Escape and arrow keys — so the focus effect has to re-run when the node
     * actually attaches.
     */
    const [panel, setPanel] = React.useState<HTMLDivElement | null>(null);
    const restoreFocusTo = React.useRef<HTMLElement | null>(null);
    const titleId = React.useId();
    const descriptionId = React.useId();

    /* Remember the trigger, then move focus into the panel. */
    React.useEffect(() => {
        if (!open || !panel) return;

        restoreFocusTo.current = document.activeElement as HTMLElement | null;
        const first = panel.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel).focus();

        return () => {
            // Returning focus is what makes a keyboard user not lose their place.
            restoreFocusTo.current?.focus?.();
        };
    }, [open, panel]);

    /* Prevent the page behind the overlay from scrolling. */
    React.useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    if (!open) return null;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
            return;
        }

        if (event.key === 'Tab') {
            const nodes = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
            if (nodes.length === 0) return;

            const first = nodes[0]!;
            const last = nodes[nodes.length - 1]!;

            if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
        }

        onKeyDown?.(event);
    };

    const isDark = tone === 'dark';

    return (
        <Portal>
            <div
                role="presentation"
                onKeyDown={handleKeyDown}
                className={cn(
                    'fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5',
                    isDark ? 'bg-black/85' : 'bg-navy-900/50 backdrop-blur-sm',
                )}
                onMouseDown={(event) => {
                    // Only a click that both starts and ends on the backdrop closes.
                    if (event.target === event.currentTarget) onClose();
                }}
            >
                <div
                    ref={setPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={description ? descriptionId : undefined}
                    tabIndex={-1}
                    className={cn(
                        'flex max-h-full w-full flex-col overflow-hidden outline-none',
                        size === 'md' && 'max-w-lg',
                        size === 'lg' && 'max-w-4xl',
                        size === 'full' && 'max-w-6xl',
                        isDark
                            ? 'bg-transparent'
                            : 'rounded-panel border border-line bg-white shadow-raised',
                        className,
                    )}
                >
                    <div
                        className={cn(
                            'flex items-start gap-3',
                            isDark ? 'pb-2' : 'border-b border-line px-4 py-3',
                        )}
                    >
                        <div className="min-w-0 flex-1">
                            <h2
                                id={titleId}
                                className={cn(
                                    'text-[15px] font-extrabold',
                                    hideTitle && 'sr-only',
                                    isDark ? 'text-white' : 'text-navy-800',
                                )}
                            >
                                {title}
                            </h2>
                            {description ? (
                                <p
                                    id={descriptionId}
                                    className={cn(
                                        'mt-0.5 text-[12px]',
                                        hideTitle && 'sr-only',
                                        isDark ? 'text-white/70' : 'text-ink-soft',
                                    )}
                                >
                                    {description}
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className={cn(
                                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors',
                                isDark
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'text-ink-soft hover:bg-muted hover:text-ink',
                            )}
                        >
                            <X className="h-4 w-4" aria-hidden />
                        </button>
                    </div>

                    <div className={cn('min-h-0 flex-1 overflow-y-auto', !isDark && 'px-4 py-3')}>
                        {children}
                    </div>

                    {footer ? (
                        <div
                            className={cn(
                                'flex flex-wrap items-center gap-2',
                                isDark ? 'pt-2' : 'border-t border-line bg-page px-4 py-3',
                            )}
                        >
                            {footer}
                        </div>
                    ) : null}
                </div>
            </div>
        </Portal>
    );
}
