package com.verse.server.seed;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.verse.server.feed.FeedIndex;
import com.verse.server.member.MemberEntity;
import com.verse.server.member.MemberRepository;
import com.verse.server.member.MemberService;
import com.verse.server.post.PostEntity;
import com.verse.server.post.PostRepository;

import tools.jackson.databind.json.JsonMapper;

/**
 * Startup data: the bootstrap admin (every start), sample members (dev) and the seed posts (only into an empty
 * posts table, so restarts and upgrades never import twice).
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(DataInitializer.class);
    static final String CLASSICS = "seed/classics.json";
    static final String SAMPLES = "seed/samples.json";
    static final String DEV_PASSWORD = "password";

    /** One post of a seed file. */
    record SeedPost(String kind, String title, String body, String source, String mood, String authorName,
            String authorId) {
    }

    private final SeedProperties seed;
    private final BootstrapAdminProperties admin;
    private final MemberService memberService;
    private final MemberRepository members;
    private final PostRepository posts;
    private final FeedIndex index;
    private final TransactionTemplate tx;
    private final JsonMapper json = JsonMapper.builder().build();

    public DataInitializer(SeedProperties seed, BootstrapAdminProperties admin, MemberService memberService,
            MemberRepository members, PostRepository posts, FeedIndex index, TransactionTemplate tx) {
        this.seed = seed;
        this.admin = admin;
        this.memberService = memberService;
        this.members = members;
        this.posts = posts;
        this.index = index;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        if (admin.enabled()) {
            String name = admin.displayName() == null || admin.displayName().isBlank() ? "Admin" : admin.displayName();
            memberService.ensureAdmin(admin.email(), admin.password(), name);
            LOGGER.info("Bootstrap admin {} is ready.", MemberService.normalizeEmail(admin.email()));
        }
        if (seed.devMembers()) {
            devMember("admin@verse.local", "Admin", MemberEntity.ROLE_ADMIN);
            devMember("user1@verse.local", "User One", MemberEntity.ROLE_USER);
            devMember("user2@verse.local", "User Two", MemberEntity.ROLE_USER);
        }
        if (posts.count() == 0) {
            List<SeedPost> all = new ArrayList<>();
            if (seed.classics()) {
                all.addAll(read(CLASSICS));
            }
            if (seed.samples()) {
                all.addAll(read(SAMPLES));
            }
            if (!all.isEmpty()) {
                importPosts(all);
            }
        }
    }

    private void devMember(String email, String name, String role) {
        if (memberService.findByEmail(email).isEmpty()) {
            memberService.signup(email, name, DEV_PASSWORD, true);
            tx.executeWithoutResult(s -> members.findByEmail(email).ifPresent(m -> m.setRole(role)));
            LOGGER.info("Development member {} (password \"{}\") created.", email, DEV_PASSWORD);
        }
    }

    private List<SeedPost> read(String resource) throws IOException {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            return List.of(json.readValue(in, SeedPost[].class));
        }
    }

    /** One second apart, in file order, so "newest first" is stable and the last entry is the newest. */
    private void importPosts(List<SeedPost> all) {
        Instant start = Instant.now().minusSeconds(all.size());
        tx.executeWithoutResult(s -> {
            List<PostEntity> batch = new ArrayList<>(all.size());
            for (int i = 0; i < all.size(); i++) {
                SeedPost p = all.get(i);
                PostEntity post = new PostEntity(p.kind(), p.title(), p.body(), p.source(), p.mood(), p.authorName(),
                        p.authorId());
                post.setCreatedAt(start.plusSeconds(i));
                batch.add(post);
            }
            posts.saveAll(batch);
        });
        index.invalidate();
        LOGGER.info("Imported {} seed posts.", all.size());
    }
}
