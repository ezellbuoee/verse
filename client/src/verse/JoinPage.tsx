import { type FormEvent, type ReactElement, useState } from "react";

import { signIn, signup } from "./accountApi";
import { Checkbox } from "./Checkbox";
import { PasswordField } from "./PasswordField";
import { Logo } from "./Logo";
import "./verse.css";

interface Props {
    readonly onBack: () => void;
    readonly onSignIn: () => void;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function JoinPage({ onBack, onSignIn }: Props): ReactElement {
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [over18, setOver18] = useState(false);
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const problems = {
        email: EMAIL.test(email.trim()) ? null : "Please enter a valid email address.",
        displayName: displayName.trim().length >= 2 && displayName.trim().length <= 40 ? null : "2 to 40 characters.",
        password: password.length >= 8 ? null : "At least 8 characters.",
        over18: over18 ? null : "Verse is for people aged 18 and over."
    };
    const firstProblem = problems.email ?? problems.displayName ?? problems.password ?? problems.over18;

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setTouched(true);
        setError(null);
        if (firstProblem) {
            setError(firstProblem);
            return;
        }
        setLoading(true);
        try {
            await signup({ email, displayName, password, over18 });
            await signIn(email, password);
        } catch (e) {
            setError((e as Error).message);
            setLoading(false);
        }
    }

    return (
        <div className="verse-sheet">
            <button type="button" className="verse-back" onClick={onBack}>
                ← Back to the poems
            </button>
            <form className="verse-form" onSubmit={handleSubmit} noValidate>
                <Logo size={48} className="verse-sheet-mark" />
                <p className="verse-kicker">Welcome</p>
                <h1 className="verse-form-title">Join Verse</h1>
                <p className="verse-form-hint">Free. Post poems and quotes, like, comment and chat with other poets.</p>
                {error && (
                    <p className="verse-form-error" role="alert">
                        {error}
                    </p>
                )}
                <label className="verse-label">
                    Email
                    <input
                        className={`verse-input ${touched && problems.email ? "is-error" : ""}`}
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        autoFocus
                    />
                </label>
                <label className="verse-label">
                    Display name <span className="verse-label-note">shown on your poems</span>
                    <input
                        className={`verse-input ${touched && problems.displayName ? "is-error" : ""}`}
                        type="text"
                        autoComplete="nickname"
                        maxLength={40}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.currentTarget.value)}
                    />
                </label>
                <PasswordField
                    label={
                        <>
                            Password <span className="verse-label-note">at least 8 characters</span>
                        </>
                    }
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    error={touched && Boolean(problems.password)}
                />
                <Checkbox checked={over18} onChange={setOver18}>
                    I confirm that I am 18 or older.
                </Checkbox>
                <button type="submit" className="verse-primary" disabled={loading}>
                    {loading ? "Creating your account…" : "Join Verse"}
                </button>
                <p className="verse-form-hint">
                    Already a member?{" "}
                    <button type="button" className="verse-link" onClick={onSignIn}>
                        Sign in
                    </button>
                </p>
            </form>
        </div>
    );
}
