import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-orange/60 focus-visible:ring-offset-2 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                primary:
                    'bg-orange text-white shadow-[0_6px_16px_-8px_rgba(255,107,23,0.9)] hover:bg-orange-600 active:bg-orange-700',
                navy: 'bg-navy text-white hover:bg-navy-800 shadow-[0_6px_16px_-10px_rgba(7,49,116,0.8)]',
                outline: 'border border-line bg-white text-ink hover:border-navy-200 hover:bg-navy-50/60',
                outlineNavy: 'border border-navy/25 bg-white text-navy hover:bg-navy-50',
                outlineWhite: 'border border-white/35 bg-white/10 text-white hover:bg-white/20',
                ghost: 'text-ink hover:bg-muted',
                soft: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
                teal: 'bg-teal text-white hover:bg-teal-600',
                green: 'bg-green text-white hover:brightness-95',
                link: 'text-navy-600 underline-offset-4 hover:underline hover:text-orange p-0 h-auto',
                danger: 'bg-red-alert text-white hover:brightness-95',
            },
            size: {
                xs: 'h-8 px-3 text-xs',
                sm: 'h-9 px-3.5 text-[13px]',
                md: 'h-11 px-5 text-sm',
                lg: 'h-12 px-6 text-[15px]',
                xl: 'h-[52px] px-7 text-base',
                icon: 'h-10 w-10',
                iconSm: 'h-8 w-8',
            },
            full: { true: 'w-full', false: '' },
        },
        defaultVariants: { variant: 'primary', size: 'md', full: false },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { className, variant, size, full, asChild = false, loading = false, loadingText, children, disabled, ...props },
    ref,
) {
    const Comp = asChild ? Slot : 'button';

    if (asChild) {
        return (
            <Comp className={cn(buttonVariants({ variant, size, full }), className)} ref={ref} {...props}>
                {children}
            </Comp>
        );
    }

    return (
        <Comp
            className={cn(buttonVariants({ variant, size, full }), className)}
            ref={ref}
            disabled={disabled ?? loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>{loadingText ?? 'Please wait…'}</span>
                </>
            ) : (
                children
            )}
        </Comp>
    );
});

export { buttonVariants };
