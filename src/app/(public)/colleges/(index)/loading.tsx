import { ListPageSkeleton } from '@/components/shared/list-page-skeleton';

/**
 * Loading state for the colleges index.
 *
 * Lives in the `(index)` group so the boundary covers only this page — a
 * `loading.tsx` on the parent segment would also wrap the 404-capable detail
 * route and turn its `notFound()` into a soft 200.
 */
export default function CollegesLoading() {
    return <ListPageSkeleton />;
}
