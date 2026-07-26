import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getCollegeDetail } from '@/services/college.service';

export default async function CollegeGalleryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();
    const { college } = detail;

    const images = college.gallery ?? [];

    return (
        <div className="space-y-4">
            <SectionCard title="Campus gallery" icon="Palette" description={`${images.length} images`}>
                {images.length === 0 ? (
                    <EmptyState
                        icon="Palette"
                        title="No gallery images uploaded yet"
                        description="Campus photos are added by the content team from the admin media library."
                    />
                ) : (
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {images.map((image, index) => (
                            <li key={`${image.url}-${index}`} className="overflow-hidden rounded-[12px] border border-line">
                                <div className="relative aspect-[4/3]">
                                    <Image
                                        src={image.url}
                                        alt={image.alt ?? `${college.name} campus image ${index + 1}`}
                                        fill
                                        sizes="(min-width: 1024px) 25vw, 50vw"
                                        className="object-cover"
                                    />
                                </div>
                                {image.alt ? (
                                    <p className="px-2 py-1.5 text-[11px] text-ink-soft">{image.alt}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            {college.videoUrl ? (
                <SectionCard title="Campus tour" icon="Video">
                    <div className="aspect-video overflow-hidden rounded-[12px] border border-line">
                        <iframe
                            src={college.videoUrl}
                            title={`${college.name} campus tour`}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            className="h-full w-full"
                        />
                    </div>
                </SectionCard>
            ) : null}
        </div>
    );
}
