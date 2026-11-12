package com.verse.server.support;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Persistable;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Transient;

/**
 * Id (a random UUID, assigned on creation) and creation time shared by every Verse table. Implements
 * {@link Persistable} so a save of a new row is a plain insert instead of a select followed by an insert.
 */
@MappedSuperclass
public abstract class BaseEntity implements Persistable<String> {

    @Id
    @Column(length = 36)
    private String id = UUID.randomUUID().toString();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Transient
    private boolean fresh = true;

    @Override
    public String getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /** For imports that keep an order (seed data): the creation time decides "newest first". */
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean isNew() {
        return fresh;
    }

    @PostLoad
    @PostPersist
    void markStored() {
        fresh = false;
    }
}
