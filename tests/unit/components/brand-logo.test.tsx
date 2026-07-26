// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandLogo } from '@/components/layout/brand-logo';
import type { BrandingConfig } from '@/lib/branding';

const branding: BrandingConfig = {
    name: 'Campus Guide',
    tagline: 'Find your next step',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png',
    logoDarkUrl: 'https://res.cloudinary.com/demo/image/upload/logo-dark.png',
    faviconUrl: 'https://res.cloudinary.com/demo/image/upload/icon.png',
};

describe('BrandLogo', () => {
    it('renders the configured emblem with a dynamic light and dark wordmark', () => {
        const { container, rerender } = render(<BrandLogo branding={branding} />);

        expect(screen.getByRole('link', { name: 'Campus Guide home' })).toHaveAttribute(
            'href',
            '/',
        );
        expect(container.querySelector('img')).toHaveAttribute(
            'src',
            branding.logoUrl,
        );
        expect(screen.getByText('Campus')).toHaveStyle({ color: '#073174' });
        expect(screen.getByText('Guide')).toHaveClass('text-orange');
        expect(screen.getByText('Find your next step')).toHaveStyle({ color: '#667085' });

        rerender(<BrandLogo variant="dark" branding={branding} />);
        expect(container.querySelector('img')).toHaveAttribute(
            'src',
            branding.logoDarkUrl,
        );
        expect(screen.getByText('Campus')).toHaveStyle({ color: '#FFFFFF' });
        expect(screen.getByText('Guide')).toHaveClass('text-orange');
        expect(screen.getByText('Find your next step')).toHaveStyle({
            color: 'rgba(255,255,255,0.72)',
        });
    });

    it('falls back to the inline emblem without hiding the dynamic wordmark', () => {
        const { container } = render(<BrandLogo branding={branding} />);
        const image = container.querySelector('img');

        expect(image).not.toBeNull();
        fireEvent.error(image!);

        expect(container.querySelector('img')).not.toBeInTheDocument();
        expect(screen.getByText('Campus')).toBeInTheDocument();
        expect(screen.getByText('Guide')).toBeInTheDocument();
        expect(screen.getByText('Find your next step')).toBeInTheDocument();
    });
});
