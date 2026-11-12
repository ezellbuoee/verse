package com.verse.server.member;

import java.time.Instant;

import com.verse.server.support.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "members")
public class MemberEntity extends BaseEntity {

    public static final String ROLE_USER = "user";
    public static final String ROLE_ADMIN = "admin";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_SUSPENDED = "SUSPENDED";

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role = ROLE_USER;

    @Column(nullable = false)
    private String status = STATUS_ACTIVE;

    private String bio;

    @Column(name = "age_confirmed_at")
    private Instant ageConfirmedAt;

    protected MemberEntity() {
    }

    public MemberEntity(String email, String displayName, String passwordHash) {
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public Instant getAgeConfirmedAt() {
        return ageConfirmedAt;
    }

    public void setAgeConfirmedAt(Instant ageConfirmedAt) {
        this.ageConfirmedAt = ageConfirmedAt;
    }
}
