/**
 * Structured server logger.
 * Emits single-line JSON so hosting platforms (Vercel / CloudWatch) can index fields.
 * Secrets are never logged: values under `REDACTED_KEYS` are masked.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const REDACTED_KEYS = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'authorization',
    'cookie',
    'apikey',
    'api_key',
    'mongodb_uri',
    'accesstoken',
    'refreshtoken',
];

function redact(value: unknown, depth = 0): unknown {
    if (depth > 4) return '[deep]';
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = REDACTED_KEYS.includes(k.toLowerCase()) ? '[redacted]' : redact(v, depth + 1);
        }
        return out;
    }
    return value;
}

function emit(level: Level, event: string, context?: Record<string, unknown>) {
    const payload = {
        ts: new Date().toISOString(),
        level,
        event,
        ...(context ? (redact(context) as Record<string, unknown>) : {}),
    };

    const line = JSON.stringify(payload);
    // eslint-disable-next-line no-console
    if (level === 'error') console.error(line);
    // eslint-disable-next-line no-console
    else if (level === 'warn') console.warn(line);
    // eslint-disable-next-line no-console
    else if (level === 'debug') {
        if (process.env.NODE_ENV !== 'production') console.debug(line);
    } else console.log(line);
}

export const logger = {
    debug: (event: string, context?: Record<string, unknown>) => emit('debug', event, context),
    info: (event: string, context?: Record<string, unknown>) => emit('info', event, context),
    warn: (event: string, context?: Record<string, unknown>) => emit('warn', event, context),
    error: (event: string, context?: Record<string, unknown>) => emit('error', event, context),
};

export function newRequestId(): string {
    return `req_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
