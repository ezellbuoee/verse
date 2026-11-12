import { type ReactElement, useEffect, useState } from "react";

import { PostList } from "./Feed";
import { type FeedPost, type FeedQuery, loadFeed } from "./feedApi";

interface Props {
    readonly query: FeedQuery;
    readonly reloadKey?: number;
    readonly grid?: boolean;
    readonly empty?: string;
    readonly pageSize?: number;
}

/** Posts from the paged feed endpoint with a "Show more" button. Reloads when the query changes. */
export function PagedPosts({
    query,
    reloadKey = 0,
    grid = true,
    empty = "Nothing here yet.",
    pageSize = 24
}: Props): ReactElement {
    const [items, setItems] = useState<FeedPost[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const key = JSON.stringify(query);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setPage(0);
        loadFeed({ ...query, page: 0, size: pageSize })
            .then((p) => {
                if (cancelled) {
                    return;
                }
                setItems(p.items);
                setTotal(p.total);
                setHasMore(p.hasMore);
                setError(null);
            })
            .catch((e: Error) => !cancelled && setError(e.message))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, reloadKey, pageSize]);

    async function more() {
        const next = page + 1;
        setLoading(true);
        try {
            const p = await loadFeed({ ...query, page: next, size: pageSize });
            setItems((prev) => [...prev, ...p.items]);
            setHasMore(p.hasMore);
            setPage(next);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    if (error) {
        return <p className="verse-status verse-status--error">{error}</p>;
    }
    if (!loading && items.length === 0) {
        return <p className="verse-status">{empty}</p>;
    }
    return (
        <>
            <PostList posts={items} grid={grid} />
            <div className="verse-more">
                <span className="verse-form-hint">
                    {items.length} of {total}
                </span>
                {hasMore && (
                    <button type="button" className="verse-secondary" onClick={more} disabled={loading}>
                        {loading ? "Loading…" : "Show more"}
                    </button>
                )}
            </div>
        </>
    );
}
