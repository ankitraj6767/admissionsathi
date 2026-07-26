// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: () => '/',
}));

import { MobileNav } from '@/components/layout/mobile-nav';
import { DEFAULT_BRANDING } from '@/lib/branding';

describe('MobileNav account destinations', () => {
    it('shows both admin and user dashboards to signed-in staff', async () => {
        render(
            <MobileNav
                items={[]}
                isAuthenticated
                isStaff
                phone="+91 90000 00000"
                branding={DEFAULT_BRANDING}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

        expect(await screen.findByRole('link', { name: 'Admin Dashboard' })).toHaveAttribute('href', '/admin');
        expect(screen.getByRole('link', { name: 'User Dashboard' })).toHaveAttribute('href', '/dashboard');
    });

    it('keeps the admin destination hidden from student accounts', async () => {
        render(
            <MobileNav
                items={[]}
                isAuthenticated
                isStaff={false}
                branding={DEFAULT_BRANDING}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

        expect(await screen.findByRole('link', { name: 'My Dashboard' })).toHaveAttribute('href', '/dashboard');
        expect(screen.queryByRole('link', { name: 'Admin Dashboard' })).not.toBeInTheDocument();
    });
});
