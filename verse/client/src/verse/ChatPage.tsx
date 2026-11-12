import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";

import { timeAgo } from "./feedApi";
import { type ChatMessage, loadConversation, sendMessage } from "./rpc";
import { useSession } from "./session";

const POLL_MS = 3000;

interface Props {
    readonly otherId: string;
    readonly onBack: () => void;
}

/** One conversation. New messages show up within about three seconds. */
export function ChatPage({ otherId, onBack }: Props): ReactElement {
    const session = useSession();
    const [otherName, setOtherName] = useState("…");
    const [messages, setMessages] = useState<ChatMessage[] | null>(null);
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        async function refresh() {
            try {
                const c = await loadConversation(otherId);
                if (cancelled) {
                    return;
                }
                setOtherName(c.otherName);
                setMessages((prev) =>
                    prev && prev.length === c.messages.length && prev.at(-1)?.id === c.messages.at(-1)?.id
                        ? prev
                        : c.messages
                );
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
    }, [otherId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end" });
    }, [messages]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!text.trim()) {
            return;
        }
        setSending(true);
        setError(null);
        try {
            const sent = await sendMessage(otherId, text);
            setMessages((prev) => [...(prev ?? []), sent]);
            setText("");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="verse-chat">
            <header className="verse-chat-head">
                <button type="button" className="verse-back" onClick={onBack}>
                    ← Back
                </button>
                <h1 className="verse-chat-title">{otherName}</h1>
            </header>
            <div className="verse-chat-messages">
                {messages === null && !error && <p className="verse-status">Loading…</p>}
                {messages && messages.length === 0 && <p className="verse-status">Say hello to {otherName}.</p>}
                {messages?.map((m) => {
                    const mine = m.fromId === session.me?.id;
                    return (
                        <div key={m.id} className={`verse-bubble ${mine ? "verse-bubble--mine" : ""}`}>
                            <p className="verse-bubble-text">{m.body}</p>
                            <time className="verse-bubble-time" dateTime={m.createdAt}>
                                {timeAgo(m.createdAt)}
                            </time>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>
            {error && <p className="verse-form-error">{error}</p>}
            <form className="verse-chat-form" onSubmit={handleSubmit}>
                <input
                    className="verse-input verse-comment-input"
                    type="text"
                    maxLength={2000}
                    placeholder={`Message ${otherName}`}
                    value={text}
                    onChange={(e) => setText(e.currentTarget.value)}
                    disabled={sending}
                    autoFocus
                />
                <button type="submit" className="verse-primary verse-primary--small" disabled={sending || !text.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}
