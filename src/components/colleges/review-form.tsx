'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Star } from 'lucide-react';
import { RATING_FIELDS, reviewFormSchema, type ReviewFormValues } from '@/schemas/review.schema';
import { submitReviewAction } from '@/actions/review.actions';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/** Public review form with per-criterion star ratings. */
export function ReviewForm({
    collegeId,
    collegeSlug,
    collegeName,
}: {
    collegeId: string;
    collegeSlug: string;
    collegeName: string;
}) {
    const [done, setDone] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewFormSchema),
        defaultValues: {
            collegeId,
            collegeSlug,
            authorName: '',
            email: '',
            isAnonymous: false,
            title: '',
            reviewText: '',
            ratings: {
                overall: 0,
                placement: 0,
                faculty: 0,
                infrastructure: 0,
                campusLife: 0,
                valueForMoney: 0,
            },
            consent: false,
            website: '',
        },
    });

    const ratings = watch('ratings');

    const onSubmit = async (values: ReviewFormValues) => {
        setServerError(null);
        const result = await submitReviewAction(values);
        if (result.ok) setDone(result.message ?? 'Review submitted for moderation.');
        else setServerError(result.error);
    };

    if (done) {
        return (
            <div className="rounded-panel border border-green/30 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold text-green">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {done}
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <input type="hidden" {...register('collegeId')} />
            <input type="hidden" {...register('collegeSlug')} />

            <fieldset>
                <legend className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
                    Rate {collegeName}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                    {RATING_FIELDS.map((field) => {
                        const value = Number(ratings?.[field.key] ?? 0);
                        return (
                            <div
                                key={field.key}
                                className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2"
                            >
                                <span className="text-[12.5px] font-semibold text-ink">{field.label}</span>
                                <span className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            aria-label={`${field.label}: ${star} star${star > 1 ? 's' : ''}`}
                                            onClick={() => setValue(`ratings.${field.key}`, star, { shouldValidate: true })}
                                            className="p-0.5"
                                        >
                                            <Star
                                                className={cn(
                                                    'h-4 w-4',
                                                    star <= value ? 'fill-amber-alert text-amber-alert' : 'text-line',
                                                )}
                                                aria-hidden
                                            />
                                        </button>
                                    ))}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {errors.ratings?.overall ? (
                    <p role="alert" className="mt-1 text-[11.5px] font-semibold text-red-alert">
                        Please rate the overall experience.
                    </p>
                ) : null}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your name" htmlFor="review-name" required error={errors.authorName?.message}>
                    <Input id="review-name" invalid={Boolean(errors.authorName)} {...register('authorName')} />
                </Field>
                <Field label="Email (not published)" htmlFor="review-email" required error={errors.email?.message}>
                    <Input id="review-email" type="email" invalid={Boolean(errors.email)} {...register('email')} />
                </Field>
                <Field label="Course studied" htmlFor="review-course" error={errors.courseName?.message}>
                    <Input id="review-course" placeholder="e.g. B.Tech CSE" {...register('courseName')} />
                </Field>
                <Field label="Passing year" htmlFor="review-year" error={errors.passingYear?.message}>
                    <Input id="review-year" type="number" inputMode="numeric" placeholder="e.g. 2024" {...register('passingYear')} />
                </Field>
            </div>

            <Field label="Headline" htmlFor="review-title" required error={errors.title?.message}>
                <Input
                    id="review-title"
                    placeholder="Sum up your experience in one line"
                    invalid={Boolean(errors.title)}
                    {...register('title')}
                />
            </Field>

            <Field label="Your review" htmlFor="review-text" required error={errors.reviewText?.message}>
                <Textarea
                    id="review-text"
                    rows={5}
                    placeholder="Share specifics about teaching, placements, infrastructure and campus life."
                    invalid={Boolean(errors.reviewText)}
                    {...register('reviewText')}
                />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pros" htmlFor="review-pros" error={errors.pros?.message}>
                    <Textarea id="review-pros" rows={3} {...register('pros')} />
                </Field>
                <Field label="Cons" htmlFor="review-cons" error={errors.cons?.message}>
                    <Textarea id="review-cons" rows={3} {...register('cons')} />
                </Field>
            </div>

            <div aria-hidden className="pointer-events-none absolute left-[-9999px]">
                <input tabIndex={-1} autoComplete="off" {...register('website')} />
            </div>

            <label className="flex items-start gap-2 text-[12px] text-ink-soft">
                <Checkbox {...register('isAnonymous')} />
                Publish my review anonymously
            </label>

            <label className="flex items-start gap-2 text-[12px] text-ink-soft">
                <Checkbox invalid={Boolean(errors.consent)} {...register('consent')} />
                I confirm this review is based on my own experience and contains no abusive or defamatory content.
            </label>
            {errors.consent ? (
                <p role="alert" className="text-[11.5px] font-semibold text-red-alert">
                    {errors.consent.message}
                </p>
            ) : null}

            {serverError ? (
                <p role="alert" className="text-[12.5px] font-semibold text-red-alert">
                    {serverError}
                </p>
            ) : null}

            <Button type="submit" variant="primary" loading={isSubmitting} loadingText="Submitting…">
                Submit review
            </Button>
            <p className="text-[11px] text-ink-soft">
                Reviews are moderated before publishing. We never publish your email address.
            </p>
        </form>
    );
}
