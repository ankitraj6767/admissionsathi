import type { IconDefinition } from '@fortawesome/free-brands-svg-icons';

interface BrandIconProps {
    icon: IconDefinition;
    className?: string;
}

/**
 * Renders an official brand glyph as an inline SVG.
 *
 * The surrounding link owns the accessible name, so the SVG stays hidden from
 * assistive technology and cannot create a duplicate announcement.
 */
export function BrandIcon({ icon, className }: BrandIconProps) {
    const [width, height, , , pathData] = icon.icon;
    const paths = Array.isArray(pathData) ? pathData : [pathData];

    return (
        <svg
            aria-hidden="true"
            className={className}
            data-brand-icon={icon.iconName}
            focusable="false"
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
        >
            {paths.map((path) => (
                <path key={path} d={path} fill="currentColor" />
            ))}
        </svg>
    );
}
