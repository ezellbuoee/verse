import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AccountView } from "./AccountView";
import { Ambient } from "./Ambient";
import { signOut } from "./auth";
import { ChatsView } from "./ChatsView";
import { FeedView } from "./FeedView";
import { MembersView } from "./MembersView";
import { ReportsView } from "./ReportsView";
import { currentRoute, isScreen, navigateTo, type Route } from "./router";
import { type Me, whoAmI } from "./rpc";
import { type Screen, type Session, SessionContext } from "./session";
import { BottomNav, Masthead, type NavKey } from "./Shell";

const ROUTE_OF: Record<NavKey, Route> = {
    home: { kind: "home" },
    poets: { kind: "poets" },
    search: { kind: "search", q: "" },
    write: { kind: "write" },
    chats: { kind: "chats" },
    account: { kind: "account" },
    reports: { kind: "reports" },
    members: { kind: "members" }
};

/** /signin and /join have done their job once signed in: they become the front page. */
function normalize(route: Route): Route {
    return route.kind === "signin" || route.kind === "join" ? { kind: "home" } : route;
}

/** The signed-in app: who am I, where am I (and the address bar), and the member places around the reading side. */
export function MemberApp(): ReactElement {
    const [me, setMe] = useState<Me | null>(null);
    const [route, setRoute] = useState<Route>(() => normalize(currentRoute()));
    const [lastScreen, setLastScreen] = useState<Screen>(() => {
        const r = normalize(currentRoute());
        return isScreen(r) ? r : { kind: "home" };
    });
    const lastScreenRef = useRef(lastScreen);
    lastScreenRef.current = lastScreen;
    const [reloadKey, setReloadKey] = useState(0);
    const [pendingChat, setPendingChat] = useState<string | null>(() => {
        const r = currentRoute();
        return r.kind === "chats" && r.otherId ? r.otherId : null;
    });

    const refreshMe = useCallback(() => {
        whoAmI()
            .then(setMe)
            .catch(() => setMe(null));
    }, []);
    useEffect(refreshMe, [refreshMe]);

    useEffect(() => {
        const r = currentRoute();
        if (r.kind === "signin" || r.kind === "join") {
            navigateTo({ kind: "home" }, true);
        }
    }, []);

    /** Shows a route; `push` also puts it in the address bar (not for back/forward, the browser did that). */
    const apply = useCallback((next: Route, push: boolean) => {
        const target = normalize(next);
        if (isScreen(target)) {
            if (lastScreenRef.current.kind === "write" && target.kind === "home") {
                // just published: the front page loads again
                setReloadKey((k) => k + 1);
            }
            setLastScreen(target);
        } else if (target.kind === "chats") {
            setPendingChat(target.otherId ?? null);
        }
        setRoute(target);
        if (push) {
            navigateTo(target);
        }
    }, []);

    useEffect(() => {
        const onPop = () => apply(currentRoute(), false);
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [apply]);

    const session = useMemo<Session>(
        () => ({
            me,
            refreshMe,
            signedIn: true,
            screen: lastScreen,
            setScreen: (screen) => apply(screen, true),
            reloadKey,
            onNeedSignIn: () => undefined,
            openProfile: (memberId) => apply({ kind: "profile", memberId }, true),
            openChat: (memberId) => apply({ kind: "chats", otherId: memberId }, true),
            openAccount: () => apply({ kind: "account" }, true),
            signOut: () => {
                signOut();
                navigateTo({ kind: "home" });
            },
            pendingChat,
            clearPendingChat: () => setPendingChat(null)
        }),
        [me, refreshMe, lastScreen, apply, reloadKey, pendingChat]
    );

    // admin places for members who are not (or no longer) admins: the front page instead
    const adminOnly = route.kind === "reports" || route.kind === "members";
    const shown: Route = adminOnly && me !== null && !me.admin ? { kind: "home" } : route;

    let active: NavKey = "home";
    if (shown.kind === "chats" || shown.kind === "account" || shown.kind === "reports" || shown.kind === "members") {
        active = shown.kind;
    } else if (shown.kind === "poets" || shown.kind === "profile") {
        active = "poets";
    } else if (shown.kind === "write") {
        active = "write";
    } else if (shown.kind === "search") {
        active = "search";
    }

    let body: ReactElement;
    switch (shown.kind) {
        case "chats":
            body = <ChatsView />;
            break;
        case "account":
            body = <AccountView />;
            break;
        case "reports":
            body = <ReportsView />;
            break;
        case "members":
            body = <MembersView />;
            break;
        default:
            body = <FeedView />;
    }

    return (
        <SessionContext.Provider value={session}>
            <div className="verse-member">
                <Ambient />
                <Masthead active={active} go={(key) => apply(ROUTE_OF[key], true)} />
                <div className="verse-frame">{body}</div>
                <BottomNav active={active} go={(key) => apply(ROUTE_OF[key], true)} />
            </div>
        </SessionContext.Provider>
    );
}
