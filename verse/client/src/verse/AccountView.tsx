import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import { PasswordField } from "./PasswordField";
import { ProfileForm } from "./ProfileForm";
import { type AccountSummary, accountSummary, deleteAccount } from "./rpc";
import { useSession } from "./session";

/** My account: who I am, and the way to delete everything. */
export function AccountView(): ReactElement {
    const session = useSession();
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        accountSummary()
            .then(setSummary)
            .catch(() => setSummary(null));
    }, []);

    async function handleDelete(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await deleteAccount(password);
            session.signOut?.();
        } catch (e) {
            setError((e as Error).message);
            setBusy(false);
        }
    }

    return (
        <div className="verse-view">
            <div className="verse-form">
                <p className="verse-kicker">Account</p>
                <h1 className="verse-form-title">My account</h1>
                <div className="verse-profile-head" style={{ padding: 0 }}>
                    <span className="verse-avatar" aria-hidden="true">
                        {(session.me?.name ?? "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="verse-profile-text">
                        <strong>{session.me?.name ?? "…"}</strong>
                        <p className="verse-form-hint" style={{ margin: 0 }}>
                            {session.me?.admin ? "Admin" : "Member"}
                        </p>
                    </div>
                    {session.me && (
                        <button
                            type="button"
                            className="verse-secondary verse-primary--small"
                            onClick={() => session.openProfile(session.me?.id ?? "")}>
                            View my page
                        </button>
                    )}
                </div>
                <h2 className="verse-poem-title" style={{ marginTop: 8 }}>
                    Profile
                </h2>
                <ProfileForm key={session.me?.id ?? "loading"} />
                {summary && (
                    <p className="verse-form-hint">
                        You have written {summary.posts} {summary.posts === 1 ? "post" : "posts"}, {summary.comments}{" "}
                        {summary.comments === 1 ? "comment" : "comments"}, given {summary.likes}{" "}
                        {summary.likes === 1 ? "like" : "likes"} and exchanged {summary.messages} chat{" "}
                        {summary.messages === 1 ? "message" : "messages"}.
                    </p>
                )}
                <h2 className="verse-poem-title">Delete my account</h2>
                <p className="verse-form-hint">
                    This removes your account, your poems and quotes, your comments and likes, your chats, and your
                    email address. It cannot be undone.
                </p>
                {!confirming && (
                    <button type="button" className="verse-secondary" onClick={() => setConfirming(true)}>
                        Delete my account…
                    </button>
                )}
                {confirming && (
                    <form className="verse-form" style={{ padding: 0 }} onSubmit={handleDelete} noValidate>
                        {error && <p className="verse-form-error">{error}</p>}
                        <PasswordField
                            label="Type your password to confirm"
                            value={password}
                            onChange={setPassword}
                            autoComplete="current-password"
                            autoFocus
                        />
                        <div className="verse-form-actions">
                            <button
                                type="button"
                                className="verse-secondary"
                                onClick={() => setConfirming(false)}
                                disabled={busy}>
                                Keep my account
                            </button>
                            <button type="submit" className="verse-primary verse-danger" disabled={busy || !password}>
                                {busy ? "Deleting…" : "Delete everything"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
