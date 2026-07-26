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
    it('renders the configured light and dark assets with dynamic accessibility text', () => {
        const { rerender } = render(<BrandLogo branding={branding} />);

        expect(screen.getByRole('link', { name: 'Campus Guide home' })).toHaveAttribute(
            'href',
            '/',
        );
        expect(screen.getByRole('img', { name: 'Campus Guide logo' })).toHaveAttribute(
            'src',
            branding.logoUrl,
        );

        rerender(<BrandLogo variant="dark" branding={branding} />);
        expect(screen.getByRole('img', { name: 'Campus Guide logo' })).toHaveAttribute(
            'src',
            branding.logoDarkUrl,
        );
    });

    it('falls back to the dynamic inline wordmark when an asset fails', () => {
        render(<BrandLogo branding={branding} />);

        fireEvent.error(screen.getByRole('img', { name: 'Campus Guide logo' }));

        expect(screen.queryByRole('img', { name: 'Campus Guide logo' })).not.toBeInTheDocument();
        expect(screen.getByText('Campus')).toBeInTheDocument();
        expect(screen.getByText('Guide')).toBeInTheDocument();
        expect(screen.getByText('Find your next step')).toBeInTheDocument();
    });
});
