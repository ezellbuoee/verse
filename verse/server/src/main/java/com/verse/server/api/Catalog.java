package com.verse.server.api;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.stereotype.Component;

import com.verse.server.api.ApiModels.AuthorDto;
import com.verse.server.api.ApiModels.MoodCountDto;
import com.verse.server.feed.FeedIndex;
import com.verse.server.feed.FeedIndex.Entry;
import com.verse.server.member.MemberService;

/** Read-side queries over the in-memory index: filtering, searching, authors, moods. Used by the controllers. */
@Component
public class Catalog {

    private final FeedIndex index;
    private final MemberService members;

    public Catalog(FeedIndex index, MemberService members) {
        this.index = index;
        this.members = members;
    }

    public List<Entry> all() {
        return index.all();
    }

    public Optional<Entry> byId(String id) {
        return index.byId(id);
    }

    /** Ids that have an author page: members (uuid) and imported authors ("classic:"). */
    public static boolean hasPage(String id) {
        return id != null && (id.contains("-") || id.startsWith("classic:"));
    }

    /** Posts filtered by kind, mood, author id and search words (all words must appear in title, text or author). */
    public List<Entry> posts(String kind, String mood, String author, String q, String sort) {
        Stream<Entry> s = index.all().stream();
        if (kind != null && !kind.isBlank()) {
            s = s.filter(e -> kind.equalsIgnoreCase(e.kind()));
        }
        if (mood != null && !mood.isBlank()) {
            s = s.filter(e -> mood.equalsIgnoreCase(e.mood()));
        }
        if (author != null && !author.isBlank()) {
            s = s.filter(e -> author.equals(e.authorId()));
        }
        if (q != null && !q.isBlank()) {
            List<String> words = Stream.of(q.toLowerCase(Locale.ROOT).split("\\s+")).filter(w -> !w.isBlank())
                    .toList();
            s = s.filter(e -> words.stream().allMatch(w -> e.searchText().contains(w)));
        }
        List<Entry> list = s.toList();
        if ("loved".equalsIgnoreCase(sort)) {
            list = list.stream().sorted(Comparator.comparingLong(Entry::likeCount).reversed()
                    .thenComparing(Comparator.comparing(Entry::createdAt).reversed())).toList();
        }
        return list;
    }

    /** Posts of one author: by id, or by name for posts filed under a name only. */
    public List<Entry> postsOf(String authorId, String name) {
        return index.all().stream()
                .filter(e -> authorId.equals(e.authorId())
                        || (name != null && name.equals(e.authorName()) && !hasPage(e.authorId())))
                .toList();
    }

    /** Moods with counts, most frequent first. */
    public static List<MoodCountDto> moodCounts(List<Entry> entries) {
        Map<String, Long> moods = new LinkedHashMap<>();
        entries.stream().filter(e -> e.mood() != null).forEach(e -> moods.merge(e.mood(), 1L, Long::sum));
        return moods.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(en -> new MoodCountDto(en.getKey(), en.getValue())).toList();
    }

    /** All authors, most active first. */
    public List<AuthorDto> authors() {
        return authors(index.all());
    }

    public List<AuthorDto> authors(List<Entry> all) {
        Map<String, long[]> counts = new LinkedHashMap<>(); // poems, quotes, likes
        Map<String, String> ids = new LinkedHashMap<>();
        Map<String, Map<String, Long>> moods = new LinkedHashMap<>();
        for (Entry e : all) {
            long[] c = counts.computeIfAbsent(e.authorName(), n -> new long[3]);
            c["QUOTE".equals(e.kind()) ? 1 : 0]++;
            c[2] += e.likeCount();
            if (!ids.containsKey(e.authorName()) && hasPage(e.authorId())) {
                ids.put(e.authorName(), e.authorId());
            }
            if (e.mood() != null) {
                moods.computeIfAbsent(e.authorName(), n -> new LinkedHashMap<>()).merge(e.mood(), 1L, Long::sum);
            }
        }
        List<AuthorDto> list = new ArrayList<>();
        counts.forEach((name, c) -> {
            String id = ids.get(name);
            boolean classic = id != null && id.startsWith("classic:");
            String mood = moods.getOrDefault(name, Map.of()).entrySet().stream().max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey).orElse(null);
            list.add(new AuthorDto(id, name, classic, c[0], c[1], c[2], mood, bioOf(id, all)));
        });
        list.sort(Comparator.comparingLong((AuthorDto a) -> a.poems() + a.quotes()).reversed()
                .thenComparing(Comparator.comparingLong(AuthorDto::likes).reversed()));
        return list;
    }

    private String bioOf(String id, List<Entry> all) {
        if (id == null) {
            return null;
        }
        if (id.startsWith("classic:")) {
            return all.stream().filter(e -> id.equals(e.authorId())).map(Entry::source).filter(s -> s != null)
                    .findFirst().orElse(null);
        }
        return members.byId(id).map(m -> m.bio()).orElse(null);
    }
}
