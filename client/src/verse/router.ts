import type { Screen } from "./session";

/** Address ↔ screen. Members also have /chats, /account and the admin pages. */
export type Route =
    Screen | { kind: "chats"; otherId?: string } | { kind: "account" } | { kind: "reports" } | { kind: "members" };

export function toPath(route: Route): string {
    switch (route.kind) {
        case "home":
            return "/";
        case "poets":
            return "/poets";
        case "profile":
            return `/poets/${encodeURIComponent(route.memberId)}`;
        case "poem":
            return `/poems/${encodeURIComponent(route.id)}`;
        case "write":
            return "/write";
        case "search":
            return route.q ? `/search?q=${encodeURIComponent(route.q)}` : "/search";
        case "signin":
            return "/signin";
        case "join":
            return "/join";
        case "chats":
            return route.otherId ? `/chats/${encodeURIComponent(route.otherId)}` : "/chats";
        case "account":
            return "/account";
        case "reports":
            return "/admin/reports";
        case "members":
            return "/admin/members";
    }
}

export function parsePath(pathname: string): Route {
    const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const [a, b] = parts;
    if (!a) {
        return { kind: "home" };
    }
    if (a === "poets") {
        return b ? { kind: "profile", memberId: b } : { kind: "poets" };
    }
    if (a === "poems" && b) {
        return { kind: "poem", id: b };
    }
    if (a === "write") {
        return { kind: "write" };
    }
    if (a === "search") {
        return { kind: "search", q: new URLSearchParams(window.location.search).get("q") ?? "" };
    }
    if (a === "signin") {
        return { kind: "signin" };
    }
    if (a === "join") {
        return { kind: "join" };
    }
    if (a === "chats") {
        return { kind: "chats", otherId: b };
    }
    if (a === "account") {
        return { kind: "account" };
    }
    if (a === "admin" && b === "reports") {
        return { kind: "reports" };
    }
    if (a === "admin" && b === "members") {
        return { kind: "members" };
    }
    return { kind: "home" };
}

export function currentRoute(): Route {
    return parsePath(window.location.pathname);
}

/** Pushes the address for a route unless the browser is already there. */
export function navigateTo(route: Route, replace = false): void {
    const path = toPath(route);
    if (window.location.pathname === path) {
        return;
    }
    if (replace) {
        window.history.replaceState(null, "", path);
    } else {
        window.history.pushState(null, "", path);
    }
}

export function isScreen(route: Route): route is Screen {
    return !["chats", "account", "reports", "members"].includes(route.kind);
}
