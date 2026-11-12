import { type ReactElement, useEffect, useState } from "react";

import { timeAgo } from "./feedApi";
import { changeMember, listMembers, type MemberAdmin } from "./rpc";
import { useSession } from "./session";

/** Admin: every member with role and status; make someone an admin, or suspend an account. */
export function MembersView(): ReactElement {
    const session = useSession();
    const [q, setQ] = useState("");
    const [members, setMembers] = useState<MemberAdmin[] | null>(null);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            listMembers(q.trim())
                .then((page) => {
                    if (!cancelled) {
                        setMembers(page.items);
                        setTotal(page.total);
                    }
                })
                .catch((e: Error) => !cancelled && setError(e.message));
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [q]);

    async function change(member: MemberAdmin, update: Parameters<typeof changeMember>[1]) {
        setBusy(member.id);
        setError(null);
        try {
            const saved = await changeMember(member.id, update);
            setMembers((list) => list?.map((m) => (m.id === saved.id ? saved : m)) ?? null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="verse-view">
            <div className="verse-chats">
                <h1 className="verse-form-title">Members</h1>
                <label className="verse-label">
                    Find a member
                    <input
                        className="verse-input"
                        type="search"
                        placeholder="Part of the email or name"
                        value={q}
                        onChange={(e) => setQ(e.currentTarget.value)}
                    />
                </label>
                {error && <p className="verse-status verse-status--error">{error}</p>}
                {members === null && !error && <p className="verse-status">Loading…</p>}
                {members && members.length === 0 && <p className="verse-status">No member matches.</p>}
                {members && total > members.length && (
                    <p className="verse-form-hint">
                        Showing the newest {members.length} of {total}. Search to find someone else.
                    </p>
                )}
                {members?.map((m) => {
                    const self = m.id === session.me?.id;
                    const suspended = m.status === "SUSPENDED";
                    return (
                        <section className="verse-card verse-member-row" key={m.id}>
                            <div className="verse-chat-row-text">
                                <span className="verse-chat-row-name">
                                    {m.displayName}
                                    {m.role === "admin" && <span className="verse-chip verse-chip--small">admin</span>}
                                    {suspended && <span className="verse-chip verse-chip--small">suspended</span>}
                                </span>
                                <span className="verse-chat-row-last">
                                    {m.email} · joined {timeAgo(m.since)}
                                </span>
                            </div>
                            <div className="verse-confirm-actions">
                                <button
                                    type="button"
                                    className="verse-secondary verse-primary--small"
                                    disabled={busy === m.id || self}
                                    title={self ? "You cannot change your own role" : undefined}
                                    onClick={() => change(m, { role: m.role === "admin" ? "user" : "admin" })}>
                                    {m.role === "admin" ? "Remove admin" : "Make admin"}
                                </button>
                                <button
                                    type="button"
                                    className={`verse-primary verse-primary--small ${suspended ? "" : "verse-danger"}`}
                                    disabled={busy === m.id || self}
                                    title={self ? "You cannot suspend yourself" : undefined}
                                    onClick={() => change(m, { status: suspended ? "ACTIVE" : "SUSPENDED" })}>
                                    {suspended ? "Reactivate" : "Suspend"}
                                </button>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
