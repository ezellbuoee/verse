package com.verse.server.moderation;

import com.verse.server.support.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "reports")
public class ReportEntity extends BaseEntity {

    public static final String OPEN = "OPEN";
    public static final String REMOVED = "REMOVED";
    public static final String DISMISSED = "DISMISSED";

    @Column(name = "post_id", nullable = false)
    private String postId;

    @Column(name = "reporter_id", nullable = false)
    private String reporterId;

    @Column(name = "reporter_name", nullable = false)
    private String reporterName;

    private String reason;

    @Column(nullable = false)
    private String status = OPEN;

    protected ReportEntity() {
    }

    public ReportEntity(String postId, String reporterId, String reporterName, String reason) {
        this.postId = postId;
        this.reporterId = reporterId;
        this.reporterName = reporterName;
        this.reason = reason;
    }

    public String getPostId() {
        return postId;
    }

    public String getReporterId() {
        return reporterId;
    }

    public String getReporterName() {
        return reporterName;
    }

    public String getReason() {
        return reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
