// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

/**
 * Proves the component-test setup: the `@vitest-environment jsdom` docblock
 * above switches this single file to jsdom (the suite default stays node), and
 * jest-dom matchers are registered by tests/setup.ts.
 */
function Badge({ label, muted = false }: { label: string; muted?: boolean }) {
    return (
        <span className={cn('rounded px-2 py-1 text-sm', muted && 'opacity-60')} data-testid="badge">
            {label}
        </span>
    );
}

describe('jsdom component environment', () => {
    it('renders a component and exposes jest-dom matchers', () => {
        render(<Badge label="Very High Chance" />);

        const badge = screen.getByTestId('badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('Very High Chance');
        expect(badge).toHaveClass('rounded', 'px-2', 'py-1', 'text-sm');
    });

    it('applies conditional classes', () => {
        render(<Badge label="Low Chance" muted />);
        expect(screen.getByTestId('badge')).toHaveClass('opacity-60');
    });
});
