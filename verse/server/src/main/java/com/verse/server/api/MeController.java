package com.verse.server.api;

import java.net.URI;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.verse.server.api.ApiModels.CommentDto;
import com.verse.server.api.ApiModels.ConversationDto;
import com.verse.server.api.ApiModels.ConversationSummaryDto;
import com.verse.server.api.ApiModels.ConversationsDto;
import com.verse.server.api.ApiModels.DeletionRequest;
import com.verse.server.api.ApiModels.LikeDto;
import com.verse.server.api.ApiModels.MeDto;
import com.verse.server.api.ApiModels.MessageDto;
import com.verse.server.api.ApiModels.NewCommentRequest;
import com.verse.server.api.ApiModels.NewMessageRequest;
import com.verse.server.api.ApiModels.NewPostRequest;
import com.verse.server.api.ApiModels.NewReportRequest;
import com.verse.server.api.ApiModels.PostDto;
import com.verse.server.api.ApiModels.ProfileUpdateRequest;
import com.verse.server.api.ApiModels.SummaryDto;
import com.verse.server.chat.ChatService;
import com.verse.server.feed.FeedIndex;
import com.verse.server.member.AccountService;
import com.verse.server.member.MemberService.Member;
import com.verse.server.member.ProfileService;
import com.verse.server.moderation.ModerationService;
import com.verse.server.post.PostEntity;
import com.verse.server.post.PostService;
import com.verse.server.post.PostService.Author;
import com.verse.server.post.ReactionService;
import com.verse.server.post.ReactionService.LikeResult;
import com.verse.server.support.CurrentUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Everything the signed-in member does, under {@code /api/v1/me}. The caller is always the subject: the server
 * never takes a member id from the request for a write, so nobody can act as someone else.
 */
@RestController
@RequestMapping(ApiV1.ME)
@PreAuthorize(ApiV1.SIGNED_IN)
@SecurityRequirement(name = "bearer")
@Tag(name = "Me", description = "The signed-in member: profile, posts, hearts, comments, chats, reports, account.")
public class MeController {

    private final PostService posts;
    private final ProfileService profiles;
    private final ReactionService reactions;
    private final ChatService chat;
    private final ModerationService moderation;
    private final AccountService accounts;
    private final FeedIndex index;

    public MeController(PostService posts, ProfileService profiles, ReactionService reactions, ChatService chat,
            ModerationService moderation, AccountService accounts, FeedIndex index) {
        this.posts = posts;
        this.profiles = profiles;
        this.reactions = reactions;
        this.chat = chat;
        this.moderation = moderation;
        this.accounts = accounts;
        this.index = index;
    }

    // ---- profile and account ----

    @GetMapping
    @Operation(summary = "Who am I")
    public MeDto me() {
        Author me = posts.currentAuthor();
        return new MeDto(me.id(), me.name(), CurrentUser.isAdmin(), profiles.bioOf(me.id()));
    }

    @PatchMapping
    @Operation(summary = "Change display name and bio")
    public MeDto updateProfile(@RequestBody ProfileUpdateRequest request) {
        Member saved = profiles.updateMine(request.displayName(), request.bio());
        return new MeDto(saved.id(), saved.displayName(), CurrentUser.isAdmin(),
                saved.bio() == null ? "" : saved.bio());
    }

    @GetMapping("/summary")
    @Operation(summary = "What deleting the account would remove")
    public SummaryDto summary() {
        AccountService.Summary s = accounts.summary();
        return new SummaryDto(s.posts(), s.comments(), s.likes(), s.messages());
    }

    @PostMapping("/deletion")
    @Operation(summary = "Delete my account and everything I wrote", description = "Needs the password again.")
    public ResponseEntity<Void> deleteAccount(@RequestBody DeletionRequest request) {
        accounts.deleteMyAccount(request.password());
        return ResponseEntity.noContent().build();
    }

    // ---- posts ----

    @PostMapping("/posts")
    @Operation(summary = "Publish a post")
    public ResponseEntity<PostDto> createPost(@RequestBody NewPostRequest request) {
        PostEntity created = posts.create(request.kind(), request.title(), request.body(), request.source(),
                request.mood());
        PostDto dto = index.byId(created.getId()).map(PostDto::of).orElse(null);
        return ResponseEntity.created(URI.create(ApiV1.BASE + "/posts/" + created.getId())).body(dto);
    }

    @DeleteMapping("/posts/{postId}")
    @Operation(summary = "Remove one of my posts", description = "Admins may remove any post here as well.")
    public ResponseEntity<Void> removePost(@PathVariable String postId) {
        moderation.removePost(postId);
        return ResponseEntity.noContent().build();
    }

    // ---- hearts ----

    @GetMapping("/likes")
    @Operation(summary = "Ids of the posts I gave a heart")
    public List<String> likes() {
        return reactions.myLikes();
    }

    @PutMapping("/likes/{postId}")
    @Operation(summary = "Give a heart")
    public LikeDto like(@PathVariable String postId) {
        return setLike(postId, true);
    }

    @DeleteMapping("/likes/{postId}")
    @Operation(summary = "Take the heart back")
    public LikeDto unlike(@PathVariable String postId) {
        return setLike(postId, false);
    }

    private LikeDto setLike(String postId, boolean wanted) {
        boolean has = reactions.myLikes().contains(postId);
        if (has == wanted) {
            long count = index.byId(postId).map(e -> e.likeCount()).orElse(0L);
            return new LikeDto(has, count);
        }
        LikeResult r = reactions.toggleLike(postId);
        return new LikeDto(r.liked(), r.likeCount());
    }

    // ---- comments and reports ----

    @PostMapping("/comments")
    @Operation(summary = "Comment on a post")
    public ResponseEntity<CommentDto> comment(@RequestBody NewCommentRequest request) {
        CommentDto dto = CommentDto.of(reactions.addComment(request.postId(), request.body()));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/reports")
    @Operation(summary = "Report a post to the admins")
    public ResponseEntity<Void> report(@RequestBody NewReportRequest request) {
        moderation.report(request.postId(), request.reason());
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    // ---- chats ----

    @GetMapping("/conversations")
    @Operation(summary = "My chats, newest first, with the unread total")
    public ConversationsDto conversations() {
        return new ConversationsDto(chat.unreadTotal(),
                chat.conversations().stream().map(ConversationSummaryDto::of).toList());
    }

    @GetMapping("/conversations/{memberId}")
    @Operation(summary = "The chat with one member", description = "Reading marks their messages as read.")
    public ConversationDto conversation(@PathVariable String memberId) {
        return new ConversationDto(memberId, chat.displayName(memberId).orElse("Former member"),
                chat.conversation(memberId).stream().map(MessageDto::of).toList());
    }

    @PostMapping("/conversations/{memberId}/messages")
    @Operation(summary = "Send a message")
    public ResponseEntity<MessageDto> send(@PathVariable String memberId, @RequestBody NewMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(MessageDto.of(chat.send(memberId, request.body())));
    }
}
