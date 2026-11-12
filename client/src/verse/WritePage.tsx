import { type FormEvent, type ReactElement, useState } from "react";

import { MOOD_LABELS } from "./feedApi";
import { createPost } from "./rpc";
import "./verse.css";

interface Props {
    readonly onCancel: () => void;
    readonly onPublished: () => void;
}

export function WritePage({ onCancel, onPublished }: Props): ReactElement {
    const [kind, setKind] = useState<"POEM" | "QUOTE">("POEM");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [source, setSource] = useState("");
    const [mood, setMood] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await createPost({ kind, title, body, source, mood });
            onPublished();
        } catch (e) {
            setError((e as Error).message);
            setLoading(false);
        }
    }

    const isQuote = kind === "QUOTE";
    return (
        <form className="verse-form verse-write" onSubmit={handleSubmit} noValidate>
            <h1 className="verse-form-title">Write</h1>
            <div className="verse-segmented" role="radiogroup" aria-label="What are you writing?">
                <button
                    type="button"
                    role="radio"
                    aria-checked={!isQuote}
                    className={!isQuote ? "is-on" : ""}
                    onClick={() => setKind("POEM")}>
                    Poem
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={isQuote}
                    className={isQuote ? "is-on" : ""}
                    onClick={() => setKind("QUOTE")}>
                    Quote
                </button>
            </div>
            {error && <p className="verse-form-error">{error}</p>}
            {!isQuote && (
                <label className="verse-label">
                    Title <span className="verse-label-note">optional</span>
                    <input
                        className="verse-input verse-title-input"
                        type="text"
                        maxLength={120}
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.currentTarget.value)}
                    />
                </label>
            )}
            <label className="verse-label">
                {isQuote ? "Quote" : "Poem"}
                <textarea
                    className="verse-input verse-textarea"
                    rows={isQuote ? 4 : 10}
                    maxLength={isQuote ? 300 : 5000}
                    placeholder={
                        isQuote
                            ? "One or two lines that stay with you"
                            : "Line breaks are kept exactly as you type them"
                    }
                    value={body}
                    onChange={(e) => setBody(e.currentTarget.value)}
                    autoFocus
                />
            </label>
            {isQuote && (
                <label className="verse-label">
                    Source <span className="verse-label-note">optional, who said it</span>
                    <input
                        className="verse-input"
                        type="text"
                        maxLength={120}
                        value={source}
                        onChange={(e) => setSource(e.currentTarget.value)}
                    />
                </label>
            )}
            <fieldset className="verse-moods">
                <legend className="verse-label">
                    Mood <span className="verse-label-note">optional</span>
                </legend>
                <div className="verse-mood-row">
                    {Object.entries(MOOD_LABELS).map(([value, label]) => (
                        <button
                            type="button"
                            key={value}
                            className={`verse-mood-pick ${mood === value ? "is-on" : ""}`}
                            aria-pressed={mood === value}
                            onClick={() => setMood(mood === value ? "" : value)}>
                            {label}
                        </button>
                    ))}
                </div>
            </fieldset>
            <div className="verse-form-actions">
                <button type="button" className="verse-secondary" onClick={onCancel} disabled={loading}>
                    Cancel
                </button>
                <button type="submit" className="verse-primary" disabled={loading}>
                    {loading ? "Publishing…" : "Publish"}
                </button>
            </div>
        </form>
    );
}
