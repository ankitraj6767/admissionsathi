'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Star, X } from 'lucide-react';
import {
    cancelBookingAction,
    rescheduleBookingAction,
    submitBookingFeedbackAction,
} from '@/actions/counselling.actions';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type Mode = 'none' | 'reschedule' | 'cancel' | 'review';

/** Reschedule / cancel / rate controls for a booking row. */
export function BookingActions({
    bookingId,
    canModify,
    canReview,
}: {
    bookingId: string;
    canModify: boolean;
    canReview: boolean;
}) {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('none');
    const [value, setValue] = useState('');
    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
        startTransition(async () => {
            const result = await fn();
            setMessage(result.ok ? (result.message ?? 'Done.') : (result.error ?? 'Something went wrong.'));
            if (result.ok) {
                setMode('none');
                router.refresh();
            }
        });

    return (
        <div className="flex w-full flex-wrap items-center gap-2">
            {canModify ? (
                <>
                    <Button variant="outline" size="sm" onClick={() => setMode(mode === 'reschedule' ? 'none' : 'reschedule')}>
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                        Reschedule
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setMode(mode === 'cancel' ? 'none' : 'cancel')}>
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Cancel
                    </Button>
                </>
            ) : null}

            {canReview ? (
                <Button variant="soft" size="sm" onClick={() => setMode(mode === 'review' ? 'none' : 'review')}>
                    <Star className="h-3.5 w-3.5" aria-hidden />
                    Rate session
                </Button>
            ) : null}

            {mode === 'reschedule' ? (
                <form
                    className="flex w-full flex-wrap items-center gap-2 border-t border-line pt-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(() =>
                            rescheduleBookingAction({ bookingId, scheduledAt: new Date(value).toISOString() }),
                        );
                    }}
                >
                    <label className="sr-only" htmlFor={`resched-${bookingId}`}>
                        New slot
                    </label>
                    <Input
                        id={`resched-${bookingId}`}
                        type="datetime-local"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        required
                        className="max-w-[230px]"
                    />
                    <Button type="submit" size="sm" variant="navy" loading={pending}>
                        Confirm new slot
                    </Button>
                </form>
            ) : null}

            {mode === 'cancel' ? (
                <form
                    className="flex w-full flex-wrap items-center gap-2 border-t border-line pt-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(() => cancelBookingAction({ bookingId, reason: value || 'Not required anymore' }));
                    }}
                >
                    <Input
                        placeholder="Reason for cancelling"
                        aria-label="Reason for cancelling"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="max-w-[280px]"
                    />
                    <Button type="submit" size="sm" variant="danger" loading={pending}>
                        Cancel session
                    </Button>
                </form>
            ) : null}

            {mode === 'review' ? (
                <form
                    className="w-full space-y-2 border-t border-line pt-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(() => submitBookingFeedbackAction({ bookingId, rating, comment: value }));
                    }}
                >
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                onClick={() => setRating(star)}
                            >
                                <Star
                                    className={cn('h-5 w-5', star <= rating ? 'fill-amber-alert text-amber-alert' : 'text-line')}
                                    aria-hidden
                                />
                            </button>
                        ))}
                    </div>
                    <Textarea
                        rows={2}
                        placeholder="What was helpful? What could be better?"
                        aria-label="Feedback comment"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <Button type="submit" size="sm" variant="primary" loading={pending} disabled={rating === 0}>
                        Submit feedback
                    </Button>
                </form>
            ) : null}

            {message ? (
                <p role="status" className="w-full text-[11.5px] font-semibold text-ink-soft">
                    {message}
                </p>
            ) : null}
        </div>
    );
}
