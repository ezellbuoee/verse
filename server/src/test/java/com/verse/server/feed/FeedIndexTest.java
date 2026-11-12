package com.verse.server.feed;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.verse.server.post.PostEntity;
import com.verse.server.post.PostRepository;

/** A change made by another replica (a new row plus a version bump, no local invalidate) shows up at once. */
@SpringBootTest
@ActiveProfiles("test")
class FeedIndexTest {

    @Autowired
    private FeedIndex index;
    @Autowired
    private PostRepository posts;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void seesChangesOfOtherReplicas() {
        int before = index.all().size();
        PostEntity post = posts.save(new PostEntity("POEM", "Elsewhere", "Written on replica two.", null, null,
                "Someone", null));
        jdbc.update("update feed_version set version = version + 1 where id = 1");

        assertThat(index.byId(post.getId())).isPresent();
        assertThat(index.all()).hasSize(before + 1);

        // and nothing changes while the version stands still
        assertThat(index.all()).isSameAs(index.all());
    }
}
