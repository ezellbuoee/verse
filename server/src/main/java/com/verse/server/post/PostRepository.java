package com.verse.server.post;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<PostEntity, String> {

    List<PostEntity> findByAuthorId(String authorId);

    long countByAuthorId(String authorId);

    @Modifying
    @Query("update PostEntity p set p.authorName = :name where p.authorId = :authorId")
    int renameAuthor(@Param("authorId") String authorId, @Param("name") String name);
}
