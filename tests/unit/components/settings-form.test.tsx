// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actionMocks = vi.hoisted(() => ({
    updateSettingsAction: vi.fn(),
}));

vi.mock('@/actions/admin/settings.actions', () => ({
    updateSettingsAction: actionMocks.updateSettingsAction,
}));

import { SettingsForm, type SettingRow } from '@/components/admin/settings-form';

const settings: SettingRow[] = [
    {
        key: 'contact.phone',
        group: 'contact',
        label: 'Support phone',
        valueType: 'string',
        value: '+91 91555 55555',
        isSecret: false,
    },
    {
        key: 'features.newsletterEnabled',
        group: 'features',
        label: 'Enable newsletter',
        valueType: 'boolean',
        value: true,
        isSecret: false,
    },
    {
        key: 'integrations.privateToken',
        group: 'integrations',
        label: 'Private token',
        valueType: 'string',
        value: null,
        isSecret: true,
    },
];

describe('SettingsForm', () => {
    beforeEach(() => {
        actionMocks.updateSettingsAction.mockResolvedValue({
            ok: true,
            data: { updated: 2 },
            message: '2 setting(s) saved.',
        });
    });

    it('submits edited dotted settings as canonical flat keys', async () => {
        render(<SettingsForm settings={settings} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'Support phone' }), {
            target: { value: '+91 90000 00000' },
        });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Enable newsletter' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save all settings' }));

        await waitFor(() => expect(actionMocks.updateSettingsAction).toHaveBeenCalledTimes(1));
        expect(actionMocks.updateSettingsAction).toHaveBeenCalledWith({
            values: {
                'contact.phone': '+91 90000 00000',
                'features.newsletterEnabled': false,
            },
        });
        expect(await screen.findByRole('status')).toHaveTextContent('2 setting(s) saved.');
    });

    it('never includes secret fields in the mutation payload', async () => {
        render(<SettingsForm settings={settings} />);

        expect(screen.getByRole('textbox', { name: 'Private token' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Save all settings' }));

        await waitFor(() => expect(actionMocks.updateSettingsAction).toHaveBeenCalledTimes(1));
        expect(actionMocks.updateSettingsAction.mock.calls[0]?.[0].values).not.toHaveProperty(
            'integrations.privateToken',
        );
    });
});
