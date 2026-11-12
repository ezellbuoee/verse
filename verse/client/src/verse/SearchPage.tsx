import { type ReactElement, useEffect, useState } from "react";

import { loadPoets, type Poet } from "./feedApi";
import { PagedPosts } from "./PagedPosts";
import { useSession } from "./session";

/** Search across poems, quotes and poets. The query lives in the address (/search?q=...). */
export function SearchPage({ initial }: { initial: string }): ReactElement {
    const session = useSession();
    const [text, setText] = useState(initial);
    const [q, setQ] = useState(initial);
    const [poets, setPoets] = useState<Poet[]>([]);

    useEffect(() => setText(initial), [initial]);
    useEffect(() => {
        const t = setTimeout(() => {
            const next = text.trim();
            setQ(next);
            window.history.replaceState(null, "", next ? `/search?q=${encodeURIComponent(next)}` : "/search");
        }, 250);
        return () => clearTimeout(t);
    }, [text]);
    useEffect(() => {
        if (q.length < 2) {
            setPoets([]);
            return undefined;
        }
        let cancelled = false;
        loadPoets(0, 6, q)
            .then((p) => !cancelled && setPoets(p.items))
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [q]);

    return (
        <div>
            <p className="verse-kicker" style={{ marginTop: 16 }}>
                Search
            </p>
            <input
                className="verse-input verse-search-input verse-search-input--big"
                type="search"
                placeholder="A word, a line, a poet"
                aria-label="Search poems, quotes and poets"
                value={text}
                autoFocus
                onChange={(e) => setText(e.currentTarget.value)}
            />
            {q.length < 2 && <p className="verse-form-hint">Type at least two letters.</p>}
            {q.length >= 2 && poets.length > 0 && (
                <section className="verse-section" style={{ marginTop: 20 }}>
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">Poets</h2>
                    </div>
                    <div className="verse-themes">
                        {poets.map((p) => (
                            <button
                                type="button"
                                key={p.name}
                                className="verse-chip"
                                disabled={!p.id}
                                onClick={() => p.id && session.openProfile(p.id)}>
                                {p.name}
                                <small>{p.poems + p.quotes}</small>
                            </button>
                        ))}
                    </div>
                </section>
            )}
            {q.length >= 2 && (
                <section className="verse-section" style={{ marginTop: 20 }}>
                    <div className="verse-section-head">
                        <h2 className="verse-section-title">Poems and quotes</h2>
                    </div>
                    <PagedPosts query={{ q }} empty="Nothing matches. Try fewer or different words." />
                </section>
            )}
        </div>
    );
}
