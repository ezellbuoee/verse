import { type ReactElement, useState } from "react";

interface Props {
    readonly label: ReactElement | string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly autoComplete: "current-password" | "new-password";
    readonly error?: boolean;
    readonly autoFocus?: boolean;
}

/** Password input with a show / hide switch. */
export function PasswordField({ label, value, onChange, autoComplete, error, autoFocus }: Props): ReactElement {
    const [shown, setShown] = useState(false);
    return (
        <label className="verse-label">
            {label}
            <span className="verse-password">
                <input
                    className={`verse-input ${error ? "is-error" : ""}`}
                    type={shown ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    autoFocus={autoFocus}
                    onChange={(e) => onChange(e.currentTarget.value)}
                />
                <button
                    type="button"
                    className="verse-password-toggle"
                    onClick={() => setShown((s) => !s)}
                    aria-pressed={shown}>
                    {shown ? "Hide" : "Show"}
                </button>
            </span>
        </label>
    );
}
