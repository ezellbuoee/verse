package com.verse.server.moderation;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.feed.FeedIndex;
import com.verse.server.post.CommentRepository;
import com.verse.server.post.LikeRepository;
import com.verse.server.post.PostEntity;
import com.verse.server.post.PostRepository;
import com.verse.server.post.PostService;
import com.verse.server.post.PostService.Author;
import com.verse.server.post.PostService.PostException;
import com.verse.server.support.CurrentUser;

/** Reports and removals. Removing a post deletes it with its likes and comments; its reports are closed. */
@Service
public class ModerationService {

    static final int MAX_REASON = 500;

    public record Report(String id, String postId, String reporterName, String reason, String status, Instant createdAt,
            Map<String, Object> post) {
    }

    private final ReportRepository reports;
    private final PostRepository posts;
    private final LikeRepository likes;
    private final CommentRepository comments;
    private final PostService postService;
    private final FeedIndex index;

    public ModerationService(ReportRepository reports, PostRepository posts, LikeRepository likes,
            CommentRepository comments, PostService postService, FeedIndex index) {
        this.reports = reports;
        this.posts = posts;
        this.likes = likes;
        this.comments = comments;
        this.postService = postService;
        this.index = index;
    }

    /** Any member may report a post once. */
    @Transactional
    public void report(String postId, String rawReason) {
        Author me = postService.currentAuthor();
        PostEntity post = posts.findById(postId)
                .orElseThrow(() -> new PostException("This post no longer exists."));
        if (me.id().equals(post.getAuthorId())) {
            throw new PostException("You cannot report your own post. You can remove it instead.");
        }
        String reason = rawReason == null ? "" : rawReason.strip();
        if (reason.length() > MAX_REASON) {
            throw new PostException("The reason can have at most 500 characters.");
        }
        if (reports.existsByPostIdAndReporterIdAndStatus(postId, me.id(), ReportEntity.OPEN)) {
            throw new PostException("Thanks, you already reported this post. Ezekiel will look at it.");
        }
        reports.save(new ReportEntity(postId, me.id(), me.name(), reason.isEmpty() ? null : reason));
    }

    /** The author or an admin removes a post and everything attached to it. */
    @Transactional
    public void removePost(String postId) {
        Author me = postService.currentAuthor();
        PostEntity post = posts.findById(postId)
                .orElseThrow(() -> new PostException("This post no longer exists."));
        if (!me.id().equals(post.getAuthorId()) && !CurrentUser.isAdmin()) {
            throw new AccessDeniedException("Only the author or an admin can remove a post.");
        }
        deleteWithAttachments(postId);
        index.invalidate();
    }

    /** Deletes a post with its likes and comments and closes its open reports. No permission check. */
    @Transactional
    public void deleteWithAttachments(String postId) {
        likes.deleteByPost(postId);
        comments.deleteByPost(postId);
        reports.changeStatus(postId, ReportEntity.OPEN, ReportEntity.REMOVED);
        posts.deleteById(postId);
    }

    /** Deletes all posts of a member (with their likes and comments) and every report the member made. */
    @Transactional
    public void deleteEverythingOf(String memberId) {
        posts.findByAuthorId(memberId).stream().map(PostEntity::getId).forEach(this::deleteWithAttachments);
        reports.deleteByReporter(memberId);
    }

    /** Admin: close a report without removing the post. */
    @Transactional
    public void dismiss(String reportId) {
        requireAdmin();
        ReportEntity r = reports.findById(reportId)
                .orElseThrow(() -> new PostException("This report no longer exists."));
        r.setStatus(ReportEntity.DISMISSED);
    }

    /** Admin: open reports, oldest first, each with the reported post (or null if it is already gone). */
    public List<Report> openReports() {
        requireAdmin();
        return reports.findByStatusOrderByCreatedAtAsc(ReportEntity.OPEN).stream().map(this::toReport).toList();
    }

    private Report toReport(ReportEntity r) {
        return new Report(r.getId(), r.getPostId(), r.getReporterName(), r.getReason(), r.getStatus(),
                r.getCreatedAt(), posts.findById(r.getPostId()).map(ModerationService::postJson).orElse(null));
    }

    private static Map<String, Object> postJson(PostEntity p) {
        Map<String, Object> j = new LinkedHashMap<>();
        j.put("id", p.getId());
        j.put("kind", p.getKind());
        j.put("title", p.getTitle());
        j.put("body", p.getBody());
        j.put("authorName", p.getAuthorName());
        return j;
    }

    private static void requireAdmin() {
        if (!CurrentUser.isAdmin()) {
            throw new AccessDeniedException("Admins only.");
        }
    }
}
