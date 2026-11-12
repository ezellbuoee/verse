package com.verse.server.chat;

import java.time.Instant;

import com.verse.server.support.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "messages")
public class MessageEntity extends BaseEntity {

    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @Column(name = "from_id", nullable = false)
    private String fromId;

    @Column(name = "from_name", nullable = false)
    private String fromName;

    @Column(name = "to_id", nullable = false)
    private String toId;

    @Column(nullable = false)
    private String body;

    @Column(name = "read_at")
    private Instant readAt;

    protected MessageEntity() {
    }

    public MessageEntity(String conversationId, String fromId, String fromName, String toId, String body) {
        this.conversationId = conversationId;
        this.fromId = fromId;
        this.fromName = fromName;
        this.toId = toId;
        this.body = body;
    }

    public String getConversationId() {
        return conversationId;
    }

    public String getFromId() {
        return fromId;
    }

    public String getFromName() {
        return fromName;
    }

    public String getToId() {
        return toId;
    }

    public String getBody() {
        return body;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public void setReadAt(Instant readAt) {
        this.readAt = readAt;
    }
}
