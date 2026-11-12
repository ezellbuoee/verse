import { type ReactElement, useEffect, useState } from "react";

import { CardMenu } from "./CardMenu";
import { Comments } from "./Comments";
import { useLikes } from "./Feed";
import { MOOD_LABELS, hasPage, loadFeed, loadPost, timeAgo, type FeedPost } from "./feedApi";
import { useSession } from "./session";
import { ShareSheet } from "./ShareSheet";

interface Props {
    readonly id: string;
    readonly post?: FeedPost;
    readonly onBack: () => void;
}

/** One poem or quote on its own page: a reading layout, hearts and comments, then more by the poet. */
export function PoemPage({ id, post: given, onBack }: Props): ReactElement {
    const session = useSession();
    const likes = useLikes();
    const [post, setPost] = useState<FeedPost | null | undefined>(given);
    const [more, setMore] = useState<FeedPost[]>([]);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentCount, setCommentCount] = useState(given?.commentCount ?? 0);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (given) {
            setPost(given);
            setCommentCount(given.commentCount);
            return undefined;
        }
        let cancelled = false;
        setPost(undefined);
        loadPost(id)
            .then((p) => {
                if (!cancelled) {
                    setPost(p);
                    setCommentCount(p?.commentCount ?? 0);
                }
            })
            .catch(() => !cancelled && setPost(null));
        return () => {
            cancelled = true;
        };
    }, [id, given]);

    useEffect(() => {
        setCommentsOpen(false);
        setSharing(false);
        window.scrollTo({ top: 0 });
    }, [id]);

    useEffect(() => {
        const authorId = post?.authorId;
        if (!hasPage(authorId)) {
            setMore([]);
            return undefined;
        }
        let cancelled = false;
        loadFeed({ author: authorId, size: 5 })
            .then((p) => !cancelled && setMore(p.items.filter((x) => x.id !== id).slice(0, 4)))
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [post?.authorId, id]);

    if (post === undefined) {
        return (
            <div className="verse-article">
                <BackButton onBack={onBack} />
                <p className="verse-status">Loading…</p>
            </div>
        );
    }
    if (post === null) {
        return (
            <div className="verse-article">
                <BackButton onBack={onBack} />
                <p className="verse-status">This poem is no longer here.</p>
            </div>
        );
    }

    const isQuote = post.kind === "QUOTE";
    const canOpenAuthor = hasPage(post.authorId);
    const liked = likes.liked.has(post.id);
    const likeCount = likes.overrides[post.id] ?? post.likeCount;
    const moodLabel = post.mood ? (MOOD_LABELS[post.mood] ?? post.mood.toLowerCase()) : null;
    const stanzas = post.body.split(/\n\s*\n/);

    return (
        <div className={`verse-article ${isQuote ? "verse-article--quote" : ""}`}>
            <BackButton onBack={onBack} />
            {likes.error && <p className="verse-status verse-status--error">{likes.error}</p>}
            <article className="verse-reading" data-mood={post.mood?.toLowerCase() ?? "none"}>
                <CardMenu post={post} onRemoved={onBack} />
                <header className="verse-reading-head">
                    <p className="verse-kicker">
                        {isQuote ? "Quote" : "Poem"}
                        {moodLabel && <span className="verse-kicker-mood"> · {moodLabel}</span>}
                    </p>
                    {!isQuote && <h1 className="verse-reading-title">{post.title ?? "Untitled"}</h1>}
                    <button
                        type="button"
                        className="verse-byline-author"
                        disabled={!canOpenAuthor}
                        onClick={() => canOpenAuthor && session.openProfile(post.authorId as string)}>
                        <span className="verse-avatar" aria-hidden="true">
                            {post.authorName.trim().charAt(0).toUpperCase()}
                        </span>
                        <span>
                            <span className="verse-byline-name">{post.authorName}</span>
                            <span className="verse-byline-time">
                                <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
                                {canOpenAuthor && " · see their page"}
                            </span>
                        </span>
                    </button>
                </header>

                <div className="verse-ornament" aria-hidden="true">
                    ❧
                </div>

                {isQuote ? (
                    <blockquote className="verse-reading-quote">
                        <p>{post.body}</p>
                        {post.source && <footer>— {post.source}</footer>}
                    </blockquote>
                ) : (
                    <div className="verse-reading-body">
                        {stanzas.map((stanza, i) => (
                            <p key={i} className="verse-stanza">
                                {stanza}
                            </p>
                        ))}
                        {post.source && <p className="verse-reading-source">{post.source}</p>}
                    </div>
                )}

                <footer className="verse-reading-actions">
                    <button
                        type="button"
                        className={`verse-heart ${liked ? "is-liked" : ""}`}
                        aria-pressed={liked}
                        aria-label={liked ? `Unlike, ${likeCount} hearts` : `Give a heart, ${likeCount} hearts`}
                        onClick={() => likes.toggle(post)}>
                        <span className="verse-heart-icon" aria-hidden="true">
                            {liked ? "♥" : "♡"}
                        </span>
                        <span>
                            {likeCount} {likeCount === 1 ? "heart" : "hearts"}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={`verse-heart verse-heart--ghost ${commentsOpen ? "is-open" : ""}`}
                        aria-expanded={commentsOpen}
                        onClick={() => setCommentsOpen((o) => !o)}>
                        <span aria-hidden="true">💬</span>
                        <span>
                            {commentCount} {commentCount === 1 ? "comment" : "comments"}
                        </span>
                    </button>
                    <button type="button" className="verse-heart verse-heart--ghost" onClick={() => setSharing(true)}>
                        <span aria-hidden="true">⤴</span>
                        <span>Share</span>
                    </button>
                </footer>

                {commentsOpen && (
                    <div className="verse-reading-comments">
                        <Comments
                            postId={post.id}
                            signedIn={session.signedIn}
                            onNeedSignIn={session.onNeedSignIn}
                            onCountChange={setCommentCount}
                        />
                    </div>
                )}
            </article>
            {sharing && <ShareSheet post={post} onClose={() => setSharing(false)} />}

            {more.length > 0 && (
                <section className="verse-section verse-more-by" aria-label={`More by ${post.authorName}`}>
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">More by {post.authorName}</h2>
                        {canOpenAuthor && (
                            <button
                                type="button"
                                className="verse-section-more"
                                onClick={() => session.openProfile(post.authorId as string)}>
                                Their page →
                            </button>
                        )}
                    </div>
                    <ul className="verse-morelist">
                        {more.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => session.setScreen({ kind: "poem", id: p.id, post: p })}>
                                    <span className="verse-morelist-kind" aria-hidden="true">
                                        {p.kind === "QUOTE" ? "”" : "¶"}
                                    </span>
                                    <span className="verse-morelist-text">
                                        <span className="t">
                                            {p.kind === "QUOTE"
                                                ? `“${p.body.slice(0, 90)}${p.body.length > 90 ? "…" : ""}”`
                                                : (p.title ?? "Untitled")}
                                        </span>
                                        <span className="b">
                                            {p.kind === "QUOTE" ? "Quote" : firstLine(p.body)}
                                            {" · "}♡ {p.likeCount}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

function BackButton({ onBack }: { readonly onBack: () => void }): ReactElement {
    return (
        <button type="button" className="verse-back" onClick={onBack}>
            ← Back
        </button>
    );
}

function firstLine(body: string): string {
    const line = body.split("\n").find((l) => l.trim().length > 0) ?? "";
    return line.length > 70 ? `${line.slice(0, 70)}…` : line;
}
