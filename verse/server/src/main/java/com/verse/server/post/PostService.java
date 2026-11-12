package com.verse.server.post;

import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.feed.FeedIndex;
import com.verse.server.security.MemberPrincipal;
import com.verse.server.support.CurrentUser;

/** Posts (poems and quotes): creation rules. */
@Service
public class PostService {

    public static final String POEM = "POEM";
    public static final String QUOTE = "QUOTE";
    static final Set<String> KINDS = Set.of(POEM, QUOTE);
    static final Set<String> MOODS = Set.of("LOVE", "GRIEF", "JOY", "NATURE", "HOPE", "NIGHT");
    static final int MAX_TITLE = 120;
    static final int MAX_BODY = 5000;
    static final int MAX_QUOTE = 300;

    public static class PostException extends RuntimeException {
        public PostException(String message) {
            super(message);
        }
    }

    /** Who is writing: the signed-in member. */
    public record Author(String id, String name) {
    }

    private final PostRepository repository;
    private final FeedIndex index;

    public PostService(PostRepository repository, FeedIndex index) {
        this.repository = repository;
        this.index = index;
    }

    public Author currentAuthor() {
        MemberPrincipal me = CurrentUser.require();
        return new Author(me.id(), me.displayName());
    }

    @Transactional
    public PostEntity create(String kind, String title, String body, String source, String mood) {
        Author author = currentAuthor();
        String k = kind == null ? "" : kind.trim().toUpperCase();
        if (!KINDS.contains(k)) {
            throw new PostException("Please choose Poem or Quote.");
        }
        String text = body == null ? "" : body.strip();
        if (text.isEmpty()) {
            throw new PostException(k.equals(QUOTE) ? "Please write the quote." : "Please write the poem.");
        }
        if (k.equals(QUOTE) && text.length() > MAX_QUOTE) {
            throw new PostException("A quote can have at most 300 characters. Post it as a poem instead?");
        }
        if (text.length() > MAX_BODY) {
            throw new PostException("A poem can have at most 5000 characters.");
        }
        String t = blankToNull(title);
        if (t != null && t.length() > MAX_TITLE) {
            throw new PostException("The title can have at most 120 characters.");
        }
        String m = blankToNull(mood);
        if (m != null && !MOODS.contains(m.toUpperCase())) {
            throw new PostException("Unknown mood.");
        }
        PostEntity post = new PostEntity(k, k.equals(POEM) ? t : null, text,
                k.equals(QUOTE) ? blankToNull(source) : null, m == null ? null : m.toUpperCase(), author.name(),
                author.id());
        PostEntity created = repository.save(post);
        index.invalidate();
        return created;
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.strip();
        return t.isEmpty() ? null : t;
    }
}
