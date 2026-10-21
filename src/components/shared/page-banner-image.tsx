import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Banner photos are already optimized, versioned WebP assets. Serve them
 * directly so the first paint does not wait for Next's image transformer, and
 * let phones select a smaller source from the same picture element.
 */
export function PageBannerImage({
    src,
    priority = false,
    sizes = '100vw',
    className,
}: {
    src: string;
    priority?: boolean;
    sizes?: string;
    className?: string;
}) {
    const isLocalBanner = src.startsWith('/brand/page-banners/') && src.endsWith('.webp');

    if (isLocalBanner) {
        const mobileSrc = src.replace(/\.webp$/, '-mobile.webp');

        return (
            <picture className="pointer-events-none absolute inset-0">
                <source media="(max-width: 767px)" srcSet={mobileSrc} />
                <img
                    src={src}
                    alt=""
                    fetchPriority={priority ? 'high' : undefined}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    className={cn('h-full w-full object-cover', className)}
                />
            </picture>
        );
    }

    return (
        <Image
            src={src}
            alt=""
            fill
            priority={priority}
            quality={75}
            sizes={sizes}
            className={cn('object-cover', className)}
        />
    );
}
