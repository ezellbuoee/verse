import { type ReactElement, useEffect, useState } from "react";

import { PostList } from "./Feed";
import { type DailyData, type FeedPost, loadDaily, MOOD_LABELS, timeAgo } from "./feedApi";
import { PagedPosts } from "./PagedPosts";
import { useSession } from "./session";

/** First lines of a poem for a teaser. */
export function excerpt(post: FeedPost, maxLines = 6, maxChars = 320): string {
    const lines = post.body.split("\n").slice(0, maxLines).join("\n");
    return lines.length > maxChars ? `${lines.slice(0, maxChars).trimEnd()}…` : lines;
}

function Skeleton(): ReactElement {
    return (
        <div className="verse-skeleton" aria-busy="true" aria-label="Loading poems">
            <div className="sk sk-kicker" />
            <div className="sk sk-title" />
            <div className="sk sk-line" />
            <div className="sk sk-line" />
            <div className="sk sk-line short" />
        </div>
    );
}

/** "Sunday, 2 November" from the API's date (UTC day). */
function dayLabel(iso: string): string {
    const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC"
    });
}

/**
 * The front page is the day's selection: the top poem, a quote, the poet and the mood of the day, six pieces
 * chosen for today, what is new, the most loved, the poets, then everything. Same for everyone, new every morning.
 */
export function Home({ reloadKey = 0 }: { reloadKey?: number }): ReactElement {
    const session = useSession();
    const [daily, setDaily] = useState<DailyData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mood, setMood] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadDaily()
            .then((d) => !cancelled && setDaily(d))
            .catch((e: Error) => !cancelled && setError(e.message));
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    if (error) {
        return <p className="verse-status verse-status--error">{error}</p>;
    }
    if (!daily) {
        return <Skeleton />;
    }
    if (daily.totals.posts === 0) {
        return <p className="verse-status">No poems yet. Be the first to write one.</p>;
    }

    const open = (post: FeedPost) => session.setScreen({ kind: "poem", id: post.id, post });
    const top = daily.topPost;
    const poet = daily.authorOfTheDay;
    const moodLabel = daily.moodOfTheDay ? (MOOD_LABELS[daily.moodOfTheDay] ?? daily.moodOfTheDay) : null;

    return (
        <>
            <p className="verse-today" aria-label="Today">
                <span className="verse-today-date">{dayLabel(daily.date)}</span>
                <span className="verse-today-sub">A new selection every morning</span>
            </p>

            {top && (
                <section className="verse-hero" aria-label="Top poem of the day">
                    <article className="verse-hero-poem" onClick={() => open(top)}>
                        <p className="verse-kicker">Top poem · today</p>
                        <h1 className="verse-hero-title">{top.title ?? "Untitled"}</h1>
                        <p className="verse-hero-excerpt">{excerpt(top)}</p>
                        <p className="verse-hero-byline">
                            by <strong>{top.authorName}</strong> · {timeAgo(top.createdAt)} · ♡ {top.likeCount}
                            {" · "}
                            <button type="button" className="verse-readmore" onClick={() => open(top)}>
                                Read the poem →
                            </button>
                        </p>
                    </article>
                    <aside className="verse-hero-side">
                        {daily.quote && (
                            <div>
                                <p className="verse-kicker">Quote of the day</p>
                                <blockquote className="verse-quoteday">
                                    <button
                                        type="button"
                                        className="verse-title-link verse-quote-link"
                                        onClick={() => open(daily.quote as FeedPost)}>
                                        “{daily.quote.body}”
                                    </button>
                                    <span className="verse-quoteday-source">
                                        — {daily.quote.source ?? daily.quote.authorName}
                                    </span>
                                </blockquote>
                            </div>
                        )}
                        {daily.fresh.length > 0 && (
                            <div>
                                <p className="verse-kicker">New on Verse</p>
                                <ul className="verse-newlist">
                                    {daily.fresh.map((p) => (
                                        <li key={p.id}>
                                            <button type="button" onClick={() => open(p)}>
                                                <span className="t">{p.title ?? "Untitled"}</span>
                                                <span className="b">
                                                    {p.authorName} · {timeAgo(p.createdAt)}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </aside>
                </section>
            )}

            {daily.selection.length > 0 && (
                <section className="verse-section" aria-label="Daily selection">
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">
                            Daily Selection
                            {moodLabel && (
                                <span className="verse-section-sub">
                                    {" "}
                                    · in the mood of <em>{moodLabel}</em>
                                </span>
                            )}
                        </h2>
                        {moodLabel && daily.moodOfTheDay && (
                            <button
                                type="button"
                                className="verse-section-more"
                                onClick={() => setMood(daily.moodOfTheDay)}>
                                All {moodLabel} poems →
                            </button>
                        )}
                    </div>
                    {poet && (
                        <button
                            type="button"
                            className="verse-poetday verse-poetday--row"
                            disabled={!poet.id}
                            onClick={() => poet.id && session.openProfile(poet.id)}>
                            <span className="verse-poetday-label">Poet of the day</span>
                            <span className="verse-avatar" aria-hidden="true">
                                {poet.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="verse-poetday-text">
                                <span className="verse-poetday-name">{poet.name}</span>
                                <span className="verse-poetday-sub">
                                    {poet.poems} {poet.poems === 1 ? "poem" : "poems"}
                                    {poet.quotes > 0 && ` · ${poet.quotes} ${poet.quotes === 1 ? "quote" : "quotes"}`}
                                    {poet.classic && " · classic"}
                                </span>
                            </span>
                            <span className="verse-poetday-go" aria-hidden="true">
                                Their page →
                            </span>
                        </button>
                    )}
                    <PostList posts={daily.selection} grid />
                </section>
            )}

            {daily.moods.length > 0 && (
                <section className="verse-section" aria-label="Moods">
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">By mood</h2>
                        {mood && (
                            <button type="button" className="verse-section-more" onClick={() => setMood(null)}>
                                Show all
                            </button>
                        )}
                    </div>
                    <div className="verse-themes">
                        {daily.moods.map(({ mood: m, count }) => (
                            <button
                                type="button"
                                key={m}
                                className={`verse-chip ${mood === m ? "is-on" : ""}`}
                                aria-pressed={mood === m}
                                onClick={() => setMood(mood === m ? null : m)}>
                                {MOOD_LABELS[m] ?? m.toLowerCase()}
                                <small>{count}</small>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {!mood && daily.mostLoved.length > 0 && (
                <section className="verse-section" aria-label="Most loved">
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">Most loved</h2>
                    </div>
                    <div className="verse-grid">
                        {daily.mostLoved.map((p, i) => (
                            <article className="verse-card verse-card--rank" key={p.id}>
                                <span className="verse-rank" aria-hidden="true">
                                    {i + 1}
                                </span>
                                <div>
                                    {p.kind === "QUOTE" ? (
                                        <p className="verse-quote-text" style={{ paddingRight: 0 }}>
                                            <button
                                                type="button"
                                                className="verse-title-link verse-quote-link"
                                                onClick={() => open(p)}>
                                                “{p.body}”
                                            </button>
                                        </p>
                                    ) : (
                                        <>
                                            <h3 className="verse-poem-title" style={{ paddingRight: 0 }}>
                                                <button
                                                    type="button"
                                                    className="verse-title-link"
                                                    onClick={() => open(p)}>
                                                    {p.title ?? "Untitled"}
                                                </button>
                                            </h3>
                                            <p className="verse-poem-body verse-poem-body--clamp">{p.body}</p>
                                        </>
                                    )}
                                    <p className="verse-hero-byline" style={{ marginTop: 8 }}>
                                        <strong>{p.authorName}</strong> · ♡ {p.likeCount} · 💬 {p.commentCount}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {!mood && daily.authors.length > 0 && (
                <section className="verse-section" aria-label="Poets">
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">Poets</h2>
                        <button
                            type="button"
                            className="verse-section-more"
                            onClick={() => session.setScreen({ kind: "poets" })}>
                            All poets →
                        </button>
                    </div>
                    <div className="verse-grid">
                        {daily.authors.map((p) => (
                            <button
                                type="button"
                                className="verse-poet"
                                key={p.name}
                                disabled={!p.id}
                                onClick={() => p.id && session.openProfile(p.id)}>
                                <span className="verse-avatar" aria-hidden="true">
                                    {p.name.trim().charAt(0).toUpperCase()}
                                </span>
                                <span>
                                    <span className="verse-poet-name">{p.name}</span>
                                    <br />
                                    <span className="verse-poet-sub">
                                        {p.poems + p.quotes} {p.poems + p.quotes === 1 ? "post" : "posts"}
                                        {p.classic && " · classic"}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <section className="verse-section" aria-label="All poems and quotes">
                <div className="verse-section-head">
                    <h2 className="verse-section-title">
                        {mood ? `${MOOD_LABELS[mood] ?? mood.toLowerCase()}, latest first` : "Latest"}
                    </h2>
                    <span className="verse-form-hint">{daily.totals.posts} poems and quotes</span>
                </div>
                <PagedPosts query={{ mood: mood ?? undefined }} reloadKey={reloadKey} />
            </section>
        </>
    );
}
