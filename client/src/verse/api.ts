import { accessToken, signOut } from "./auth";

/**
 * The one place that talks to the Verse API v1 (see docs/API.md). Public reads need no token; everything under
 * /api/v1/me and /api/v1/admin sends the sign-in token. Errors arrive as application/problem+json and are rethrown
 * as ApiError with the server's plain-language detail.
 */
export const API = "/api/v1";

function language(): string {
    return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number
    ) {
        super(message);
    }
}

interface Problem {
    readonly title?: string;
    readonly detail?: string;
    readonly status?: number;
}

async function fail(response: Response): Promise<never> {
    let message = `Request failed (HTTP ${response.status})`;
    try {
        const problem = (await response.json()) as Problem;
        message = problem.detail ?? problem.title ?? message;
    } catch {
        // not a problem document
    }
    throw new ApiError(message, response.status);
}

export interface RequestOptions {
    readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    readonly body?: unknown;
    /** Send the token. Default: only for /me and /admin paths. */
    readonly auth?: boolean;
}

/** Query string from an object; empty, null and undefined values are left out. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
            p.set(k, String(v));
        }
    });
    const s = p.toString();
    return s ? `?${s}` : "";
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const auth = options.auth ?? (path.startsWith("/me") || path.startsWith("/admin"));
    const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": language() };
    if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
    }
    if (auth) {
        headers.Authorization = `Bearer ${accessToken()}`;
    }
    const response = await fetch(`${API}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    if (!response.ok) {
        if (auth && response.status === 401) {
            // the token expired or the account is gone: back to the visitor view
            signOut();
        }
        return fail(response);
    }
    if (response.status === 204 || response.status === 202) {
        return undefined as T;
    }
    return (await response.json()) as T;
}

/** A page of items, the envelope every list endpoint returns. */
export interface Page<T> {
    readonly items: T[];
    readonly page: number;
    readonly size: number;
    readonly total: number;
    readonly hasMore: boolean;
}
