import 'server-only';
import type { FilterQuery, PipelineStage } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import {
    AiConversation,
    AnalyticsEvent,
    AuditLog,
    Comparison,
    EmailTemplate,
    Notification,
    SavedItem,
    SearchQuery,
    SearchSynonym,
    WhatsAppTemplate,
    type AiConversationDoc,
    type AnalyticsEventDoc,
    type AuditLogDoc,
    type ComparisonDoc,
    type EmailTemplateDoc,
    type NotificationDoc,
    type SavedItemDoc,
    type SearchQueryDoc,
    type SearchSynonymDoc,
    type WhatsAppTemplateDoc,
} from '@/db/models/system.model';
import { aggregateLean, countDocs, distinctLean, findLean, findOneLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

/* ------------------------------ saved items ------------------------------ */

export async function listSavedItemsForUser(
    userId: string,
    options: { limit?: number; entityType?: string } = {},
): Promise<SavedItemDoc[]> {
    return findLean<SavedItemDoc>(
        SavedItem,
        {
            user: userId,
            ...(options.entityType ? { entityType: options.entityType } : {}),
        } as FilterQuery<SavedItemDoc>,
        { sort: { createdAt: -1 }, limit: options.limit ?? 100 },
    );
}

export async function countSavedItemsForUser(userId: string): Promise<number> {
    return countDocs<SavedItemDoc>(SavedItem, { user: userId } as FilterQuery<SavedItemDoc>);
}

export async function findSavedItem(
    userId: string,
    entityType: string,
    entityId: string,
): Promise<SavedItemDoc | null> {
    return findOneLean<SavedItemDoc>(SavedItem, {
        user: userId,
        entityType,
        entityId,
    } as FilterQuery<SavedItemDoc>);
}

export async function createSavedItem(input: {
    user: string;
    entityType: string;
    entityId: string;
    entityName: string;
    entitySlug: string;
    note?: string;
}): Promise<string> {
    await connectToDatabase();
    const created = await SavedItem.create(input);
    return String(created._id);
}

/** Deletes one saved row, scoped to its owner so a stolen id cannot delete another user's data. */
export async function deleteSavedItem(userId: string, id: string): Promise<boolean> {
    await connectToDatabase();
    const result = await SavedItem.deleteOne({ _id: id, user: userId }).exec();
    return result.deletedCount > 0;
}

export async function deleteSavedItemByEntity(
    userId: string,
    entityType: string,
    entityId: string,
): Promise<boolean> {
    await connectToDatabase();
    const result = await SavedItem.deleteOne({
        user: userId,
        entityType,
        entityId,
    }).exec();
    return result.deletedCount > 0;
}

export async function deleteAllSavedItemsForUser(userId: string): Promise<number> {
    await connectToDatabase();
    const result = await SavedItem.deleteMany({ user: userId }).exec();
    return result.deletedCount ?? 0;
}

/* ------------------------------ comparisons ------------------------------ */

export async function findComparisonByShareId(shareId: string): Promise<ComparisonDoc | null> {
    return findOneLean<ComparisonDoc>(Comparison, { shareId });
}

export async function upsertComparison(input: {
    shareId: string;
    user?: string;
    anonymousId?: string;
    colleges: unknown[];
    collegeSlugs: string[];
    title?: string;
}): Promise<void> {
    await connectToDatabase();
    await Comparison.updateOne(
        { shareId: input.shareId },
        {
            $set: {
                user: input.user,
                anonymousId: input.anonymousId,
                colleges: input.colleges,
                collegeSlugs: input.collegeSlugs,
                title: input.title,
            },
            $setOnInsert: { shareId: input.shareId },
        },
        { upsert: true },
    ).exec();
}

export async function incrementComparisonViews(shareId: string): Promise<void> {
    await connectToDatabase();
    await Comparison.updateOne({ shareId }, { $inc: { viewCount: 1 } }).exec();
}

export async function listComparisonsForUser(
    userId: string,
    limit = 20,
): Promise<ComparisonDoc[]> {
    return findLean<ComparisonDoc>(
        Comparison,
        { user: userId } as FilterQuery<ComparisonDoc>,
        { sort: { createdAt: -1 }, limit },
    );
}

/* ----------------------------- notifications ----------------------------- */

export async function paginateNotifications(args: {
    filter: FilterQuery<NotificationDoc>;
    page: number;
    pageSize: number;
}): Promise<Paginated<NotificationDoc>> {
    return paginate<NotificationDoc>(Notification, { ...args, sort: { createdAt: -1 } });
}

export async function notificationStateCounts(): Promise<{ _id: string; count: number }[]> {
    return aggregateLean<{ _id: string; count: number }>(Notification, [
        { $group: { _id: '$state', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
}

export async function listNotificationsForUser(
    userId: string,
    limit = 30,
): Promise<NotificationDoc[]> {
    return findLean<NotificationDoc>(
        Notification,
        { user: userId, channel: 'in_app' } as FilterQuery<NotificationDoc>,
        { sort: { createdAt: -1 }, limit },
    );
}

export async function countUnreadNotifications(userId: string): Promise<number> {
    return countDocs<NotificationDoc>(Notification, {
        user: userId,
        channel: 'in_app',
        readAt: { $exists: false },
    } as FilterQuery<NotificationDoc>);
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
    await connectToDatabase();
    const result = await Notification.updateMany(
        {
            user: userId,
            readAt: { $exists: false },
            ...(ids && ids.length > 0 ? { _id: { $in: ids } } : {}),
        },
        { $set: { readAt: new Date() } },
    ).exec();
    return result.modifiedCount ?? 0;
}

export async function createNotification(input: Record<string, unknown>): Promise<string | null> {
    await connectToDatabase();
    try {
        const created = await Notification.create(input);
        return String(created._id);
    } catch (error) {
        // Duplicate dedupeKey means the same message is already queued — not an error.
        if (error instanceof Error && error.message.includes('E11000')) return null;
        throw error;
    }
}

/**
 * Claims a batch of due notifications for the background worker.
 *
 * Rows are moved to `processing` and their attempt counter incremented before
 * they are handed out, so a second worker run cannot pick up the same message.
 * `attempts` in the returned rows is the persisted (incremented) value, which is
 * what the caller compares against the retry ceiling.
 */
export async function claimDueNotifications(
    limit: number,
    maxAttempts = 4,
): Promise<NotificationDoc[]> {
    await connectToDatabase();
    const due = await Notification.find({
        state: 'queued',
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: maxAttempts },
    })
        .sort({ scheduledFor: 1 })
        .limit(limit)
        .lean<NotificationDoc[]>()
        .exec();

    if (due.length === 0) return [];

    await Notification.updateMany(
        { _id: { $in: due.map((d) => d._id) } },
        { $set: { state: 'processing' }, $inc: { attempts: 1 } },
    ).exec();

    return due.map((row) => ({ ...row, attempts: (row.attempts ?? 0) + 1 }));
}

export async function markNotificationSent(id: unknown): Promise<void> {
    await connectToDatabase();
    await Notification.updateOne(
        { _id: id },
        { $set: { state: 'sent', sentAt: new Date(), lastError: undefined } },
    ).exec();
}

/**
 * Records a delivery failure. `retryAt` re-schedules the row (the worker uses an
 * exponential backoff); without it the row keeps its current schedule.
 */
export async function markNotificationFailed(
    id: unknown,
    message: string | undefined,
    retry: boolean,
    retryAt?: Date,
): Promise<void> {
    await connectToDatabase();
    await Notification.updateOne(
        { _id: id },
        {
            $set: {
                state: retry ? 'queued' : 'failed',
                lastError: message?.slice(0, 1000),
                ...(retryAt ? { scheduledFor: retryAt } : {}),
            },
        },
    ).exec();
}

/**
 * Marks one in-app notification read for its owner.
 * Scoped by user id so a guessed notification id cannot touch another account.
 */
export async function markNotificationReadForUser(
    userId: string,
    notificationId: string,
): Promise<void> {
    await connectToDatabase();
    await Notification.updateOne(
        { _id: notificationId, user: userId },
        { $set: { readAt: new Date() } },
    ).exec();
}

/* -------------------------------- templates ------------------------------- */

export async function findEmailTemplate(key: string): Promise<EmailTemplateDoc | null> {
    return findOneLean<EmailTemplateDoc>(EmailTemplate, { key, status: 'active' });
}

export async function findWhatsAppTemplate(key: string): Promise<WhatsAppTemplateDoc | null> {
    return findOneLean<WhatsAppTemplateDoc>(WhatsAppTemplate, { key, status: 'active' });
}

/* -------------------------------- audit log ------------------------------- */

export async function createAuditLog(input: Record<string, unknown>): Promise<void> {
    await connectToDatabase();
    await AuditLog.create(input);
}

export async function paginateAuditLogs(args: {
    filter: FilterQuery<AuditLogDoc>;
    page: number;
    pageSize: number;
}): Promise<Paginated<AuditLogDoc>> {
    return paginate<AuditLogDoc>(AuditLog, { ...args, sort: { createdAt: -1 } });
}

export async function auditEntityNames(): Promise<string[]> {
    const rows = await distinctLean<AuditLogDoc, string>(AuditLog, 'entity');
    return [...rows].sort();
}

export async function listAuditLogsForEntity(
    entity: string,
    entityId: string,
    limit = 20,
): Promise<AuditLogDoc[]> {
    return findLean<AuditLogDoc>(
        AuditLog,
        { entity, entityId } as FilterQuery<AuditLogDoc>,
        { sort: { createdAt: -1 }, limit },
    );
}

/* ----------------------------- analytics events --------------------------- */

export async function createAnalyticsEvents(rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    await connectToDatabase();
    await AnalyticsEvent.insertMany(rows, { ordered: false });
}

/** Single event write, used by the fire-and-forget tracker. */
export async function createAnalyticsEvent(values: Record<string, unknown>): Promise<void> {
    await connectToDatabase();
    await AnalyticsEvent.create(values);
}

export async function aggregateAnalytics<T>(pipeline: PipelineStage[]): Promise<T[]> {
    return aggregateLean<T>(AnalyticsEvent, pipeline);
}

export async function countAnalyticsEvents(
    filter: FilterQuery<AnalyticsEventDoc> = {},
): Promise<number> {
    return countDocs<AnalyticsEventDoc>(AnalyticsEvent, filter);
}

/* ------------------------------ search queries ---------------------------- */

export async function createSearchQuery(input: Record<string, unknown>): Promise<void> {
    await connectToDatabase();
    await SearchQuery.create(input);
}

export async function listRecentSearchQueries(limit = 20): Promise<SearchQueryDoc[]> {
    return findLean<SearchQueryDoc>(SearchQuery, {}, { sort: { createdAt: -1 }, limit });
}

export async function aggregateSearchQueries<T>(pipeline: PipelineStage[]): Promise<T[]> {
    return aggregateLean<T>(SearchQuery, pipeline);
}

export async function countSearchQueries(
    filter: FilterQuery<SearchQueryDoc> = {},
): Promise<number> {
    return countDocs<SearchQueryDoc>(SearchQuery, filter);
}

/**
 * Active synonym rules that mention a term, either as the canonical term or as
 * one of its synonyms. Drives query expansion and promoted search results.
 */
export async function findSynonymsForTerm(term: string, limit = 5): Promise<SearchSynonymDoc[]> {
    return findLean<SearchSynonymDoc>(
        SearchSynonym,
        { status: 'active', $or: [{ term }, { synonyms: term }] },
        { limit, sort: { displayOrder: 1 } },
    );
}

/**
 * Terms searched most often in a window, excluding ones that found nothing —
 * they are shown as suggestions, so they have to lead somewhere.
 */
export async function listTrendingSearchTerms(
    since: Date,
    limit: number,
): Promise<{ _id: string; count: number }[]> {
    return aggregateSearchQueries<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since }, zeroResults: false } },
        { $group: { _id: '$normalizedTerm', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
    ]);
}

export async function listActiveSynonyms(limit = 200): Promise<SearchSynonymDoc[]> {
    return findLean<SearchSynonymDoc>(
        SearchSynonym,
        { status: 'active' },
        { sort: { term: 1 }, limit },
    );
}

export async function listAllSynonyms(limit = 50): Promise<SearchSynonymDoc[]> {
    return findLean<SearchSynonymDoc>(SearchSynonym, {}, { sort: { term: 1 }, limit });
}

/* ---------------------------- ai conversations ---------------------------- */

export async function findAiConversation(sessionId: string): Promise<AiConversationDoc | null> {
    return findOneLean<AiConversationDoc>(AiConversation, { sessionId });
}

/**
 * Appends a turn to a conversation, creating it on first use.
 * `setOnInsert` carries the identity fields (user / anonymous id / consent) that
 * must only be written when the conversation row is created.
 */
export async function appendAiMessages(
    sessionId: string,
    messages: Record<string, unknown>[],
    meta: Record<string, unknown> = {},
    setOnInsert: Record<string, unknown> = {},
): Promise<void> {
    await connectToDatabase();
    await AiConversation.updateOne(
        { sessionId },
        {
            $push: { messages: { $each: messages } },
            $set: meta,
            $setOnInsert: { sessionId, ...setOnInsert },
        },
        { upsert: true },
    ).exec();
}

/** Flags a conversation as escalated to a counsellor, linking the lead it created. */
export async function markAiConversationHandedOff(
    sessionId: string,
    leadId?: string,
): Promise<void> {
    await connectToDatabase();
    await AiConversation.updateOne(
        { sessionId },
        { $set: { handedOffToCounsellor: true, ...(leadId ? { lead: leadId } : {}) } },
    ).exec();
}

/** Most recently active conversations for the admin transcript list. */
export async function listRecentAiConversations(limit = 25): Promise<AiConversationDoc[]> {
    await connectToDatabase();
    return AiConversation.find({})
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean<AiConversationDoc[]>()
        .exec();
}

/** Total messages across every conversation — the "turns" stat. */
export async function aggregateAiConversationTurns(): Promise<number> {
    const rows = await aggregateLean<{ total: number }>(AiConversation, [
        { $project: { count: { $size: { $ifNull: ['$messages', []] } } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
    ]);
    return rows[0]?.total ?? 0;
}

export async function countAiConversations(
    filter: FilterQuery<AiConversationDoc> = {},
): Promise<number> {
    return countDocs<AiConversationDoc>(AiConversation, filter);
}
