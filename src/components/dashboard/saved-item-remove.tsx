'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { removeSavedItemAction } from '@/actions/saved.actions';

export function SavedItemRemoveButton({ id }: { id: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    return (
        <button
            type="button"
            aria-label="Remove from saved items"
            disabled={pending}
            onClick={() =>
                startTransition(async () => {
                    await removeSavedItemAction(id);
                    router.refresh();
                })
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-line text-ink-soft transition-colors hover:border-red-alert/40 hover:text-red-alert disabled:opacity-50"
        >
            {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
            )}
        </button>
    );
}
