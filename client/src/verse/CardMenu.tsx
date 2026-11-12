import { type ReactElement, useEffect, useRef, useState } from "react";

import type { FeedPost } from "./feedApi";
import { removePost, reportPost } from "./rpc";
import { useSession } from "./session";
import { ShareSheet } from "./ShareSheet";

interface Props {
    readonly post: FeedPost;
    readonly onRemoved: (postId: string) => void;
}

/** The three dots on a card: Report (members), Remove (the author or an admin). */
export function CardMenu({ post, onRemoved }: Props): ReactElement {
    const session = useSession();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"none" | "report" | "remove">("none");
    const [sharing, setSharing] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open && mode === "none" && !note) {
            return undefined;
        }
        function onDown(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
                setNote(null);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                setMode("none");
                setNote(null);
            }
        }
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, mode, note]);

    const isOwn = session.me?.id === post.authorId;
    const canRemove = session.signedIn && (isOwn || session.me?.admin === true);
    const canReport = !isOwn;

    function start(next: "report" | "remove") {
        setOpen(false);
        setNote(null);
        if (!session.signedIn) {
            session.onNeedSignIn();
            return;
        }
        setMode(next);
    }

    async function confirm() {
        setBusy(true);
        setNote(null);
        try {
            if (mode === "report") {
                await reportPost(post.id, reason);
                setNote("Thank you. Ezekiel will take a look.");
                setReason("");
            } else if (mode === "remove") {
                await removePost(post.id);
                onRemoved(post.id);
            }
            setMode("none");
        } catch (e) {
            setNote((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="verse-cardmenu" ref={rootRef}>
            <button
                type="button"
                className="verse-dots"
                aria-label="More"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}>
                ⋯
            </button>
            {open && (
                <div className="verse-menu" role="menu">
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            setSharing(true);
                        }}>
                        Share as picture
                    </button>
                    {canReport && (
                        <button type="button" role="menuitem" onClick={() => start("report")}>
                            Report
                        </button>
                    )}
                    {canRemove && (
                        <button
                            type="button"
                            role="menuitem"
                            className="verse-menu-danger"
                            onClick={() => start("remove")}>
                            Remove
                        </button>
                    )}
                </div>
            )}
            {mode === "report" && (
                <div className="verse-confirm">
                    <p>Report this post?</p>
                    <input
                        className="verse-input verse-comment-input"
                        type="text"
                        maxLength={500}
                        placeholder="Why? (optional)"
                        value={reason}
                        onChange={(e) => setReason(e.currentTarget.value)}
                    />
                    <div className="verse-confirm-actions">
                        <button
                            type="button"
                            className="verse-secondary verse-primary--small"
                            onClick={() => setMode("none")}
                            disabled={busy}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="verse-primary verse-primary--small"
                            onClick={confirm}
                            disabled={busy}>
                            Report
                        </button>
                    </div>
                </div>
            )}
            {mode === "remove" && (
                <div className="verse-confirm">
                    <p>Remove this post? Its likes and comments go with it. This cannot be undone.</p>
                    <div className="verse-confirm-actions">
                        <button
                            type="button"
                            className="verse-secondary verse-primary--small"
                            onClick={() => setMode("none")}
                            disabled={busy}>
                            Keep it
                        </button>
                        <button
                            type="button"
                            className="verse-primary verse-primary--small verse-danger"
                            onClick={confirm}
                            disabled={busy}>
                            Remove
                        </button>
                    </div>
                </div>
            )}
            {note && <p className="verse-note">{note}</p>}
            {sharing && <ShareSheet post={post} onClose={() => setSharing(false)} />}
        </div>
    );
}
