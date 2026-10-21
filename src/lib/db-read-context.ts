import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

interface ReadState {
    failed: boolean;
    parent?: ReadState;
}

const reads = new AsyncLocalStorage<ReadState>();

/** A handled database failure is still a failure for the persistent data cache. */
export function markReadFailure(): void {
    let state = reads.getStore();
    while (state) {
        state.failed = true;
        state = state.parent;
    }
}

/** Carries the request's graceful fallback out of a rejected cache fill. */
export class UncacheableRead<T> extends Error {
    constructor(public readonly fallback: T) {
        super('Database read failed; this fallback must not be cached.');
        this.name = 'UncacheableRead';
    }
}

export async function withHealthyReads<T>(load: () => Promise<T>): Promise<T> {
    const state: ReadState = { failed: false, parent: reads.getStore() };
    return reads.run(state, async () => {
        const result = await load();
        if (state.failed) throw new UncacheableRead(result);
        return result;
    });
}
