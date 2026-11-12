import { api, ApiError, type Page, qs } from "./api";

/**
 * What the signed-in member does, via /api/v1/me and /api/v1/admin. The function names are kept from the earlier
 * JSON-RPC client so the screens did not have to change; the transport is plain REST now.
 */
export { ApiError as RpcError };

export interface Me {
    readonly id: string;
    readonly name: string;
    readonly admin: boolean;
    readonly bio?: string;
}

export function whoAmI(): Promise<Me> {
    return api("/me");
}

export interface NewPost {
    readonly kind: "POEM" | "QUOTE";
    readonly title: string;
    readonly body: string;
    readonly source: string;
    readonly mood: string;
}

/** Publishes a post. Rejects with the server's plain-language message. */
export async function createPost(post: NewPost): Promise<string> {
    const created = await api<{ id: string } | null>("/me/posts", { method: "POST", body: post });
    return created?.id ?? "";
}

export interface LikeResult {
    readonly liked: boolean;
    readonly likeCount: number;
}

export function myLikes(): Promise<string[]> {
    return api("/me/likes");
}

export async function toggleLike(postId: string): Promise<LikeResult> {
    const liked = (await myLikes()).includes(postId);
    return api(`/me/likes/${encodeURIComponent(postId)}`, { method: liked ? "DELETE" : "PUT" });
}

export interface CommentData {
    readonly id: string;
    readonly postId: string;
    readonly body: string;
    readonly authorName: string;
    readonly authorId: string;
    readonly createdAt: string;
}

export function addComment(postId: string, body: string): Promise<CommentData> {
    return api("/me/comments", { method: "POST", body: { postId, body } });
}

export interface ChatMessage {
    readonly id: string;
    readonly fromId: string;
    readonly fromName: string;
    readonly toId: string;
    readonly body: string;
    readonly createdAt: string;
    readonly read: boolean;
}

export interface ConversationSummary {
    readonly otherId: string;
    readonly otherName: string;
    readonly lastBody: string;
    readonly lastAt: string;
    readonly unread: number;
}

export function sendMessage(toId: string, body: string): Promise<ChatMessage> {
    return api(`/me/conversations/${encodeURIComponent(toId)}/messages`, { method: "POST", body: { body } });
}

export async function loadConversation(
    otherId: string
): Promise<{ otherId: string; otherName: string; messages: ChatMessage[] }> {
    const c = await api<{ otherId: string; otherName: string; items: ChatMessage[] }>(
        `/me/conversations/${encodeURIComponent(otherId)}`
    );
    return { otherId: c.otherId, otherName: c.otherName, messages: c.items };
}

export async function loadChats(): Promise<{ unread: number; conversations: ConversationSummary[] }> {
    const c = await api<{ unread: number; items: ConversationSummary[] }>("/me/conversations");
    return { unread: c.unread, conversations: c.items };
}

export function reportPost(postId: string, reason: string): Promise<void> {
    return api("/me/reports", { method: "POST", body: { postId, reason } });
}

/** Removes a post: own posts for everyone, any post for admins. */
export function removePost(postId: string): Promise<void> {
    return api(`/me/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
}

export function dismissReport(reportId: string): Promise<void> {
    return api(`/admin/reports/${encodeURIComponent(reportId)}/dismiss`, { method: "POST" });
}

export interface OpenReport {
    readonly id: string;
    readonly postId: string;
    readonly reporterName: string;
    readonly reason: string | null;
    readonly createdAt: string;
    readonly post: { id: string; kind: string; title: string | null; body: string; authorName: string } | null;
}

export async function openReports(): Promise<OpenReport[]> {
    const page = await api<Page<OpenReport>>("/admin/reports?size=60");
    return page.items;
}

export interface AccountSummary {
    readonly posts: number;
    readonly comments: number;
    readonly likes: number;
    readonly messages: number;
}

export function accountSummary(): Promise<AccountSummary> {
    return api("/me/summary");
}

export function deleteAccount(password: string): Promise<void> {
    return api("/me/deletion", { method: "POST", body: { password } });
}

export function updateProfile(displayName: string, bio: string): Promise<Me> {
    return api("/me", { method: "PATCH", body: { displayName, bio } });
}

export interface MemberAdmin {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly role: "user" | "admin";
    readonly status: "ACTIVE" | "SUSPENDED";
    readonly since: string;
}

export function listMembers(q: string, page = 0): Promise<Page<MemberAdmin>> {
    return api(`/admin/members${qs({ q, page, size: 60 })}`);
}

export function changeMember(
    id: string,
    change: { role?: MemberAdmin["role"]; status?: MemberAdmin["status"] }
): Promise<MemberAdmin> {
    return api(`/admin/members/${encodeURIComponent(id)}`, { method: "PATCH", body: change });
}
