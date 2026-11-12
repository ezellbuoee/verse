package com.verse.server.post;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LikeRepository extends JpaRepository<LikeEntity, String> {

    Optional<LikeEntity> findByPostIdAndMemberId(String postId, String memberId);

    List<LikeEntity> findByMemberId(String memberId);

    long countByPostId(String postId);

    long countByMemberId(String memberId);

    @Modifying
    @Query("delete from LikeEntity l where l.postId = :postId")
    int deleteByPost(@Param("postId") String postId);

    @Modifying
    @Query("delete from LikeEntity l where l.memberId = :memberId")
    int deleteByMember(@Param("memberId") String memberId);
}
