package com.verse.server.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.verse.server.chat.ChatService.Conversation;
import com.verse.server.chat.ChatService.Message;
import com.verse.server.feed.FeedIndex.Entry;
import com.verse.server.member.MemberService.Member;
import com.verse.server.moderation.ModerationService.Report;
import com.verse.server.post.ReactionService.Comment;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The JSON shapes of the Verse API v1. Records only, so another client (a phone app, a different community site)
 * can rely on stable field names. Everything here is generic: "post", "author", "kind" instead of poem-specific
 * words, the kinds and moods themselves come from the document model.
 */
public final class ApiModels {

    private ApiModels() {
    }

    /** A page of items. Every list endpoint returns this envelope. */
    @Schema(name = "Page")
    public record PageDto<T>(List<T> items, int page, int size, long total, boolean hasMore) {

        public static final int MAX_SIZE = 60;

        public static <T> PageDto<T> of(List<T> list, int page, int size) {
            int sz = Math.max(1, Math.min(MAX_SIZE, size));
            int pg = Math.max(0, page);
            int from = pg * sz;
            List<T> items = from >= list.size() ? List.of() : list.subList(from, Math.min(list.size(), from + sz));
            return new PageDto<>(List.copyOf(items), pg, sz, list.size(), from + sz < list.size());
        }
    }

    @Schema(name = "Post")
    public record PostDto(String id, String kind, String title, String body, String source, String mood,
            String authorName, String authorId, long likeCount, long commentCount, Instant createdAt) {

        public static PostDto of(Entry e) {
            return new PostDto(e.id(), e.kind(), e.title(), e.body(), e.source(), e.mood(), e.authorName(),
                    e.authorId(), e.likeCount(), e.commentCount(), e.createdAt());
        }
    }

    @Schema(name = "Comment")
    public record CommentDto(String id, String postId, String body, String authorName, String authorId,
            Instant createdAt) {

        public static CommentDto of(Comment c) {
            return new CommentDto(c.id(), c.postId(), c.body(), c.authorName(), c.authorId(), c.createdAt());
        }
    }

    /** Someone who published: a member with a page, or a name-only author of imported content. */
    @Schema(name = "Author")
    public record AuthorDto(
            @Schema(description = "Null when the author has no page (posts filed under a name only)") String id,
            String name, boolean classic, long poems, long quotes, long likes,
            @Schema(description = "The mood this author writes about most") String mood, String bio) {
    }

    @Schema(name = "AuthorDetail")
    public record AuthorDetailDto(AuthorDto author, Instant since, List<MoodCountDto> moods, PostDto mostLoved,
            long total) {
    }

    @Schema(name = "MoodCount")
    public record MoodCountDto(String mood, long count) {
    }

    @Schema(name = "Totals")
    public record TotalsDto(long posts, long poems, long quotes, long authors) {
    }

    /** The front page: what the day selected. Same for everyone, changes every day. */
    @Schema(name = "Daily")
    public record DailyDto(String date, PostDto topPost, PostDto quote, AuthorDto authorOfTheDay,
            String moodOfTheDay, List<PostDto> selection, List<PostDto> fresh, List<PostDto> mostLoved,
            List<MoodCountDto> moods, List<AuthorDto> authors, TotalsDto totals) {
    }

    @Schema(name = "Me")
    public record MeDto(String id, String name, boolean admin, String bio) {
    }

    @Schema(name = "Like")
    public record LikeDto(boolean liked, long likeCount) {
    }

    @Schema(name = "AccountSummary")
    public record SummaryDto(int posts, int comments, int likes, int messages) {
    }

    @Schema(name = "Message")
    public record MessageDto(String id, String fromId, String fromName, String toId, String body, Instant createdAt,
            boolean read) {

        public static MessageDto of(Message m) {
            return new MessageDto(m.id(), m.fromId(), m.fromName(), m.toId(), m.body(), m.createdAt(), m.read());
        }
    }

    @Schema(name = "ConversationSummary")
    public record ConversationSummaryDto(String otherId, String otherName, String lastBody, Instant lastAt,
            long unread) {

        public static ConversationSummaryDto of(Conversation c) {
            return new ConversationSummaryDto(c.otherId(), c.otherName(), c.lastBody(), c.lastAt(), c.unread());
        }
    }

    @Schema(name = "Conversations")
    public record ConversationsDto(long unread, List<ConversationSummaryDto> items) {
    }

    @Schema(name = "Conversation")
    public record ConversationDto(String otherId, String otherName, List<MessageDto> items) {
    }

    @Schema(name = "Report")
    public record ReportDto(String id, String postId, String reporterName, String reason, String status,
            Instant createdAt, Map<String, Object> post) {

        public static ReportDto of(Report r) {
            return new ReportDto(r.id(), r.postId(), r.reporterName(), r.reason(), r.status(), r.createdAt(),
                    r.post());
        }
    }

    @Schema(name = "Signup")
    public record SignupRequest(String email, String displayName, String password,
            @Schema(description = "The person confirmed being 18 or older") boolean over18) {
    }

    @Schema(name = "Account")
    public record AccountDto(String id, String email, String displayName) {
    }

    @Schema(name = "Login")
    public record LoginRequest(String email, String password) {
    }

    @Schema(name = "Token")
    public record TokenDto(
            @Schema(description = "Send as Authorization: Bearer <accessToken>") String accessToken,
            String tokenType, Instant expiresAt) {
    }

    /** A member as an admin sees them: with email, role and status, never the password hash. */
    @Schema(name = "MemberAdmin")
    public record MemberAdminDto(String id, String email, String displayName, String role, String status,
            Instant since) {

        public static MemberAdminDto of(Member m) {
            return new MemberAdminDto(m.id(), m.email(), m.displayName(), m.role(), m.status(), m.since());
        }
    }

    @Schema(name = "MemberChange")
    public record MemberChangeRequest(@Schema(description = "user | admin, null keeps it") String role,
            @Schema(description = "ACTIVE | SUSPENDED, null keeps it") String status) {
    }

    @Schema(name = "NewPost")
    public record NewPostRequest(String kind, String title, String body, String source, String mood) {
    }

    @Schema(name = "NewComment")
    public record NewCommentRequest(String postId, String body) {
    }

    @Schema(name = "NewReport")
    public record NewReportRequest(String postId, String reason) {
    }

    @Schema(name = "NewMessage")
    public record NewMessageRequest(String body) {
    }

    @Schema(name = "ProfileUpdate")
    public record ProfileUpdateRequest(String displayName, String bio) {
    }

    @Schema(name = "AccountDeletion")
    public record DeletionRequest(@Schema(description = "The current password, as a second check") String password) {
    }
}
