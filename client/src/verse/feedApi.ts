import { api, type Page, qs } from "./api";

/** Public reads of the Verse API v1: posts, authors, comments and the daily selection. No login needed. */
export type { Page } from "./api";

export interface FeedPost {
    readonly id: string;
    readonly kind: "POEM" | "QUOTE";
    readonly title: string | null;
    readonly body: string;
    readonly source: string | null;
    readonly mood: string | null;
    readonly authorName: string;
    readonly authorId: string | null;
    readonly likeCount: number;
    readonly commentCount: number;
    readonly createdAt: string;
}

export interface FeedQuery {
    readonly page?: number;
    readonly size?: number;
    readonly sort?: "newest" | "loved";
    readonly kind?: "POEM" | "QUOTE";
    readonly mood?: string;
    readonly author?: string;
    readonly q?: string;
}

export function loadFeed(query: FeedQuery = {}): Promise<Page<FeedPost>> {
    return api(`/posts${qs({ ...query })}`);
}

export interface MoodCount {
    readonly mood: string;
    readonly count: number;
}

export interface Poet {
    readonly name: string;
    readonly id: string | null;
    readonly poems: number;
    readonly quotes: number;
    readonly likes: number;
    readonly classic: boolean;
    /** The mood this poet writes about most. */
    readonly mood: string | null;
    readonly bio: string | null;
}

export type PoetKind = "" | "classic" | "member";

export function loadPoets(page = 0, size = 40, q = "", kind: PoetKind = ""): Promise<Page<Poet>> {
    return api(`/authors${qs({ page, size, q, kind })}`);
}

/** What the day selected for the front page. Same for everyone, changes every day. */
export interface DailyData {
    readonly date: string;
    readonly topPost: FeedPost | null;
    readonly quote: FeedPost | null;
    readonly authorOfTheDay: Poet | null;
    readonly moodOfTheDay: string | null;
    readonly selection: FeedPost[];
    readonly fresh: FeedPost[];
    readonly mostLoved: FeedPost[];
    readonly moods: MoodCount[];
    readonly authors: Poet[];
    readonly totals: { posts: number; poems: number; quotes: number; authors: number };
}

export function loadDaily(): Promise<DailyData> {
    return api("/daily");
}

export interface FeedComment {
    readonly id: string;
    readonly postId: string;
    readonly body: string;
    readonly authorName: string;
    readonly authorId: string;
    readonly createdAt: string;
}

export async function loadComments(postId: string): Promise<FeedComment[]> {
    const page = await api<Page<FeedComment>>(`/posts/${encodeURIComponent(postId)}/comments?size=60`);
    return page.items;
}

export const MOOD_LABELS: Record<string, string> = {
    LOVE: "love",
    GRIEF: "grief",
    JOY: "joy",
    NATURE: "nature",
    HOPE: "hope",
    NIGHT: "night"
};

/** "just now", "5 min ago", "3 h ago", "2 d ago", else a short date. */
export function timeAgo(iso: string, now: number = Date.now()): string {
    const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (seconds < 60) {
        return "just now";
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min ago`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours} h ago`;
    }
    const days = Math.round(hours / 24);
    if (days < 14) {
        return `${days} d ago`;
    }
    return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

/** An author's page: who they are and their numbers. Their posts come from loadFeed({ author }). */
export interface Profile extends Poet {
    readonly id: string;
    readonly displayName: string;
    readonly likesReceived: number;
    readonly since: string | null;
    readonly moods: MoodCount[];
    readonly mostLoved: FeedPost | null;
    readonly total: number;
}

interface AuthorDetail {
    readonly author: Poet;
    readonly since: string | null;
    readonly moods: MoodCount[];
    readonly mostLoved: FeedPost | null;
    readonly total: number;
}

export async function loadProfile(memberId: string): Promise<Profile | null> {
    try {
        const d = await api<AuthorDetail>(`/authors/${encodeURIComponent(memberId)}`);
        return {
            ...d.author,
            id: d.author.id ?? memberId,
            displayName: d.author.name,
            likesReceived: d.author.likes,
            since: d.since,
            moods: d.moods,
            mostLoved: d.mostLoved,
            total: d.total
        };
    } catch (e) {
        if ((e as { status?: number }).status === 404) {
            return null;
        }
        throw e;
    }
}

/** Ids that have a page: members (uuid), development users, and the classic poets. */
export function hasPage(authorId: string | null | undefined): authorId is string {
    return Boolean(
        authorId && (authorId.includes("-") || authorId.startsWith("dev:") || authorId.startsWith("classic:"))
    );
}

export async function loadPost(id: string): Promise<FeedPost | null> {
    try {
        return await api<FeedPost>(`/posts/${encodeURIComponent(id)}`);
    } catch (e) {
        if ((e as { status?: number }).status === 404) {
            return null;
        }
        throw e;
    }
}
