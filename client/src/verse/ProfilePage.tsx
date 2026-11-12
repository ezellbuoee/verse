import { type ReactElement, useEffect, useState } from "react";

import { MOOD_LABELS, loadProfile, type Profile } from "./feedApi";
import { PagedPosts } from "./PagedPosts";
import { useSession } from "./session";

interface Props {
    readonly memberId: string;
    readonly onBack: () => void;
}

type Filter = "all" | "POEM" | "QUOTE";

/** A poet's page: who they are, what they wrote, and the way to chat with them. */
export function ProfilePage({ memberId, onBack }: Props): ReactElement {
    const session = useSession();
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [mood, setMood] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setProfile(undefined);
        setFilter("all");
        setMood(null);
        loadProfile(memberId)
            .then((p) => !cancelled && setProfile(p))
            .catch((e: Error) => !cancelled && setError(e.message));
        return () => {
            cancelled = true;
        };
    }, [memberId]);

    const isMe = session.me?.id === memberId;

    function chat() {
        if (!session.signedIn) {
            session.onNeedSignIn();
            return;
        }
        session.openChat(memberId);
    }

    return (
        <div className="verse-poet-page">
            <button type="button" className="verse-back" onClick={onBack}>
                ← Poets
            </button>
            {error && <p className="verse-status verse-status--error">{error}</p>}
            {profile === undefined && !error && <p className="verse-status">Loading…</p>}
            {profile === null && <p className="verse-status">This member no longer exists.</p>}
            {profile && (
                <>
                    <header className={`verse-poet-hero ${profile.classic ? "verse-poet-hero--classic" : ""}`}>
                        <div className="verse-poet-hero-band" aria-hidden="true">
                            <span className="verse-poet-hero-glyph">❦</span>
                        </div>
                        <div className="verse-poet-hero-main">
                            <div className="verse-avatar verse-avatar--xl" aria-hidden="true">
                                {profile.displayName.trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="verse-poet-hero-text">
                                <p className="verse-kicker">
                                    {profile.classic ? "Classic poet · public domain" : "Poet"}
                                    {profile.since && (
                                        <span className="verse-kicker-soft">
                                            {" "}
                                            · {sinceLabel(profile.since, profile.classic)}
                                        </span>
                                    )}
                                </p>
                                <h1 className="verse-poet-hero-name">{profile.displayName}</h1>
                                {profile.bio ? (
                                    <p className="verse-poet-bio">{profile.bio}</p>
                                ) : (
                                    isMe && (
                                        <p className="verse-form-hint">
                                            Add a bio under My account so readers know who you are.
                                        </p>
                                    )
                                )}
                            </div>
                            <div className="verse-poet-hero-actions">
                                {isMe ? (
                                    <button
                                        type="button"
                                        className="verse-secondary verse-primary--small"
                                        onClick={() => session.openAccount?.()}>
                                        Edit profile
                                    </button>
                                ) : (
                                    !profile.classic && (
                                        <button
                                            type="button"
                                            className="verse-primary verse-primary--small"
                                            onClick={chat}>
                                            <span aria-hidden="true">💬</span> Chat
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                        <dl className="verse-stats verse-stats--row">
                            <div>
                                <dt>Poems</dt>
                                <dd>{profile.poems}</dd>
                            </div>
                            <div>
                                <dt>Quotes</dt>
                                <dd>{profile.quotes}</dd>
                            </div>
                            <div>
                                <dt>Hearts</dt>
                                <dd>{profile.likesReceived}</dd>
                            </div>
                            {profile.moods.length > 0 && (
                                <div className="verse-stats-moods">
                                    <dt>Writes about</dt>
                                    <dd>
                                        <span className="verse-themes verse-themes--tight">
                                            {profile.moods.slice(0, 6).map(({ mood: m, count }) => (
                                                <button
                                                    type="button"
                                                    key={m}
                                                    className={`verse-chip verse-chip--small ${mood === m ? "is-on" : ""}`}
                                                    aria-pressed={mood === m}
                                                    onClick={() => setMood(mood === m ? null : m)}>
                                                    {MOOD_LABELS[m] ?? m.toLowerCase()}
                                                    <small>{count}</small>
                                                </button>
                                            ))}
                                        </span>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </header>

                    {profile.mostLoved && (
                        <button
                            type="button"
                            className="verse-mostloved"
                            onClick={() =>
                                session.setScreen({
                                    kind: "poem",
                                    id: (profile.mostLoved as NonNullable<Profile["mostLoved"]>).id,
                                    post: profile.mostLoved as NonNullable<Profile["mostLoved"]>
                                })
                            }>
                            <span className="verse-mostloved-label">
                                <span aria-hidden="true">♥</span> Most loved
                            </span>
                            <span className="verse-mostloved-title">
                                {profile.mostLoved.kind === "QUOTE"
                                    ? `“${profile.mostLoved.body.slice(0, 100)}${
                                          profile.mostLoved.body.length > 100 ? "…" : ""
                                      }”`
                                    : (profile.mostLoved.title ?? "Untitled")}
                            </span>
                            <span className="verse-mostloved-meta">
                                {profile.mostLoved.likeCount} {profile.mostLoved.likeCount === 1 ? "heart" : "hearts"} →
                            </span>
                        </button>
                    )}

                    {profile.total > 0 && (
                        <div className="verse-poet-toolbar">
                            <div className="verse-segmented" role="radiogroup" aria-label="Show">
                                {(
                                    [
                                        ["all", `All ${profile.total}`],
                                        ["POEM", `Poems ${profile.poems}`],
                                        ["QUOTE", `Quotes ${profile.quotes}`]
                                    ] as const
                                ).map(([key, label]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        role="radio"
                                        aria-checked={filter === key}
                                        className={filter === key ? "is-on" : ""}
                                        onClick={() => setFilter(key)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {mood && (
                                <button type="button" className="verse-section-more" onClick={() => setMood(null)}>
                                    Clear mood ×
                                </button>
                            )}
                        </div>
                    )}
                    {profile.total === 0 ? (
                        <p className="verse-status">
                            {isMe
                                ? "You have not published yet. Tap Write when the words come."
                                : "Nothing published yet."}
                        </p>
                    ) : (
                        <PagedPosts
                            query={{
                                author: memberId,
                                kind: filter === "all" ? undefined : filter,
                                mood: mood ?? undefined
                            }}
                            grid
                            empty="Nothing in this mood yet."
                        />
                    )}
                </>
            )}
        </div>
    );
}

/** "since March 2026" for members; classic poets were imported, so say what the archive holds instead. */
function sinceLabel(iso: string, classic: boolean): string {
    if (classic) {
        return "complete works";
    }
    const d = new Date(iso);
    return `since ${d.toLocaleDateString("en", { month: "long", year: "numeric" })}`;
}
