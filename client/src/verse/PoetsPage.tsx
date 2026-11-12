import { type ReactElement, useEffect, useRef, useState } from "react";

import { MOOD_LABELS, loadPoets, type Poet, type PoetKind } from "./feedApi";
import { useSession } from "./session";

const PAGE = 40;

/** Everyone who has published, most active first, with a search bar, Classic / Members filter and paging. */
export function PoetsPage(): ReactElement {
    const session = useSession();
    const [q, setQ] = useState("");
    const [kind, setKind] = useState<PoetKind>("");
    const [poets, setPoets] = useState<Poet[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<{ classic: number; member: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // the two totals shown in the segments never change with the search text
    useEffect(() => {
        let cancelled = false;
        Promise.all([loadPoets(0, 1, "", "classic"), loadPoets(0, 1, "", "member")])
            .then(([c, m]) => !cancelled && setCounts({ classic: c.total, member: m.total }))
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(
            () => {
                setLoading(true);
                loadPoets(0, PAGE, q, kind)
                    .then((p) => {
                        if (cancelled) {
                            return;
                        }
                        setPoets(p.items);
                        setTotal(p.total);
                        setHasMore(p.hasMore);
                        setPage(0);
                    })
                    .catch(() => !cancelled && setPoets([]))
                    .finally(() => !cancelled && setLoading(false));
            },
            q ? 200 : 0
        );
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [q, kind]);

    async function more() {
        const next = page + 1;
        const p = await loadPoets(next, PAGE, q, kind);
        setPoets((prev) => [...prev, ...p.items]);
        setHasMore(p.hasMore);
        setPage(next);
    }

    function clear() {
        setQ("");
        inputRef.current?.focus();
    }

    const needle = q.trim();
    const segments: readonly [PoetKind, string, number | undefined][] = [
        ["", "All", counts ? counts.classic + counts.member : undefined],
        ["classic", "Classic", counts?.classic],
        ["member", "Members", counts?.member]
    ];

    return (
        <section className="verse-poets-page" aria-label="Poets">
            <header className="verse-poets-head">
                <p className="verse-kicker">Who writes here</p>
                <h1 className="verse-poets-title">Poets</h1>
                <p className="verse-poets-sub">
                    {counts
                        ? `${counts.classic} classic ${counts.classic === 1 ? "poet" : "poets"} from the public domain and ${
                              counts.member
                          } ${counts.member === 1 ? "member" : "members"} of Verse.`
                        : "Classic poets from the public domain and the members of Verse."}
                </p>
            </header>

            <div className="verse-poets-toolbar">
                <div className={`verse-searchbar ${needle ? "has-text" : ""}`}>
                    <span className="verse-searchbar-icon" aria-hidden="true">
                        ⌕
                    </span>
                    <input
                        ref={inputRef}
                        type="search"
                        placeholder="Find a poet by name"
                        aria-label="Find a poet by name"
                        autoComplete="off"
                        value={q}
                        onChange={(e) => setQ(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === "Escape" && clear()}
                    />
                    {needle && (
                        <button type="button" className="verse-searchbar-clear" aria-label="Clear" onClick={clear}>
                            ×
                        </button>
                    )}
                </div>
                <div className="verse-segmented" role="radiogroup" aria-label="Which poets">
                    {segments.map(([key, label, n]) => (
                        <button
                            type="button"
                            key={key || "all"}
                            role="radio"
                            aria-checked={kind === key}
                            className={kind === key ? "is-on" : ""}
                            onClick={() => setKind(key)}>
                            {label}
                            {n !== undefined && <small>{n}</small>}
                        </button>
                    ))}
                </div>
            </div>

            <p className="verse-poets-count" aria-live="polite">
                {loading && poets.length === 0
                    ? "Looking…"
                    : needle
                      ? `${total} ${total === 1 ? "poet matches" : "poets match"} “${needle}”`
                      : `${total} ${total === 1 ? "poet" : "poets"}, most active first`}
            </p>

            {!loading && poets.length === 0 && (
                <div className="verse-poets-empty">
                    <span aria-hidden="true">❧</span>
                    <p>No poet by that name yet.</p>
                    <p className="verse-form-hint">
                        {kind ? "Try the other group, or " : "Try a shorter spelling, or "}
                        <button type="button" className="verse-link" onClick={clear}>
                            show everyone
                        </button>
                        .
                    </p>
                </div>
            )}

            <ul className="verse-poets-grid">
                {poets.map((p) => (
                    <li key={p.name}>
                        <button
                            type="button"
                            className={`verse-poetcard ${p.classic ? "verse-poetcard--classic" : ""}`}
                            disabled={!p.id}
                            onClick={() => p.id && session.openProfile(p.id)}>
                            <span className="verse-avatar verse-avatar--lg" aria-hidden="true">
                                {p.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="verse-poetcard-text">
                                <span className="verse-poetcard-name">
                                    <Highlight text={p.name} needle={needle} />
                                </span>
                                <span className="verse-poetcard-meta">
                                    {p.poems > 0 && `${p.poems} ${p.poems === 1 ? "poem" : "poems"}`}
                                    {p.poems > 0 && p.quotes > 0 && " · "}
                                    {p.quotes > 0 && `${p.quotes} ${p.quotes === 1 ? "quote" : "quotes"}`}
                                    {p.likes > 0 && ` · ♡ ${p.likes}`}
                                </span>
                                {p.bio && <span className="verse-poetcard-bio">{shortBio(p.bio, p.classic)}</span>}
                            </span>
                            <span className="verse-poetcard-side">
                                {p.classic && <span className="verse-poetcard-tag">Classic</span>}
                                {p.mood && (
                                    <span className="verse-mood">{MOOD_LABELS[p.mood] ?? p.mood.toLowerCase()}</span>
                                )}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            {hasMore && (
                <div className="verse-more">
                    <button type="button" className="verse-secondary" onClick={more}>
                        Show more
                    </button>
                </div>
            )}
        </section>
    );
}

/** The matched part of a name in accent colour. */
function Highlight({ text, needle }: { readonly text: string; readonly needle: string }): ReactElement {
    if (!needle) {
        return <>{text}</>;
    }
    const at = text.toLowerCase().indexOf(needle.toLowerCase());
    if (at < 0) {
        return <>{text}</>;
    }
    return (
        <>
            {text.slice(0, at)}
            <mark>{text.slice(at, at + needle.length)}</mark>
            {text.slice(at + needle.length)}
        </>
    );
}

/** Classic bios are source notes ("Name (1830–1886). Edition…"): keep the life dates and the edition title only. */
function shortBio(bio: string, classic: boolean): string {
    let s = bio.replace(/\s+/g, " ").trim();
    if (classic) {
        s = s.replace(/\s*\(Project Gutenberg #\d+\)\.?/, "").replace(/\s*Public domain\.?$/, "");
        const dates = s.match(/^[^(]*\(([^)]*)\)\.\s*(.*)$/);
        if (dates) {
            s = `${dates[1]} · ${dates[2]}`;
        }
    }
    return s.length > 110 ? `${s.slice(0, 110).trimEnd()}…` : s;
}
