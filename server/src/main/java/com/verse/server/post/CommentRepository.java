package com.verse.server.post;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<CommentEntity, String> {

    List<CommentEntity> findByPostIdOrderByCreatedAtAsc(String postId);

    List<CommentEntity> findByAuthorId(String authorId);

    long countByPostId(String postId);

    long countByAuthorId(String authorId);

    @Modifying
    @Query("delete from CommentEntity c where c.postId = :postId")
    int deleteByPost(@Param("postId") String postId);

    @Modifying
    @Query("update CommentEntity c set c.authorName = :name where c.authorId = :authorId")
    int renameAuthor(@Param("authorId") String authorId, @Param("name") String name);
}
