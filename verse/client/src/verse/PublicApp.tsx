import { type ReactElement, useEffect, useState } from "react";

import { Home } from "./Home";
import { SearchPage } from "./SearchPage";
import { JoinPage } from "./JoinPage";
import { PoemPage } from "./PoemPage";
import { PoetsPage } from "./PoetsPage";
import { ProfilePage } from "./ProfilePage";
import { currentRoute, isScreen, navigateTo } from "./router";
import { type Screen, type Session, SessionContext } from "./session";
import { Footer, type NavKey, Page } from "./Shell";
import { SignInPage } from "./SignInPage";
import "./verse.css";

/** What a visitor sees without an account: the whole reading side, and the way in. */
export function PublicApp(): ReactElement {
    const [screen, setScreen] = useState<Screen>(() => {
        const r = currentRoute();
        // member-only addresses ask a visitor to sign in first
        return isScreen(r) ? r : { kind: "signin" };
    });
    useEffect(() => {
        navigateTo(screen);
        window.scrollTo({ top: 0 });
    }, [screen]);
    useEffect(() => {
        const onPop = () => {
            const r = currentRoute();
            setScreen(isScreen(r) ? r : { kind: "signin" });
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);
    const session: Session = {
        me: null,
        signedIn: false,
        screen,
        setScreen,
        onNeedSignIn: () => setScreen({ kind: "signin" }),
        openProfile: (memberId) => setScreen({ kind: "profile", memberId }),
        openChat: () => setScreen({ kind: "signin" })
    };
    const go = (key: NavKey) => {
        if (key === "home") {
            setScreen({ kind: "home" });
        } else if (key === "poets") {
            setScreen({ kind: "poets" });
        } else if (key === "write") {
            setScreen({ kind: "join" });
        } else if (key === "search") {
            setScreen({ kind: "search", q: "" });
        } else {
            setScreen({ kind: "signin" });
        }
    };
    const active: NavKey =
        screen.kind === "search"
            ? "search"
            : screen.kind === "poets" || screen.kind === "profile"
              ? "poets"
              : screen.kind === "join"
                ? "write"
                : screen.kind === "signin"
                  ? "account"
                  : "home";

    let body: ReactElement;
    switch (screen.kind) {
        case "signin":
            body = <SignInPage onBack={() => setScreen({ kind: "home" })} onJoin={() => setScreen({ kind: "join" })} />;
            break;
        case "join":
            body = (
                <JoinPage onBack={() => setScreen({ kind: "home" })} onSignIn={() => setScreen({ kind: "signin" })} />
            );
            break;
        case "profile":
            body = <ProfilePage memberId={screen.memberId} onBack={() => setScreen({ kind: "poets" })} />;
            break;
        case "poem":
            body = <PoemPage id={screen.id} post={screen.post} onBack={() => setScreen({ kind: "home" })} />;
            break;
        case "poets":
            body = <PoetsPage />;
            break;
        case "search":
            body = <SearchPage initial={screen.q} />;
            break;
        default:
            body = (
                <>
                    <Home />
                    <Footer />
                </>
            );
    }
    return (
        <SessionContext.Provider value={session}>
            <Page active={active} go={go}>
                {body}
            </Page>
        </SessionContext.Provider>
    );
}
