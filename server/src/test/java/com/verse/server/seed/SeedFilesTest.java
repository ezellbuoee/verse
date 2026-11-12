package com.verse.server.seed;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import com.verse.server.seed.DataInitializer.SeedPost;

import tools.jackson.databind.json.JsonMapper;

/** The seed files parse and fit the schema (lengths, kinds, moods). */
class SeedFilesTest {

    private static final Set<String> MOODS = Set.of("LOVE", "GRIEF", "JOY", "NATURE", "HOPE", "NIGHT");

    @Test
    void classicsAndSamplesAreValid() throws Exception {
        for (String file : List.of(DataInitializer.CLASSICS, DataInitializer.SAMPLES)) {
            List<SeedPost> posts;
            try (InputStream in = new ClassPathResource(file).getInputStream()) {
                posts = List.of(JsonMapper.builder().build().readValue(in, SeedPost[].class));
            }
            assertThat(posts).as(file).isNotEmpty();
            for (SeedPost p : posts) {
                assertThat(p.kind()).isIn("POEM", "QUOTE");
                assertThat(p.body()).isNotBlank().hasSizeLessThanOrEqualTo(10000);
                assertThat(p.authorName()).isNotBlank().hasSizeLessThanOrEqualTo(120);
                if (p.mood() != null) {
                    assertThat(p.mood()).isIn(MOODS);
                }
                if (p.title() != null) {
                    assertThat(p.title()).hasSizeLessThanOrEqualTo(200);
                }
                if (p.source() != null) {
                    assertThat(p.source()).hasSizeLessThanOrEqualTo(500);
                }
            }
        }
    }
}
