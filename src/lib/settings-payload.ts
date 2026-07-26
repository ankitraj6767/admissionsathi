/**
 * React Hook Form treats dots in field names as object paths. Older settings
 * forms therefore submit both the original flat value (`"contact.phone"`) and,
 * after an edit, a newer nested value (`contact.phone`). Prefer the nested value
 * when it exists, while continuing to accept the canonical flat payload.
 */
export function readSubmittedSettingValue(
    values: Record<string, unknown>,
    key: string,
): { found: true; value: unknown } | { found: false } {
    const segments = key.split('.').filter(Boolean);
    const hasUnsafeSegment = segments.some(
        (segment) => segment === '__proto__' || segment === 'constructor' || segment === 'prototype',
    );

    if (segments.length > 1 && !hasUnsafeSegment) {
        let current: unknown = values;
        let found = true;

        for (const segment of segments) {
            if (
                typeof current !== 'object'
                || current === null
                || Array.isArray(current)
                || !Object.prototype.hasOwnProperty.call(current, segment)
            ) {
                found = false;
                break;
            }
            current = (current as Record<string, unknown>)[segment];
        }

        if (found) return { found: true, value: current };
    }

    if (Object.prototype.hasOwnProperty.call(values, key)) {
        return { found: true, value: values[key] };
    }

    return { found: false };
}
