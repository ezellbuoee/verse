package com.verse.server.moderation;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportRepository extends JpaRepository<ReportEntity, String> {

    List<ReportEntity> findByStatusOrderByCreatedAtAsc(String status);

    boolean existsByPostIdAndReporterIdAndStatus(String postId, String reporterId, String status);

    @Modifying
    @Query("update ReportEntity r set r.status = :to where r.postId = :postId and r.status = :from")
    int changeStatus(@Param("postId") String postId, @Param("from") String from, @Param("to") String to);

    @Modifying
    @Query("delete from ReportEntity r where r.reporterId = :memberId")
    int deleteByReporter(@Param("memberId") String memberId);
}
