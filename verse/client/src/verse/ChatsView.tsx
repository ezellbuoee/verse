import { type ReactElement, useEffect, useState } from "react";

import { ChatPage } from "./ChatPage";
import { timeAgo } from "./feedApi";
import { type ConversationSummary, loadChats } from "./rpc";
import { navigateTo } from "./router";
import { useSession } from "./session";

const POLL_MS = 5000;

/** The Chats tab: your conversations, newest first, with unread counts. */
export function ChatsView(): ReactElement {
    const session = useSession();
    const [chats, setChats] = useState<ConversationSummary[] | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            return undefined;
        }
        let cancelled = false;
        async function refresh() {
            try {
                const r = await loadChats();
                if (!cancelled) {
                    setChats(r.conversations);
                }
            } catch (e) {
                if (!cancelled) {
                    setError((e as Error).message);
                }
            }
        }
        void refresh();
        const timer = setInterval(() => void refresh(), POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [open]);

    // a chat opened from a profile lands here through the session
    useEffect(() => {
        if (session.pendingChat) {
            setOpen(session.pendingChat);
            session.clearPendingChat?.();
        }
    }, [session]);

    useEffect(() => {
        navigateTo({ kind: "chats", otherId: open ?? undefined });
    }, [open]);

    if (open) {
        return (
            <div className="verse-view">
                <ChatPage otherId={open} onBack={() => setOpen(null)} />
            </div>
        );
    }
    return (
        <div className="verse-view">
            <div className="verse-chats">
                <h1 className="verse-form-title">Chats</h1>
                {error && <p className="verse-status verse-status--error">{error}</p>}
                {chats === null && !error && <p className="verse-status">Loading…</p>}
                {chats && chats.length === 0 && (
                    <p className="verse-status">
                        No chats yet. Tap a poet&rsquo;s name in the feed, then &ldquo;Chat&rdquo;.
                    </p>
                )}
                {chats?.map((c) => (
                    <button type="button" key={c.otherId} className="verse-chat-row" onClick={() => setOpen(c.otherId)}>
                        <span className="verse-avatar" aria-hidden="true">
                            {c.otherName.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="verse-chat-row-text">
                            <span className="verse-chat-row-name">{c.otherName}</span>
                            <span className="verse-chat-row-last">{c.lastBody}</span>
                        </span>
                        <span className="verse-chat-row-side">
                            <time dateTime={c.lastAt}>{timeAgo(c.lastAt)}</time>
                            {c.unread > 0 && <span className="verse-badge">{c.unread}</span>}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
