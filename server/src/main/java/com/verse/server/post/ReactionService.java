package com.verse.server.post;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.feed.FeedIndex;
import com.verse.server.post.PostService.Author;
import com.verse.server.post.PostService.PostException;

/** Likes and comments on posts, plus the counters on the post. */
@Service
public class ReactionService {

    static final int MAX_COMMENT = 1000;

    public record LikeResult(boolean liked, long likeCount) {
    }

    public record Comment(String id, String postId, String body, String authorName, String authorId,
            Instant createdAt) {

        static Comment of(CommentEntity c) {
            return new Comment(c.getId(), c.getPostId(), c.getBody(), c.getAuthorName(), c.getAuthorId(),
                    c.getCreatedAt());
        }
    }

    private final PostRepository posts;
    private final LikeRepository likes;
    private final CommentRepository comments;
    private final PostService postService;
    private final FeedIndex index;

    public ReactionService(PostRepository posts, LikeRepository likes, CommentRepository comments,
            PostService postService, FeedIndex index) {
        this.posts = posts;
        this.likes = likes;
        this.comments = comments;
        this.postService = postService;
        this.index = index;
    }

    /** Like if not liked yet, otherwise take the like back. One like per member and post. */
    @Transactional
    public synchronized LikeResult toggleLike(String postId) {
        Author me = postService.currentAuthor();
        PostEntity post = requirePost(postId);
        Optional<LikeEntity> existing = likes.findByPostIdAndMemberId(postId, me.id());
        boolean liked;
        if (existing.isPresent()) {
            likes.delete(existing.get());
            liked = false;
        } else {
            likes.save(new LikeEntity(postId, me.id()));
            liked = true;
        }
        likes.flush();
        long count = likes.countByPostId(postId);
        post.setLikeCount(count);
        index.invalidate();
        return new LikeResult(liked, count);
    }

    /** Ids of the posts the signed-in member has liked. */
    public List<String> myLikes() {
        Author me = postService.currentAuthor();
        return likes.findByMemberId(me.id()).stream().map(LikeEntity::getPostId).toList();
    }

    @Transactional
    public Comment addComment(String postId, String rawBody) {
        Author me = postService.currentAuthor();
        PostEntity post = requirePost(postId);
        String body = rawBody == null ? "" : rawBody.strip();
        if (body.isEmpty()) {
            throw new PostException("Please write a comment first.");
        }
        if (body.length() > MAX_COMMENT) {
            throw new PostException("A comment can have at most 1000 characters.");
        }
        CommentEntity created = comments.saveAndFlush(new CommentEntity(postId, body, me.name(), me.id()));
        post.setCommentCount(comments.countByPostId(postId));
        index.invalidate();
        return Comment.of(created);
    }

    /** Comments of a post, oldest first. Public: contains display names only. */
    public List<Comment> commentsOf(String postId) {
        return comments.findByPostIdOrderByCreatedAtAsc(postId).stream().map(Comment::of).toList();
    }

    /** How many comments and hearts a member has given. */
    public record Given(long comments, long likes) {
    }

    public Given givenBy(String memberId) {
        return new Given(comments.countByAuthorId(memberId), likes.countByMemberId(memberId));
    }

    /** Deletes every comment and heart of a member and fixes the counters of the posts they were on. */
    @Transactional
    public void deleteAllBy(String memberId) {
        Set<String> touched = new HashSet<>();
        for (CommentEntity c : comments.findByAuthorId(memberId)) {
            touched.add(c.getPostId());
            comments.delete(c);
        }
        for (LikeEntity l : likes.findByMemberId(memberId)) {
            touched.add(l.getPostId());
            likes.delete(l);
        }
        comments.flush();
        touched.forEach(this::recount);
    }

    /** Sets both counters of a post from the rows that exist (after a member's likes and comments went away). */
    @Transactional
    public void recount(String postId) {
        posts.findById(postId).ifPresent(post -> {
            post.setLikeCount(likes.countByPostId(postId));
            post.setCommentCount(comments.countByPostId(postId));
        });
        index.invalidate();
    }

    private PostEntity requirePost(String postId) {
        return posts.findById(postId).orElseThrow(() -> new PostException("This post no longer exists."));
    }
}
