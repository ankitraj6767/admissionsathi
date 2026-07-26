import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { AuditLog } from '@/db/models/system.model';
import { clientFingerprint } from '@/lib/rate-limit';
import { logger, newRequestId } from '@/lib/logger';
import type { SessionActor } from '@/lib/auth/rbac';

const SENSITIVE_FIELDS = [
    'passwordHash',
    'password',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'idempotencyKey',
];

function sanitize(values?: Record<string, unknown> | null): Record<string, unknown> | undefined {
    if (!values) return undefined;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
        if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) continue;
        if (value instanceof Date) out[key] = value.toISOString();
        else if (typeof value === 'object' && value !== null) {
            out[key] = JSON.parse(JSON.stringify(value)) as unknown;
        } else out[key] = value;
    }
    return out;
}

export interface AuditInput {
    actor?: SessionActor | null;
    action: string;
    entity: string;
    entityId?: string;
    entityLabel?: string;
    previousValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    outcome?: 'success' | 'failure' | 'denied';
    message?: string;
    requestId?: string;
}

/** Writes an audit record. Never throws — auditing must not break a mutation. */
export async function recordAudit(input: AuditInput): Promise<void> {
    const requestId = input.requestId ?? newRequestId();
    try {
        await connectToDatabase();
        const { ipHash, userAgent } = await clientFingerprint();

        await AuditLog.create({
            actor: input.actor?.id,
            actorName: input.actor?.name,
            actorRoles: input.actor?.roles ?? [],
            action: input.action,
            entity: input.entity,
            entityId: input.entityId,
            entityLabel: input.entityLabel,
            previousValues: sanitize(input.previousValues),
            newValues: sanitize(input.newValues),
            ipHash,
            userAgent: userAgent.slice(0, 400),
            requestId,
            outcome: input.outcome ?? 'success',
            message: input.message,
        });
    } catch (error) {
        logger.error('audit.write_failed', {
            action: input.action,
            entity: input.entity,
            requestId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
