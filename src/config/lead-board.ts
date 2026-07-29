import { LEAD_STATUSES } from './constants';

/**
 * Presentation metadata for the lead lifecycle.
 *
 * Kept next to the enum rather than inside a component so the board, the table
 * chips and the analytics funnel all label a stage the same way.
 */
export const LEAD_STATUS_LABELS: Record<string, string> = {
    new: 'New lead',
    contacted: 'Contacted',
    qualified: 'Qualified',
    session_scheduled: 'Session scheduled',
    session_completed: 'Session completed',
    follow_up: 'Follow-up required',
    converted: 'Converted',
    closed: 'Closed',
    lost: 'Lost',
};

export type LeadStatusTone = 'navy' | 'blue' | 'teal' | 'purple' | 'amber' | 'green' | 'neutral' | 'red';

export const LEAD_STATUS_TONES: Record<string, LeadStatusTone> = {
    new: 'navy',
    contacted: 'blue',
    qualified: 'teal',
    session_scheduled: 'purple',
    session_completed: 'purple',
    follow_up: 'amber',
    converted: 'green',
    closed: 'neutral',
    lost: 'red',
};

/** Stage options for pickers, in lifecycle order. */
export const LEAD_STATUS_OPTIONS = LEAD_STATUSES.map((status) => ({
    value: status,
    label: LEAD_STATUS_LABELS[status] ?? status,
}));
