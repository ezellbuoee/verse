import { createContext, useContext } from "react";

import type { FeedPost } from "./feedApi";
import type { Me } from "./rpc";

/** Where the person is inside the reading part of Verse (same for visitors and members). */
export type Screen =
    | { kind: "home" }
    | { kind: "poets" }
    | { kind: "profile"; memberId: string }
    | { kind: "poem"; id: string; post?: FeedPost }
    | { kind: "write" }
    | { kind: "search"; q: string }
    | { kind: "signin" }
    | { kind: "join" };

/** Who is using the app right now, and the navigation the shell and the pages share. */
export interface Session {
    readonly me: Me | null;
    /** Re-reads who I am (after a profile change). */
    readonly refreshMe?: () => void;
    readonly signedIn: boolean;
    readonly screen: Screen;
    readonly setScreen: (screen: Screen) => void;
    readonly onNeedSignIn: () => void;
    readonly openProfile: (memberId: string) => void;
    readonly openChat: (memberId: string) => void;
    /** Opens "My account" (members only). */
    readonly openAccount?: () => void;
    /** Forgets the sign-in token (members only). */
    readonly signOut?: () => void;
    /** Set by openChat, consumed by the Chats tab. */
    /** Bumped after publishing so the front page reloads. */
    readonly reloadKey?: number;
    readonly pendingChat?: string | null;
    readonly clearPendingChat?: () => void;
}

export const SessionContext = createContext<Session>({
    me: null,
    signedIn: false,
    screen: { kind: "home" },
    setScreen: () => undefined,
    onNeedSignIn: () => undefined,
    openProfile: () => undefined,
    openChat: () => undefined
});

export function useSession(): Session {
    return useContext(SessionContext);
}
