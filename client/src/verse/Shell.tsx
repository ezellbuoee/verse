import { type PropsWithChildren, type ReactElement, useEffect, useState } from "react";

import { Ambient } from "./Ambient";
import { Logo } from "./Logo";
import { loadChats } from "./rpc";
import { useSession } from "./session";
import { ThemeToggle } from "./ThemeToggle";
import "./verse.css";

export type NavKey = "home" | "poets" | "search" | "write" | "chats" | "account" | "reports" | "members";

interface NavProps {
    /** Which top-level place is active. */
    readonly active: NavKey;
    /** Switches place: the reading screens for everyone, the member tabs when signed in. */
    readonly go: (key: NavKey) => void;
}

const POLL_MS = 10000;

function useUnread(enabled: boolean): number {
    const [unread, setUnread] = useState(0);
    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        let cancelled = false;
        const refresh = () =>
            loadChats()
                .then((r) => !cancelled && setUnread(r.unread))
                .catch(() => undefined);
        void refresh();
        const timer = setInterval(() => void refresh(), POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [enabled]);
    return unread;
}

/** The masthead: wordmark, section links, theme switch, and either Sign in / Join or the member's name. */
export function Masthead({ active, go }: NavProps): ReactElement {
    const session = useSession();
    const unread = useUnread(session.signedIn);
    const admin = session.me?.admin === true;
    const item = (key: NavKey, label: string) => (
        <button type="button" aria-current={active === key ? "page" : undefined} onClick={() => go(key)}>
            {label}
        </button>
    );
    return (
        <div className="verse-masthead-bar">
            <header className="verse-masthead">
                <button type="button" className="verse-wordmark" onClick={() => go("home")} aria-label="Verse, home">
                    <Logo size={34} className="verse-wordmark-mark" />
                    <span>Verse</span>
                </button>
                <nav className="verse-nav" aria-label="Sections">
                    {item("home", "Poems")}
                    {item("poets", "Poets")}
                    {session.signedIn && item("chats", unread > 0 ? `Chats (${unread})` : "Chats")}
                    {admin && item("reports", "Reports")}
                    {admin && item("members", "Members")}
                </nav>
                <div className="verse-masthead-right">
                    <button
                        type="button"
                        className="verse-iconbtn"
                        aria-label="Search"
                        title="Search"
                        onClick={() => session.setScreen({ kind: "search", q: "" })}>
                        <span aria-hidden="true">⌕</span>
                    </button>
                    <ThemeToggle />
                    {session.signedIn ? (
                        <>
                            <button
                                type="button"
                                className="verse-primary verse-primary--small verse-write-btn"
                                onClick={() => go("write")}>
                                ✎ Write
                            </button>
                            <button
                                type="button"
                                className="verse-iconbtn"
                                aria-label={`${session.me?.name ?? "My account"}: my account`}
                                title={session.me?.name ?? "My account"}
                                onClick={() => go("account")}>
                                <span aria-hidden="true">
                                    {(session.me?.name ?? "?").trim().charAt(0).toUpperCase()}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="verse-secondary verse-primary--small"
                                onClick={() => session.signOut?.()}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="verse-secondary verse-primary--small"
                                onClick={() => session.setScreen({ kind: "signin" })}>
                                Sign in
                            </button>
                            <button
                                type="button"
                                className="verse-primary verse-primary--small"
                                onClick={() => session.setScreen({ kind: "join" })}>
                                Join
                            </button>
                        </>
                    )}
                </div>
            </header>
        </div>
    );
}

/** Phone-only bar at the bottom: the four places a person goes most. */
export function BottomNav({ active, go }: NavProps): ReactElement {
    const session = useSession();
    const unread = useUnread(session.signedIn);
    const item = (key: NavKey, icon: string, label: string, badge = 0) => (
        <button type="button" aria-current={active === key ? "page" : undefined} onClick={() => go(key)}>
            {icon ? <span aria-hidden="true">{icon}</span> : <Logo size={22} simple className="verse-bottomnav-mark" />}
            {label}
            {badge > 0 && <span className="verse-badge">{badge}</span>}
        </button>
    );
    return (
        <nav className="verse-bottomnav" aria-label="Main">
            {item("home", "", "Poems")}
            {item("poets", "✍", "Poets")}
            {item("search", "⌕", "Search")}
            {session.signedIn ? item("write", "✎", "Write") : item("write", "✎", "Join")}
            {session.signedIn ? item("chats", "💬", "Chats", unread) : item("account", "☺", "Sign in")}
            {session.signedIn && item("account", "☺", "Me")}
        </nav>
    );
}

export function Footer(): ReactElement {
    const session = useSession();
    return (
        <footer className="verse-footer">
            <span>Verse. Poems and quotes from people like you.</span>
            <button type="button" onClick={() => session.setScreen({ kind: "poets" })}>
                Poets
            </button>
            {!session.signedIn && (
                <button type="button" onClick={() => session.setScreen({ kind: "join" })}>
                    Join, free, 18 and over
                </button>
            )}
        </footer>
    );
}

/** Page skeleton of the visitor app: masthead on top, bottom bar on phones. */
export function Page({ active, go, children }: PropsWithChildren<NavProps>): ReactElement {
    return (
        <div className="verse-page">
            <Ambient />
            <Masthead active={active} go={go} />
            <main className="verse-main">{children}</main>
            <BottomNav active={active} go={go} />
        </div>
    );
}
