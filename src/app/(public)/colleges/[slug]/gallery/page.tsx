import { notFound } from 'next/navigation';
import { SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { GalleryView, type GalleryTile } from '@/components/colleges/gallery-view';
import { getCollegeDetail } from '@/services/college.service';
import { toEmbedUrl } from '@/lib/media/video';

export default async function CollegeGalleryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();
    const { college } = detail;

    /**
     * Rows written before videos were supported have no `kind`, so it is defaulted
     * here as well as in the schema — a college whose gallery predates this feature
     * still renders as photos rather than disappearing.
     */
    const ordered: GalleryTile[] = (college.gallery ?? [])
        .map((item, index) => ({
            kind: item.kind === 'video' ? ('video' as const) : ('image' as const),
            url: item.url,
            alt: item.alt,
            caption: item.caption,
            width: item.width,
            height: item.height,
            blurDataUrl: item.blurDataUrl,
            embedUrl: item.embedUrl,
            thumbnailUrl: item.thumbnailUrl,
            videoProvider: item.videoProvider,
            // Legacy rows have no `displayOrder`; fall back to array position so
            // their original order is preserved rather than collapsing to 0.
            sortKey: item.displayOrder ?? index,
        }))
        .filter((item) => Boolean(item.url))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey: _sortKey, ...tile }) => tile);

    const tourEmbedUrl = toEmbedUrl(college.videoUrl);
    const photoCount = ordered.filter((item) => item.kind === 'image').length;
    const videoCount = ordered.length - photoCount;

    const summary = [
        photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : null,
        videoCount > 0 ? `${videoCount} video${videoCount === 1 ? '' : 's'}` : null,
    ]
        .filter(Boolean)
        .join(' • ');

    return (
        <div className="space-y-4">
            <SectionCard
                title="Campus gallery"
                icon="Palette"
                description={summary || undefined}
            >
                {ordered.length === 0 && !tourEmbedUrl ? (
                    <EmptyState
                        icon="Palette"
                        title="No campus photos or videos yet"
                        description="Photos and video tours are added by the content team from the admin media library."
                    />
                ) : (
                    <GalleryView
                        items={ordered}
                        collegeName={college.name}
                        tourEmbedUrl={tourEmbedUrl}
                    />
                )}
            </SectionCard>
        </div>
    );
}
