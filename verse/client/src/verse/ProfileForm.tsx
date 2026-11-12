import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import { updateProfile } from "./rpc";
import { useSession } from "./session";

/** Display name and bio. */
export function ProfileForm(): ReactElement {
    const session = useSession();
    const [name, setName] = useState(session.me?.name ?? "");
    const [bio, setBio] = useState(session.me?.bio ?? "");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const dirty = name !== (session.me?.name ?? "") || bio !== (session.me?.bio ?? "");

    useEffect(() => {
        if (!saved) {
            return undefined;
        }
        const t = setTimeout(() => setSaved(false), 3500);
        return () => clearTimeout(t);
    }, [saved]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setSaving(true);
        try {
            await updateProfile(name, bio);
            session.refreshMe?.();
            setSaved(true);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="verse-profile-form" onSubmit={handleSubmit} noValidate>
            {error && (
                <p className="verse-form-error" role="alert">
                    {error}
                </p>
            )}
            <label className="verse-label" htmlFor="profile-name">
                Display name
                <input
                    id="profile-name"
                    className="verse-input"
                    value={name}
                    placeholder="How poets will know you"
                    maxLength={40}
                    onChange={(e) => setName(e.currentTarget.value)}
                />
            </label>
            <div className="verse-field">
                <label className="verse-field-label" htmlFor="profile-bio">
                    Bio <span className="verse-label-note">{bio.length}/300</span>
                </label>
                <textarea
                    id="profile-bio"
                    className="verse-input verse-textarea verse-textarea--short"
                    value={bio}
                    placeholder="A line or two about you and what you write"
                    rows={3}
                    onChange={(e) => setBio(e.currentTarget.value.slice(0, 300))}
                />
            </div>
            <div className="verse-form-actions">
                <button type="submit" className="verse-primary" disabled={saving || !dirty}>
                    {saving ? "Saving…" : "Save profile"}
                </button>
            </div>
            {saved && (
                <div className="verse-toast" role="status">
                    Profile saved.
                </div>
            )}
        </form>
    );
}
