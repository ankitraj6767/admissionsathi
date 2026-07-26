/** Shared, framework-agnostic types used by services, actions and UI. */

export interface Paginated<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export type FieldErrors = Record<string, string[]>;

export type ActionResult<TData = undefined> =
    | { ok: true; data: TData; message?: string }
    | { ok: false; error: string; fieldErrors?: FieldErrors; code?: ActionErrorCode };

export type ActionErrorCode =
    | 'VALIDATION'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'DUPLICATE'
    | 'STALE'
    | 'INTERNAL';

export interface SelectOption {
    label: string;
    value: string;
    group?: string;
    disabled?: boolean;
    meta?: Record<string, string | number | boolean | undefined>;
}

export interface StatCard {
    label: string;
    value: string;
    raw?: number;
    icon?: string;
    tone?: string;
    note?: string;
}

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface SortOption {
    label: string;
    value: string;
}

export interface ListingQuery {
    q?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
}
