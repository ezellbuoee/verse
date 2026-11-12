import { useSyncExternalStore } from "react";

/**
 * The sign-in token. Kept in localStorage so a reload keeps the member signed in; every tab sees sign-in and
 * sign-out of the others (storage event). Signing out is forgetting the token.
 */
const TOKEN_KEY = "verse.token";

interface StoredToken {
    readonly accessToken: string;
    readonly expiresAt: string;
}

let current: StoredToken | null = load();
const listeners = new Set<() => void>();

function load(): StoredToken | null {
    try {
        const raw = localStorage.getItem(TOKEN_KEY);
        const token = raw ? (JSON.parse(raw) as StoredToken) : null;
        return token && Date.parse(token.expiresAt) > Date.now() ? token : null;
    } catch {
        return null;
    }
}

function save(token: StoredToken | null): void {
    current = token;
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch {
        // private mode: the sign-in lasts for this page only
    }
    listeners.forEach((l) => l());
}

window.addEventListener("storage", (event) => {
    if (event.key === TOKEN_KEY) {
        current = load();
        listeners.forEach((l) => l());
    }
});

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** The token for the Authorization header, or "" when signed out or expired. */
export function accessToken(): string {
    if (current && Date.parse(current.expiresAt) <= Date.now()) {
        save(null);
    }
    return current?.accessToken ?? "";
}

/** True while a (not yet expired) token is held; re-renders on sign-in and sign-out. */
export function useSignedIn(): boolean {
    return useSyncExternalStore(subscribe, () => current !== null && Date.parse(current.expiresAt) > Date.now());
}

/** Signs in with email and password. Rejects with the server's plain-language message. */
export async function signIn(email: string, password: string): Promise<void> {
    const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
    });
    if (!response.ok) {
        let message = "Something went wrong. Please try again.";
        try {
            const problem = (await response.json()) as { detail?: string };
            message = problem.detail ?? message;
        } catch {
            // keep the generic message
        }
        throw new Error(message);
    }
    const token = (await response.json()) as StoredToken;
    save({ accessToken: token.accessToken, expiresAt: token.expiresAt });
}

export function signOut(): void {
    save(null);
}
