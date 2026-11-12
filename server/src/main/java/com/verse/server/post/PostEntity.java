package com.verse.server.post;

import com.verse.server.support.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A poem or a quote. Author name and id are copied in, so imported authors need no member row. */
@Entity
@Table(name = "posts")
public class PostEntity extends BaseEntity {

    @Column(nullable = false)
    private String kind;

    private String title;

    @Column(nullable = false)
    private String body;

    private String source;

    private String mood;

    @Column(name = "author_name", nullable = false)
    private String authorName;

    @Column(name = "author_id")
    private String authorId;

    @Column(name = "like_count", nullable = false)
    private long likeCount;

    @Column(name = "comment_count", nullable = false)
    private long commentCount;

    protected PostEntity() {
    }

    public PostEntity(String kind, String title, String body, String source, String mood, String authorName,
            String authorId) {
        this.kind = kind;
        this.title = title;
        this.body = body;
        this.source = source;
        this.mood = mood;
        this.authorName = authorName;
        this.authorId = authorId;
    }

    public String getKind() {
        return kind;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getSource() {
        return source;
    }

    public String getMood() {
        return mood;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getAuthorId() {
        return authorId;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(long likeCount) {
        this.likeCount = likeCount;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(long commentCount) {
        this.commentCount = commentCount;
    }
}
