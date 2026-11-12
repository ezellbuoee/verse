import { type FormEvent, type ReactElement, useState } from "react";

import { signIn } from "./accountApi";
import { PasswordField } from "./PasswordField";
import { Logo } from "./Logo";
import "./verse.css";

interface Props {
    readonly onBack: () => void;
    readonly onJoin: () => void;
}

export function SignInPage({ onBack, onJoin }: Props): ReactElement {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!email.trim() || !password) {
            return;
        }
        setError(null);
        setLoading(true);
        try {
            // on success the app switches to the member view by itself
            await signIn(email, password);
        } catch (e) {
            setError((e as Error).message);
            setLoading(false);
        }
    }

    const showError = error !== null && !loading;

    return (
        <div className="verse-sheet">
            <button type="button" className="verse-back" onClick={onBack}>
                ← Back to the poems
            </button>
            <form className="verse-form" onSubmit={handleSubmit} noValidate>
                <Logo size={48} className="verse-sheet-mark" />
                <p className="verse-kicker">Welcome back</p>
                <h1 className="verse-form-title">Sign in</h1>
                {showError && (
                    <p className="verse-form-error" role="alert">
                        {error}
                    </p>
                )}
                <label className="verse-label">
                    Email
                    <input
                        className={`verse-input ${showError ? "is-error" : ""}`}
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        autoFocus
                    />
                </label>
                <PasswordField
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                    error={showError}
                />
                <button type="submit" className="verse-primary" disabled={loading || !email.trim() || !password}>
                    {loading ? "Signing in…" : "Sign in"}
                </button>
                <p className="verse-form-hint">
                    New here?{" "}
                    <button type="button" className="verse-link" onClick={onJoin}>
                        Join Verse
                    </button>
                </p>
            </form>
        </div>
    );
}
