package com.verse.server.post;

import com.verse.server.support.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "comments")
public class CommentEntity extends BaseEntity {

    @Column(name = "post_id", nullable = false)
    private String postId;

    @Column(nullable = false)
    private String body;

    @Column(name = "author_name", nullable = false)
    private String authorName;

    @Column(name = "author_id", nullable = false)
    private String authorId;

    protected CommentEntity() {
    }

    public CommentEntity(String postId, String body, String authorName, String authorId) {
        this.postId = postId;
        this.body = body;
        this.authorName = authorName;
        this.authorId = authorId;
    }

    public String getPostId() {
        return postId;
    }

    public String getBody() {
        return body;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getAuthorId() {
        return authorId;
    }
}
