package com.verse.server.chat;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<MessageEntity, String> {

    List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);

    @Query("select m from MessageEntity m where m.fromId = :memberId or m.toId = :memberId")
    List<MessageEntity> findInvolving(@Param("memberId") String memberId);

    long countByToIdAndReadAtIsNull(String toId);

    @Modifying
    @Query("delete from MessageEntity m where m.fromId = :memberId or m.toId = :memberId")
    int deleteInvolving(@Param("memberId") String memberId);
}
