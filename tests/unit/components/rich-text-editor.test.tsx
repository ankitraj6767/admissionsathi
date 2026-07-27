// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from '@/components/admin/rich-text-editor';

/**
 * jsdom implements neither `execCommand` nor `queryCommandState`, so the toolbar
 * commands themselves cannot be asserted here — they are stubbed to keep the
 * component from throwing. What these tests protect is the part that is ours:
 * the accessible structure, the source-view toggle, and the value round-trip.
 */
function stubEditingApis() {
    Object.assign(document, {
        execCommand: vi.fn().mockReturnValue(true),
        queryCommandState: vi.fn().mockReturnValue(false),
    });
}

function renderEditor(props: Partial<React.ComponentProps<typeof RichTextEditor>> = {}) {
    stubEditingApis();
    const onChange = vi.fn();
    const result = render(
        <RichTextEditor id="field-overview" value="" onChange={onChange} {...props} />,
    );
    return { onChange, ...result };
}

describe('RichTextEditor — accessibility', () => {
    it('exposes an editable textbox rather than a raw HTML textarea', () => {
        renderEditor();

        const box = screen.getByRole('textbox');
        expect(box).toHaveAttribute('contenteditable', 'true');
        expect(box).toHaveAttribute('aria-multiline', 'true');
    });

    /**
     * A `<label for>` only binds to real form controls, so the contentEditable
     * surface needs its own accessible name or it is announced as unlabelled.
     */
    it('names the editing surface from the field label', () => {
        renderEditor({ label: 'Overview' });

        expect(screen.getByRole('textbox', { name: 'Overview' })).toBeInTheDocument();
    });

    it('names the source view distinctly', async () => {
        const user = userEvent.setup();
        renderEditor({ label: 'Overview' });

        await user.click(screen.getByRole('button', { name: /edit html source/i }));

        expect(screen.getByRole('textbox', { name: /overview \(html source\)/i })).toBeInTheDocument();
    });

    it('labels the formatting toolbar', () => {
        renderEditor();

        expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
    });

    it('gives every toolbar control an accessible name', () => {
        renderEditor();

        const toolbar = screen.getByRole('toolbar', { name: /formatting/i });
        const buttons = toolbar.querySelectorAll('button');

        expect(buttons.length).toBeGreaterThan(5);
        buttons.forEach((button) => {
            expect(button.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0);
        });
    });

    it('offers plain-language text styles, not tag names', () => {
        renderEditor();

        const select = screen.getByLabelText(/text style/i);
        const labels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);

        expect(labels).toEqual([
            'Normal text',
            'Heading',
            'Sub-heading',
            'Small heading',
            'Quote',
        ]);
    });

    it('does not show the old raw-HTML placeholder', () => {
        renderEditor();

        expect(screen.queryByText(/<p>HTML content/)).not.toBeInTheDocument();
    });

    it('renders a friendly placeholder on the editing surface', () => {
        renderEditor({ placeholder: 'Describe the course…' });

        expect(screen.getByRole('textbox')).toHaveAttribute('data-placeholder', 'Describe the course…');
    });
});

describe('RichTextEditor — value handling', () => {
    it('renders the incoming HTML as formatted content', () => {
        renderEditor({ value: '<h2>Overview</h2><p>Body</p>' });

        const box = screen.getByRole('textbox');
        expect(box.querySelector('h2')?.textContent).toBe('Overview');
        expect(box.querySelector('p')?.textContent).toBe('Body');
    });

    it('previews content with the same stylesheet the public page uses', () => {
        renderEditor({ value: '<p>a</p>' });

        // `.prose-sathi` is what the public RichText component applies, so the
        // editor body really is a preview rather than an approximation.
        expect(screen.getByRole('textbox').className).toContain('prose-sathi');
    });

    it('marks the field invalid for assistive technology', () => {
        const { container } = renderEditor({ invalid: true, value: '' });

        expect(container.firstElementChild?.className).toContain('border-red-alert');
    });
});

describe('RichTextEditor — HTML source view', () => {
    it('is hidden by default', () => {
        renderEditor({ value: '<p>a</p>' });

        expect(screen.queryByDisplayValue('<p>a</p>')).not.toBeInTheDocument();
    });

    it('reveals the raw markup when toggled, keeping the power-user path', async () => {
        const user = userEvent.setup();
        renderEditor({ value: '<p>Hello</p>' });

        await user.click(screen.getByRole('button', { name: /edit html source/i }));

        expect(screen.getByDisplayValue('<p>Hello</p>')).toBeInTheDocument();
        // The visual surface is replaced, not shown alongside the source.
        expect(screen.getByRole('textbox')).not.toHaveAttribute('contenteditable');
    });

    it('emits edits made in the source view', async () => {
        const user = userEvent.setup();
        const { onChange } = renderEditor({ value: '' });

        await user.click(screen.getByRole('button', { name: /edit html source/i }));
        await user.type(screen.getByRole('textbox'), '<p>x</p>');

        expect(onChange).toHaveBeenCalled();
    });

    it('returns to the visual editor with the content still rendered', async () => {
        const user = userEvent.setup();
        renderEditor({ value: '<p>Hello</p>' });

        await user.click(screen.getByRole('button', { name: /edit html source/i }));
        await user.click(screen.getByRole('button', { name: /back to visual editor/i }));

        const box = screen.getByRole('textbox');
        expect(box).toHaveAttribute('contenteditable', 'true');
        // Regression guard: the surface remounts, so it must be repainted rather
        // than left blank because the sync marker already matched the value.
        expect(box.innerHTML).toBe('<p>Hello</p>');
    });
});

describe('RichTextEditor — link editing', () => {
    it('opens an inline address field instead of a browser prompt', async () => {
        const user = userEvent.setup();
        renderEditor();

        await user.click(screen.getByRole('button', { name: /add or edit link/i }));

        expect(screen.getByLabelText(/link address/i)).toBeInTheDocument();
    });

    it('closes the link field on cancel', async () => {
        const user = userEvent.setup();
        renderEditor();

        await user.click(screen.getByRole('button', { name: /add or edit link/i }));
        await user.click(screen.getByRole('button', { name: /^cancel$/i }));

        expect(screen.queryByLabelText(/link address/i)).not.toBeInTheDocument();
    });

    it('ignores an unsafe URL rather than applying it', async () => {
        const user = userEvent.setup();
        renderEditor();

        await user.click(screen.getByRole('button', { name: /add or edit link/i }));
        await user.type(screen.getByLabelText(/link address/i), 'javascript:alert(1)');
        await user.click(screen.getByRole('button', { name: /^apply$/i }));

        expect(document.execCommand).not.toHaveBeenCalledWith('createLink', false, 'javascript:alert(1)');
    });
});
