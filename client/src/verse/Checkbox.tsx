import type { ReactElement, ReactNode } from "react";

interface Props {
    readonly checked: boolean;
    readonly onChange: (checked: boolean) => void;
    readonly children: ReactNode;
    readonly id?: string;
}

/** A checkbox that always shows its state, styled like the rest of the forms. */
export function Checkbox({ checked, onChange, children, id }: Props): ReactElement {
    return (
        <label className="verse-check">
            <input
                id={id}
                type="checkbox"
                className="verse-check-input"
                checked={checked}
                onChange={(e) => onChange(e.currentTarget.checked)}
            />
            <span className="verse-check-box" aria-hidden="true">
                {checked && (
                    <svg viewBox="0 0 16 16" width="14" height="14">
                        <path
                            d="M3 8.5l3 3 7-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </span>
            <span className="verse-check-text">{children}</span>
        </label>
    );
}
