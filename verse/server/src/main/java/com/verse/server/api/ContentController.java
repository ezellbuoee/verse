package com.verse.server.api;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.verse.server.api.ApiModels.AuthorDetailDto;
import com.verse.server.api.ApiModels.AuthorDto;
import com.verse.server.api.ApiModels.CommentDto;
import com.verse.server.api.ApiModels.DailyDto;
import com.verse.server.api.ApiModels.PageDto;
import com.verse.server.api.ApiModels.PostDto;
import com.verse.server.chat.ChatService;
import com.verse.server.feed.FeedIndex.Entry;
import com.verse.server.post.ReactionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Public reads of the Verse API v1. No login needed (see {@code SecurityConfiguration}). Nothing here exposes an
 * email address or a password hash.
 */
@RestController
@RequestMapping(ApiV1.BASE)
@Tag(name = "Content", description = "Posts, authors and the daily selection. Public.")
public class ContentController {

    private final Catalog catalog;
    private final DailyService daily;
    private final ReactionService reactions;
    private final ChatService chat;

    public ContentController(Catalog catalog, DailyService daily, ReactionService reactions, ChatService chat) {
        this.catalog = catalog;
        this.daily = daily;
        this.reactions = reactions;
        this.chat = chat;
    }

    @GetMapping("/daily")
    @Operation(summary = "The day's selection for the front page",
            description = "Same for everyone, changes every day at midnight UTC.")
    public DailyDto daily() {
        return daily.today();
    }

    @GetMapping("/posts")
    @Operation(summary = "List posts", description = "Newest first unless sort=loved. All filters combine.")
    public PageDto<PostDto> posts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") @Parameter(description = "1-60") int size,
            @RequestParam(defaultValue = "newest") @Parameter(description = "newest | loved") String sort,
            @RequestParam(required = false) @Parameter(description = "POEM | QUOTE") String kind,
            @RequestParam(required = false) String mood,
            @RequestParam(required = false) @Parameter(description = "Author id") String author,
            @RequestParam(required = false) @Parameter(description = "Search words, all must match") String q) {
        return PageDto.of(catalog.posts(kind, mood, author, q, sort).stream().map(PostDto::of).toList(), page,
                size);
    }

    @GetMapping("/posts/{postId}")
    @Operation(summary = "One post")
    public ResponseEntity<PostDto> post(@PathVariable String postId) {
        return catalog.byId(postId)
                .map(e -> ResponseEntity.ok(PostDto.of(e))).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/posts/{postId}/comments")
    @Operation(summary = "Comments of a post, oldest first")
    public PageDto<CommentDto> comments(@PathVariable String postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "60") int size) {
        return PageDto.of(reactions.commentsOf(postId).stream().map(CommentDto::of).toList(), page, size);
    }

    @GetMapping("/authors")
    @Operation(summary = "List authors, most active first")
    public PageDto<AuthorDto> authors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "40") int size,
            @RequestParam(required = false) @Parameter(description = "Part of the name") String q,
            @RequestParam(required = false) @Parameter(description = "classic | member") String kind) {
        List<AuthorDto> list = catalog.authors();
        if ("classic".equalsIgnoreCase(kind)) {
            list = list.stream().filter(AuthorDto::classic).toList();
        } else if ("member".equalsIgnoreCase(kind)) {
            list = list.stream().filter(a -> !a.classic()).toList();
        }
        if (q != null && !q.isBlank()) {
            String needle = q.toLowerCase(Locale.ROOT);
            list = list.stream().filter(a -> a.name().toLowerCase(Locale.ROOT).contains(needle)).toList();
        }
        return PageDto.of(list, page, size);
    }

    @GetMapping("/authors/{authorId}")
    @Operation(summary = "An author's page: who they are and their numbers",
            description = "Their posts are at /posts?author=<id>. Ids starting with classic: are imported authors.")
    public ResponseEntity<AuthorDetailDto> author(@PathVariable String authorId) {
        boolean classic = authorId.startsWith("classic:");
        String name = classic ? null : chat.displayName(authorId).orElse(null);
        List<Entry> posts = catalog.postsOf(authorId, name);
        if (classic && posts.isEmpty() || !classic && name == null) {
            return ResponseEntity.notFound().build();
        }
        String displayName = classic ? posts.get(0).authorName() : name;
        AuthorDto base = catalog.authors(posts).stream().filter(a -> displayName.equals(a.name())).findFirst()
                .orElse(new AuthorDto(authorId, displayName, classic, 0, 0, 0, null, null));
        AuthorDto author = new AuthorDto(authorId, displayName, classic, base.poems(), base.quotes(), base.likes(),
                base.mood(), base.bio());
        Instant since = posts.stream().map(Entry::createdAt).min(Comparator.naturalOrder()).orElse(null);
        PostDto mostLoved = posts.stream().filter(e -> e.likeCount() > 0)
                .max(Comparator.comparingLong(Entry::likeCount).thenComparing(Entry::createdAt))
                .map(PostDto::of).orElse(null);
        return ResponseEntity.ok(new AuthorDetailDto(author, since, Catalog.moodCounts(posts), mostLoved,
                posts.size()));
    }
}
