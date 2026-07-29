import Link from 'next/link';
import { Card, SectionHeader } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import type { DirectoryGeoLinks } from '@/services/home-data.service';
import type { ExploreDirectoryConfig } from '@/schemas/homepage.schema';

/**
 * Directory link block.
 *
 * Two jobs. For a visitor it offers the three natural entry points — where, what,
 * and which exam. For a crawler it links the SEO landing pages from the homepage,
 * which is the strongest internal link they can get.
 *
 * Editorial columns come from the section config so an editor decides where link
 * equity goes; the state and city columns are generated from live geography and skip
 * anything with no published colleges, so no link here leads to an empty listing.
 */
export function ExploreDirectorySection({
    heading,
    description,
    config,
    geo,
}: {
    heading: string;
    description?: string;
    config: ExploreDirectoryConfig;
    geo: DirectoryGeoLinks;
}) {
    const geoColumns = [
        {
            title: 'By state',
            icon: 'Map',
            links: geo.states.map((s) => ({ label: s.name, url: `/colleges/state/${s.slug}` })),
            allUrl: '/colleges/state',
        },
        {
            title: 'By city',
            icon: 'MapPin',
            links: geo.cities.map((c) => ({ label: c.name, url: `/colleges/city/${c.slug}` })),
            allUrl: '/colleges/city',
        },
    ].filter((column) => column.links.length > 0);

    const columns = [
        ...config.columns.map((column) => ({ ...column, allUrl: undefined as string | undefined })),
        ...geoColumns,
    ];

    if (columns.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="explore-directory-heading">
            <SectionHeader title={heading} description={description} compact />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {columns.map((column) => (
                    <div key={column.title}>
                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                            {column.icon ? <Icon name={column.icon} className="h-3.5 w-3.5" /> : null}
                            {column.title}
                        </h3>
                        <ul className="space-y-1">
                            {column.links.map((link) => (
                                <li key={link.url}>
                                    <Link
                                        href={link.url}
                                        className="block truncate text-[12px] text-ink-soft transition-colors hover:text-navy-700"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                            {column.allUrl ? (
                                <li>
                                    <Link
                                        href={column.allUrl}
                                        className="text-[12px] font-bold text-navy-600 hover:text-orange"
                                    >
                                        View all →
                                    </Link>
                                </li>
                            ) : null}
                        </ul>
                    </div>
                ))}
            </div>
        </Card>
    );
}
