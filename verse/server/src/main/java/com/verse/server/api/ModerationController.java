package com.verse.server.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.verse.server.api.ApiModels.MemberAdminDto;
import com.verse.server.api.ApiModels.MemberChangeRequest;
import com.verse.server.api.ApiModels.PageDto;
import com.verse.server.api.ApiModels.ReportDto;
import com.verse.server.member.MemberService;
import com.verse.server.moderation.ModerationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Moderation and member management, under {@code /api/v1/admin}. Needs the admin role. */
@RestController
@RequestMapping(ApiV1.ADMIN)
@PreAuthorize(ApiV1.IS_ADMIN)
@SecurityRequirement(name = "bearer")
@Tag(name = "Admin", description = "Reports, removals and members. Admin role required.")
public class ModerationController {

    private final ModerationService moderation;
    private final MemberService members;

    public ModerationController(ModerationService moderation, MemberService members) {
        this.moderation = moderation;
        this.members = members;
    }

    @GetMapping("/reports")
    @Operation(summary = "Open reports, newest first")
    public PageDto<ReportDto> reports(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "60") int size) {
        return PageDto.of(moderation.openReports().stream().map(ReportDto::of).toList(), page, size);
    }

    @PostMapping("/reports/{reportId}/dismiss")
    @Operation(summary = "Dismiss a report, the post stays")
    public ResponseEntity<Void> dismiss(@PathVariable String reportId) {
        moderation.dismiss(reportId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/posts/{postId}")
    @Operation(summary = "Remove any post with its hearts, comments and reports")
    public ResponseEntity<Void> removePost(@PathVariable String postId) {
        moderation.removePost(postId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/members")
    @Operation(summary = "Members, newest first", description = "q matches part of the email or display name.")
    public PageDto<MemberAdminDto> members(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "60") int size, @RequestParam(required = false) String q) {
        return PageDto.of(members.list(q).stream().map(MemberAdminDto::of).toList(), page, size);
    }

    @PatchMapping("/members/{memberId}")
    @Operation(summary = "Change a member's role or status",
            description = "Suspended members cannot sign in and their tokens stop working at once.")
    public MemberAdminDto changeMember(@PathVariable String memberId, @RequestBody MemberChangeRequest request) {
        return MemberAdminDto.of(members.change(memberId, request.role(), request.status()));
    }
}
