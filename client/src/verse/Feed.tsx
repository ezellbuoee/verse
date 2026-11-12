import { type ReactElement, useEffect, useState } from "react";

import { CardMenu } from "./CardMenu";
import { Comments } from "./Comments";
import { type FeedPost, MOOD_LABELS, timeAgo } from "./feedApi";
import { myLikes, toggleLike } from "./rpc";
import { useSession } from "./session";
import "./verse.css";

interface CardProps {
    readonly post: FeedPost;
    readonly liked: boolean;
    readonly onToggleLike: (post: FeedPost) => void;
    readonly onRemoved: (postId: string) => void;
    /** Show the whole poem (poem page) instead of the first lines. */
    readonly full?: boolean;
}

const CLAMP_LINES = 8;

export function PostCard({ post, liked, onToggleLike, onRemoved, full = false }: CardProps): ReactElement {
    const session = useSession();
    const isQuote = post.kind === "QUOTE";
    const [open, setOpen] = useState(full);
    const [commentCount, setCommentCount] = useState(post.commentCount);
    const isLong = post.body.split("\n").length > CLAMP_LINES || post.body.length > 600;
    const author = post.authorId ? (
        <button
            type="button"
            className="verse-author verse-author--link"
            onClick={() => session.openProfile(post.authorId as string)}>
            {post.authorName}
        </button>
    ) : (
        <span className="verse-author">{post.authorName}</span>
    );
    return (
        <article className={`verse-card ${isQuote ? "verse-card--quote" : "verse-card--poem"}`}>
            <CardMenu post={post} onRemoved={onRemoved} />
            {isQuote ? (
                <blockquote className="verse-quote">
                    {full ? (
                        <p className="verse-quote-text">“{post.body}”</p>
                    ) : (
                        <p className="verse-quote-text">
                            <button
                                type="button"
                                className="verse-title-link verse-quote-link"
                                aria-label="Open this quote"
                                onClick={() => session.setScreen({ kind: "poem", id: post.id, post })}>
                                “{post.body}”
                            </button>
                        </p>
                    )}
                    {post.source && <footer className="verse-quote-source">— {post.source}</footer>}
                </blockquote>
            ) : (
                <>
                    {full ? (
                        <h1 className="verse-article-title">{post.title ?? "Untitled"}</h1>
                    ) : (
                        <h2 className="verse-poem-title">
                            <button
                                type="button"
                                className="verse-title-link"
                                onClick={() => session.setScreen({ kind: "poem", id: post.id, post })}>
                                {post.title ?? "Untitled"}
                            </button>
                        </h2>
                    )}
                    <p className={`verse-poem-body ${!full && isLong ? "verse-poem-body--clamp" : ""}`}>{post.body}</p>
                    {!full && isLong && (
                        <button
                            type="button"
                            className="verse-readmore"
                            onClick={() => session.setScreen({ kind: "poem", id: post.id, post })}>
                            Read the poem →
                        </button>
                    )}
                </>
            )}
            <div className="verse-card-meta">
                {author}
                <span className="verse-dot">·</span>
                <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
                {post.mood && <span className="verse-mood">{MOOD_LABELS[post.mood] ?? post.mood.toLowerCase()}</span>}
                <span className="verse-counts">
                    <button
                        type="button"
                        className={`verse-react ${liked ? "is-liked" : ""}`}
                        aria-pressed={liked}
                        aria-label={liked ? `Unlike, ${post.likeCount} likes` : `Like, ${post.likeCount} likes`}
                        onClick={() => onToggleLike(post)}>
                        <span aria-hidden="true">{liked ? "♥" : "♡"}</span> {post.likeCount}
                    </button>
                    <button
                        type="button"
                        className={`verse-react ${open ? "is-open" : ""}`}
                        aria-expanded={open}
                        aria-label={`${commentCount} comments`}
                        onClick={() => setOpen((o) => !o)}>
                        <span aria-hidden="true">💬</span> {commentCount}
                    </button>
                </span>
            </div>
            {open && (
                <Comments
                    postId={post.id}
                    signedIn={session.signedIn}
                    onNeedSignIn={session.onNeedSignIn}
                    onCountChange={setCommentCount}
                />
            )}
        </article>
    );
}

/** A list of cards with working likes. `posts` undefined = load the public feed. */
interface ListProps {
    readonly posts: FeedPost[];
    /** Two columns on wide screens. */
    readonly grid?: boolean;
    /** Single post, shown in full. */
    readonly full?: boolean;
}

/** Likes of the signed-in member, with optimistic counts after a toggle. Shared by the feed and the poem page. */
export function useLikes(): {
    readonly liked: ReadonlySet<string>;
    readonly overrides: Record<string, number>;
    readonly error: string | null;
    readonly toggle: (post: FeedPost) => Promise<void>;
} {
    const session = useSession();
    const [liked, setLiked] = useState<ReadonlySet<string>>(new Set());
    const [overrides, setOverrides] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (session.signedIn) {
            myLikes()
                .then((ids) => !cancelled && setLiked(new Set(ids)))
                .catch(() => undefined);
        } else {
            setLiked(new Set());
        }
        return () => {
            cancelled = true;
        };
    }, [session.signedIn]);

    async function toggle(post: FeedPost) {
        if (!session.signedIn) {
            session.onNeedSignIn();
            return;
        }
        try {
            const result = await toggleLike(post.id);
            setLiked((prev) => {
                const next = new Set(prev);
                if (result.liked) {
                    next.add(post.id);
                } else {
                    next.delete(post.id);
                }
                return next;
            });
            setOverrides((prev) => ({ ...prev, [post.id]: result.likeCount }));
        } catch (e) {
            setError((e as Error).message);
        }
    }

    return { liked, overrides, error, toggle };
}

export function PostList({ posts, grid = false, full = false }: ListProps): ReactElement {
    const { liked, overrides, error, toggle: handleToggleLike } = useLikes();
    const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

    if (error) {
        return <p className="verse-status verse-status--error">{error}</p>;
    }
    if (posts === null) {
        return <p className="verse-status">Loading poems…</p>;
    }
    if (posts.length === 0) {
        return <p className="verse-status">No poems yet. Be the first to write one.</p>;
    }
    return (
        <div className={grid ? "verse-grid" : "verse-feed"}>
            {posts
                .filter((post) => !removed.has(post.id))
                .map((post) => (
                    <PostCard
                        key={post.id}
                        post={
                            overrides[post.id] === undefined
                                ? post
                                : { ...post, likeCount: overrides[post.id] as number }
                        }
                        liked={liked.has(post.id)}
                        onToggleLike={handleToggleLike}
                        onRemoved={(id) => setRemoved((prev) => new Set(prev).add(id))}
                        full={full}
                    />
                ))}
        </div>
    );
}
