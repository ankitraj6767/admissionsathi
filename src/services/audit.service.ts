import 'server-only';
import {
    auditEntityNames,
    createAuditLog,
    listAuditLogsForEntity,
    paginateAuditLogs,
} from '@/db/repositories/system.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { clientFingerprint } from '@/lib/rate-limit';
import { escapeRegex } from '@/lib/utils';
import { logger, newRequestId } from '@/lib/logger';
import type { AuditLogDoc } from '@/db/models/system.model';
import type { SessionActor } from '@/lib/auth/rbac';
import type { Paginated } from '@/types/common';

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
        const { ipHash, userAgent } = await clientFingerprint();

        await createAuditLog({
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

/* --------------------------------- reading -------------------------------- */

export interface AuditLogQuery {
    q?: string;
    entity?: string;
    outcome?: string;
    page?: string;
}

export interface AuditLogScreenData {
    result: Paginated<AuditLogDoc>;
    entities: string[];
}

/** Filtered, paginated audit trail plus the entity list for the filter dropdown. */
export async function getAuditLogScreenData(
    query: AuditLogQuery,
): Promise<AuditLogScreenData> {
    const filter: Record<string, unknown> = {};

    if (query.q) {
        const rx = new RegExp(escapeRegex(query.q), 'i');
        filter.$or = [{ action: rx }, { entityLabel: rx }, { actorName: rx }];
    }
    if (query.entity) filter.entity = query.entity;
    if (query.outcome) filter.outcome = query.outcome;

    const [result, entities] = await Promise.all([
        paginateAuditLogs({ filter, page: Number(query.page) || 1, pageSize: 30 }),
        auditEntityNames(),
    ]);

    return { result: toPlain(result), entities };
}

/** Change history for a single record, shown on admin edit screens. */
export async function getEntityAuditTrail(
    entity: string,
    entityId: string,
    limit = 20,
): Promise<AuditLogDoc[]> {
    return toPlain(await listAuditLogsForEntity(entity, entityId, limit));
}
