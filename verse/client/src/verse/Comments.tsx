import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import { type FeedComment, loadComments, timeAgo } from "./feedApi";
import { addComment } from "./rpc";

interface Props {
    readonly postId: string;
    readonly signedIn: boolean;
    readonly onNeedSignIn: () => void;
    readonly onCountChange: (count: number) => void;
}

/** Comments under a card: visible to everyone, writable by members. */
export function Comments({ postId, signedIn, onNeedSignIn, onCountChange }: Props): ReactElement {
    const [comments, setComments] = useState<FeedComment[] | null>(null);
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let cancelled = false;
        loadComments(postId)
            .then((list) => !cancelled && setComments(list))
            .catch((e: Error) => !cancelled && setError(e.message));
        return () => {
            cancelled = true;
        };
    }, [postId]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!signedIn) {
            onNeedSignIn();
            return;
        }
        setError(null);
        setSending(true);
        try {
            const created = await addComment(postId, text);
            const next = [...(comments ?? []), created];
            setComments(next);
            setText("");
            onCountChange(next.length);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="verse-comments">
            {comments === null && !error && <p className="verse-comments-status">Loading comments…</p>}
            {comments && comments.length === 0 && (
                <p className="verse-comments-status">No comments yet. Say something kind.</p>
            )}
            {comments?.map((c) => (
                <div className="verse-comment" key={c.id}>
                    <div className="verse-comment-meta">
                        <span className="verse-author">{c.authorName}</span>
                        <span className="verse-dot">·</span>
                        <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                    </div>
                    <p className="verse-comment-body">{c.body}</p>
                </div>
            ))}
            {error && <p className="verse-form-error">{error}</p>}
            <form className="verse-comment-form" onSubmit={handleSubmit}>
                <input
                    className="verse-input verse-comment-input"
                    type="text"
                    maxLength={1000}
                    placeholder={signedIn ? "Write a comment" : "Sign in to comment"}
                    value={text}
                    onFocus={() => !signedIn && onNeedSignIn()}
                    onChange={(e) => setText(e.currentTarget.value)}
                    disabled={sending}
                />
                <button
                    type="submit"
                    className="verse-primary verse-primary--small"
                    disabled={sending || (signedIn && !text.trim())}>
                    Send
                </button>
            </form>
        </div>
    );
}
