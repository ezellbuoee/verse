package com.verse.server.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.stereotype.Service;

import com.verse.server.api.ApiModels.AuthorDto;
import com.verse.server.api.ApiModels.DailyDto;
import com.verse.server.api.ApiModels.MoodCountDto;
import com.verse.server.api.ApiModels.PostDto;
import com.verse.server.api.ApiModels.TotalsDto;
import com.verse.server.feed.FeedIndex.Entry;

/**
 * The day's selection. Everything is chosen deterministically from the date (UTC) and the content, so every
 * visitor sees the same front page and it changes by itself every morning, without an editor:
 * <ul>
 * <li>top post: the best-rated recent posts rotate daily (score = 3·hearts + 2·comments + 2 if new this week)</li>
 * <li>quote: one of the seven most-loved quotes, rotating</li>
 * <li>author of the day: an author with at least three pieces, rotating</li>
 * <li>mood of the day: one of the moods in use, rotating</li>
 * <li>selection: six posts by six different authors, preferring the mood of the day, shuffled with the date as
 * seed</li>
 * </ul>
 * The result is cached per day and recomputed when the content changes.
 */
@Service
public class DailyService {

    static final int SELECTION = 6;
    static final int FRESH = 5;
    static final int MOST_LOVED = 6;
    static final int AUTHORS = 8;
    static final int MIN_PIECES_FOR_AUTHOR_OF_THE_DAY = 3;

    private record Cached(String date, List<Entry> basis, DailyDto daily) {
    }

    private final Catalog catalog;
    private final AtomicReference<Cached> cache = new AtomicReference<>();

    public DailyService(Catalog catalog) {
        this.catalog = catalog;
    }

    public DailyDto today() {
        LocalDate date = LocalDate.now(ZoneOffset.UTC);
        List<Entry> all = catalog.all();
        Cached c = cache.get();
        if (c != null && c.date().equals(date.toString()) && c.basis() == all) {
            return c.daily();
        }
        DailyDto daily = compute(date, all);
        cache.set(new Cached(date.toString(), all, daily));
        return daily;
    }

    DailyDto compute(LocalDate date, List<Entry> all) {
        long day = date.toEpochDay();
        List<Entry> poems = all.stream().filter(e -> "POEM".equals(e.kind())).toList();
        List<Entry> quotes = all.stream().filter(e -> "QUOTE".equals(e.kind())).toList();
        List<AuthorDto> authors = catalog.authors(all);
        List<MoodCountDto> moods = Catalog.moodCounts(all);

        Entry top = topOfTheDay(poems, day);
        Entry quote = rotate(quotes.stream().sorted(Comparator.comparingLong(Entry::likeCount).reversed()
                .thenComparing(Comparator.comparing(Entry::createdAt).reversed())).limit(7).toList(), day);
        String mood = moods.isEmpty() ? null : moods.get((int) (day % moods.size())).mood();
        List<AuthorDto> eligible = authors.stream().filter(a -> a.id() != null)
                .filter(a -> a.poems() + a.quotes() >= MIN_PIECES_FOR_AUTHOR_OF_THE_DAY)
                .sorted(Comparator.comparing(AuthorDto::name)).toList();
        AuthorDto author = rotate(eligible, day);

        List<PostDto> selection = selection(poems, mood, top, day);
        List<PostDto> fresh = poems.stream().filter(e -> top == null || !e.id().equals(top.id())).limit(FRESH)
                .map(PostDto::of).toList();
        List<PostDto> loved = all.stream().filter(e -> e.likeCount() > 0)
                .sorted(Comparator.comparingLong(Entry::likeCount).reversed()
                        .thenComparing(Comparator.comparing(Entry::createdAt).reversed()))
                .limit(MOST_LOVED).map(PostDto::of).toList();
        TotalsDto totals = new TotalsDto(all.size(), poems.size(), quotes.size(), authors.size());
        return new DailyDto(date.toString(), top == null ? null : PostDto.of(top),
                quote == null ? null : PostDto.of(quote), author, mood, selection, fresh, loved, moods,
                authors.stream().limit(AUTHORS).toList(), totals);
    }

    /** Six posts, six authors, mood of the day first, in an order that is fixed for the day. */
    private static List<PostDto> selection(List<Entry> poems, String mood, Entry top, long day) {
        Random random = new Random(day * 31L + 7);
        List<Entry> pool = new ArrayList<>(poems);
        java.util.Collections.shuffle(pool, random);
        List<Entry> preferred = pool.stream().filter(e -> mood != null && mood.equals(e.mood())).toList();
        List<Entry> picked = new ArrayList<>();
        Set<String> authors = new HashSet<>();
        if (top != null) {
            authors.add(top.authorName());
        }
        for (List<Entry> candidates : List.of(preferred, pool)) {
            for (Entry e : candidates) {
                if (picked.size() >= SELECTION) {
                    break;
                }
                if (authors.add(e.authorName()) && (top == null || !e.id().equals(top.id()))) {
                    picked.add(e);
                }
            }
        }
        return picked.stream().map(PostDto::of).toList();
    }

    static Entry topOfTheDay(List<Entry> poems, long day) {
        if (poems.isEmpty()) {
            return null;
        }
        Instant weekAgo = Instant.now().minusSeconds(7 * 86400);
        List<Entry> ranked = poems.stream()
                .sorted(Comparator.comparingDouble((Entry e) -> score(e, weekAgo)).reversed()
                        .thenComparing(Comparator.comparing(Entry::createdAt).reversed()))
                .limit(10).toList();
        return rotate(ranked, day);
    }

    /** Daily score: hearts weigh most, comments next, a bonus for being new this week. */
    static double score(Entry e, Instant weekAgo) {
        return e.likeCount() * 3.0 + e.commentCount() * 2.0 + (e.createdAt().isAfter(weekAgo) ? 2.0 : 0.0);
    }

    private static <T> T rotate(List<T> list, long day) {
        return list.isEmpty() ? null : list.get((int) Math.floorMod(day, list.size()));
    }
}
