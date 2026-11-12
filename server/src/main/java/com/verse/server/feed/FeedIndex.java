package com.verse.server.feed;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.verse.server.post.PostEntity;
import com.verse.server.post.PostRepository;

/**
 * In-memory read model of all posts, newest first, so thousands of poems stay cheap to page, sort and search.
 * Every write bumps the one-row {@code feed_version} counter in its transaction (see {@link #invalidate()}); every
 * read compares it with the version of the cached view (a primary-key read) and rebuilds when it moved. So with
 * several server replicas, each one sees the others' changes as soon as they are committed.
 */
@Component
public class FeedIndex {

    public record Entry(String id, String kind, String title, String body, String source, String mood,
            String authorName,
            String authorId, long likeCount, long commentCount, Instant createdAt, String searchText) {
        public Map<String, Object> toJson() {
            Map<String, Object> json = new LinkedHashMap<>();
            json.put("id", id);
            json.put("kind", kind);
            json.put("title", title);
            json.put("body", body);
            json.put("source", source);
            json.put("mood", mood);
            json.put("authorName", authorName);
            json.put("authorId", authorId);
            json.put("likeCount", likeCount);
            json.put("commentCount", commentCount);
            json.put("createdAt", createdAt.toString());
            return json;
        }
    }

    private record Snapshot(List<Entry> entries, long version) {
    }

    private final PostRepository repository;
    private final JdbcTemplate jdbc;
    private final AtomicReference<Snapshot> snapshot = new AtomicReference<>();

    public FeedIndex(PostRepository repository, JdbcTemplate jdbc) {
        this.repository = repository;
        this.jdbc = jdbc;
    }

    /**
     * Marks the posts as changed: bumps the shared version (inside the caller's transaction, so other replicas see
     * it with the commit) and forgets this replica's view. Called after every write to posts, likes and comments.
     * Inside a transaction it forgets again after the commit, so a read during the transaction cannot keep the old
     * state alive.
     */
    public void invalidate() {
        jdbc.update("update feed_version set version = version + 1 where id = 1");
        snapshot.set(null);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    snapshot.set(null);
                }
            });
        }
    }

    public List<Entry> all() {
        Snapshot s = snapshot.get();
        long version = currentVersion();
        if (s != null && s.version() == version) {
            // unchanged: the same list (DailyService caches on its identity)
            return s.entries();
        }
        // version read before loading: a write in between only causes one more rebuild, never a stale view
        s = new Snapshot(load(), version);
        snapshot.set(s);
        return s.entries();
    }

    public Optional<Entry> byId(String id) {
        return all().stream().filter(e -> e.id().equals(id)).findFirst();
    }

    private long currentVersion() {
        Long v = jdbc.queryForObject("select version from feed_version where id = 1", Long.class);
        return v == null ? 0 : v;
    }

    private List<Entry> load() {
        return repository.findAll().stream().map(FeedIndex::toEntry)
                .sorted(Comparator.comparing(Entry::createdAt).reversed()).toList();
    }

    static Entry toEntry(PostEntity p) {
        String title = p.getTitle();
        String body = p.getBody();
        String author = p.getAuthorName();
        String search = ((title == null ? "" : title) + "\n" + (body == null ? "" : body) + "\n"
                + (author == null ? "" : author)).toLowerCase(Locale.ROOT);
        return new Entry(p.getId(), p.getKind(), title, body, p.getSource(), p.getMood(), author, p.getAuthorId(),
                p.getLikeCount(), p.getCommentCount(), p.getCreatedAt(), search);
    }
}
