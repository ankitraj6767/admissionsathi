// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminResource } from '@/config/admin-resources';

/**
 * Dotted field names (`contact.website`, `feeRange.min`, `seo.title`) round-trip
 * through the generated admin form.
 *
 * React Hook Form treats `.` in a field name as a *path* and writes
 * `{ contact: { website } }`, while the resource schema and the Mongo `$set`
 * payload are keyed by the literal dotted string. Without an explicit flatten,
 * every edit to one of the 33 dotted fields in `admin-resources.ts` is silently
 * dropped: the form reports "Saved" and the old value returns on reload.
 */
const actions = vi.hoisted(() => ({
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
}));

vi.mock('@/actions/admin/crud.actions', () => ({
    createResourceAction: actions.create,
    updateResourceAction: actions.update,
    deleteResourceAction: actions.remove,
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { ResourceForm } from '@/components/admin/resource-form';

const resource: Pick<
    AdminResource,
    'key' | 'label' | 'labelSingular' | 'fields' | 'titleField' | 'slugField'
> = {
    key: 'colleges',
    label: 'Colleges',
    labelSingular: 'College',
    titleField: 'name',
    slugField: 'slug',
    fields: [
        { name: 'name', label: 'College name', type: 'text', required: true },
        { name: 'contact.phone', label: 'Phone', type: 'text' },
        { name: 'contact.website', label: 'Website', type: 'text' },
        { name: 'brochureUrl', label: 'Brochure URL', type: 'text' },
        { name: 'feeRange.min', label: 'Annual fee from', type: 'number' },
        { name: 'seo.title', label: 'SEO title', type: 'text' },
    ],
};

function renderForm(initialValues: Record<string, unknown> = {}) {
    return render(
        <ResourceForm
            resource={resource}
            mode="edit"
            docId="college-1"
            initialValues={initialValues}
            referenceOptions={{}}
            canDelete={false}
        />,
    );
}

const seeded = {
    name: 'Silverpeak Institute',
    contact: { phone: '+91 91555 55555', website: 'https://old.example.org' },
    brochureUrl: 'https://old.example.org/brochure.pdf',
    feeRange: { min: 120000 },
    seo: { title: 'Old title' },
};

function submittedValues(): Record<string, unknown> {
    expect(actions.update).toHaveBeenCalled();
    return actions.update.mock.calls[0]![2] as Record<string, unknown>;
}

beforeEach(() => {
    actions.update.mockResolvedValue({ ok: true, data: { id: 'college-1' }, message: 'Saved.' });
    actions.create.mockResolvedValue({ ok: true, data: { id: 'college-1' } });
});

describe('ResourceForm — reading nested values', () => {
    it('populates a dotted field from the nested document', () => {
        renderForm(seeded);

        expect(screen.getByLabelText(/^website/i)).toHaveValue('https://old.example.org');
        expect(screen.getByLabelText(/^phone/i)).toHaveValue('+91 91555 55555');
        expect(screen.getByLabelText(/seo title/i)).toHaveValue('Old title');
    });
});

describe('ResourceForm — saving dotted fields', () => {
    it('submits an edited website under its dotted key', async () => {
        const user = userEvent.setup();
        renderForm(seeded);

        const website = screen.getByLabelText(/^website/i);
        await user.clear(website);
        await user.type(website, 'https://silverpeak.example.org');
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        const values = submittedValues();
        expect(values['contact.website']).toBe('https://silverpeak.example.org');
        // A nested object would be dropped by the dotted-key resource schema.
        expect(values.contact).toBeUndefined();
    });

    it('submits an edited brochure URL', async () => {
        const user = userEvent.setup();
        renderForm(seeded);

        const brochure = screen.getByLabelText(/brochure url/i);
        await user.clear(brochure);
        await user.type(brochure, 'https://silverpeak.example.org/brochure.pdf');
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(submittedValues().brochureUrl).toBe('https://silverpeak.example.org/brochure.pdf');
    });

    it('keeps untouched dotted fields at their stored value', async () => {
        const user = userEvent.setup();
        renderForm(seeded);

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        const values = submittedValues();
        expect(values['contact.phone']).toBe('+91 91555 55555');
        expect(values['seo.title']).toBe('Old title');
    });

    it('submits every dotted field edited in one pass', async () => {
        const user = userEvent.setup();
        renderForm(seeded);

        const website = screen.getByLabelText(/^website/i);
        const phone = screen.getByLabelText(/^phone/i);
        await user.clear(website);
        await user.type(website, 'https://a.example.org');
        await user.clear(phone);
        await user.type(phone, '+91 90000 00000');
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        const values = submittedValues();
        expect(values['contact.website']).toBe('https://a.example.org');
        expect(values['contact.phone']).toBe('+91 90000 00000');
    });

    it('submits a cleared dotted field as empty, so it can be removed', async () => {
        const user = userEvent.setup();
        renderForm(seeded);

        await user.clear(screen.getByLabelText(/^website/i));
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(submittedValues()['contact.website']).toBe('');
    });
});

describe('ResourceForm — server field errors on dotted fields', () => {
    it('shows a server-side error against the right dotted field', async () => {
        const user = userEvent.setup();
        actions.update.mockResolvedValue({
            ok: false,
            error: 'Please correct the highlighted fields.',
            code: 'VALIDATION',
            fieldErrors: { 'contact.website': ['Enter a valid URL'] },
        });

        renderForm(seeded);
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(await screen.findByText('Enter a valid URL')).toBeInTheDocument();
    });
});
