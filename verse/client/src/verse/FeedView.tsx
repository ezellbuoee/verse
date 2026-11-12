import { type ReactElement, useEffect, useRef, useState } from "react";

import { Home } from "./Home";
import { SearchPage } from "./SearchPage";
import { PoemPage } from "./PoemPage";
import { PoetsPage } from "./PoetsPage";
import { ProfilePage } from "./ProfilePage";
import { useSession } from "./session";
import { Footer } from "./Shell";
import { WritePage } from "./WritePage";

/** The reading side for members: front page, poets, profiles, poems, writing. Navigation lives in the session. */
export function FeedView(): ReactElement {
    const session = useSession();
    const screen = session.screen;
    const viewRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<string | null>(null);
    const home = () => session.setScreen({ kind: "home" });

    // every screen change starts at the top, like a new page
    useEffect(() => {
        viewRef.current?.scrollTo({ top: 0 });
    }, [screen]);

    useEffect(() => {
        if (!toast) {
            return undefined;
        }
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    return (
        <div className="verse-view" ref={viewRef}>
            {toast && (
                <div className="verse-toast" role="status">
                    {toast}
                </div>
            )}
            <main className="verse-main">
                {screen.kind === "write" && (
                    <WritePage
                        onCancel={home}
                        onPublished={() => {
                            setToast("Published. Your words are live.");
                            home();
                        }}
                    />
                )}
                {screen.kind === "profile" && (
                    <ProfilePage memberId={screen.memberId} onBack={() => session.setScreen({ kind: "poets" })} />
                )}
                {screen.kind === "poem" && <PoemPage id={screen.id} post={screen.post} onBack={home} />}
                {screen.kind === "poets" && <PoetsPage />}
                {screen.kind === "search" && <SearchPage initial={screen.q} />}
                {(screen.kind === "home" || screen.kind === "signin" || screen.kind === "join") && (
                    <>
                        <Home reloadKey={session.reloadKey ?? 0} />
                        <Footer />
                    </>
                )}
            </main>
        </div>
    );
}
