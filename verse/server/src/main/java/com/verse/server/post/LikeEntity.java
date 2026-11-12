package com.verse.server.post;

import com.verse.server.support.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A heart: one per member and post (unique constraint). */
@Entity
@Table(name = "post_likes")
public class LikeEntity extends BaseEntity {

    @Column(name = "post_id", nullable = false)
    private String postId;

    @Column(name = "member_id", nullable = false)
    private String memberId;

    protected LikeEntity() {
    }

    public LikeEntity(String postId, String memberId) {
        this.postId = postId;
        this.memberId = memberId;
    }

    public String getPostId() {
        return postId;
    }

    public String getMemberId() {
        return memberId;
    }
}
