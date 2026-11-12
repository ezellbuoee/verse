package com.verse.server;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** The API v1 end to end against an in-memory database: join, sign in, write, react, chat, moderate. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VerseApiTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private MockMvc mvc;

    // ---- helpers ----

    private record Account(String id, String email, String token) {
    }

    private Account join(String name) throws Exception {
        String email = name.toLowerCase().replace(' ', '.') + "." + UUID.randomUUID().toString().substring(0, 8)
                + "@verse.test";
        JsonNode created = read(mvc.perform(json(post("/api/v1/signup"),
                Map.of("email", email, "displayName", name, "password", "long-enough", "over18", true)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return new Account(created.get("id").asString(), email, login(email, "long-enough"));
    }

    private String login(String email, String password) throws Exception {
        String body = mvc.perform(json(post("/api/v1/auth/login"), Map.of("email", email, "password", password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn().getResponse().getContentAsString();
        return read(body).get("accessToken").asString();
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, Object body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
    }

    private static MockHttpServletRequestBuilder as(Account who, MockHttpServletRequestBuilder request) {
        return request.header("Authorization", "Bearer " + who.token());
    }

    private static JsonNode read(String body) {
        return JSON.readTree(body);
    }

    private String publish(Account who, String title) throws Exception {
        String body = mvc.perform(as(who, json(post("/api/v1/me/posts"),
                Map.of("kind", "POEM", "title", title, "body", "Line one\nLine two", "mood", "JOY"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(title))
                .andReturn().getResponse().getContentAsString();
        return read(body).get("id").asString();
    }

    // ---- public reads ----

    @Test
    void visitorsReadWithoutAnAccount() throws Exception {
        mvc.perform(get("/api/v1/daily")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.posts").value(greaterThanOrEqualTo(8)));
        mvc.perform(get("/api/v1/posts?size=5")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.hasMore").value(true));
        mvc.perform(get("/api/v1/authors")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/posts/does-not-exist")).andExpect(status().isNotFound());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void memberPathsNeedATokenAndAdminPathsTheAdminRole() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Please sign in."));
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());
        Account ada = join("Ada");
        mvc.perform(as(ada, get("/api/v1/admin/reports"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/nothing-here")).andExpect(status().isUnauthorized());
    }

    // ---- joining and signing in ----

    @Test
    void signupRulesAndSignIn() throws Exception {
        mvc.perform(json(post("/api/v1/signup"),
                Map.of("email", "kid@verse.test", "displayName", "Kid", "password", "long-enough", "over18", false)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("Verse is for people aged 18 and over."));
        Account ada = join("Ada Lovelace");
        mvc.perform(json(post("/api/v1/signup"),
                Map.of("email", ada.email().toUpperCase(), "displayName", "Again", "password", "long-enough",
                        "over18", true)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value(containsString("already an account")));
        mvc.perform(json(post("/api/v1/auth/login"), Map.of("email", ada.email(), "password", "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(containsString("did not match")));
        mvc.perform(as(ada, get("/api/v1/me"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ada.id()))
                .andExpect(jsonPath("$.name").value("Ada Lovelace"))
                .andExpect(jsonPath("$.admin").value(false));
    }

    // ---- writing and reacting ----

    @Test
    void publishLikeCommentAndRename() throws Exception {
        Account ada = join("Ada");
        Account ben = join("Ben");
        String postId = publish(ada, "Morning");

        mvc.perform(get("/api/v1/posts/" + postId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.authorName").value("Ada"));
        mvc.perform(get("/api/v1/posts?author=" + ada.id())).andExpect(jsonPath("$.total").value(1));

        mvc.perform(as(ben, put("/api/v1/me/likes/" + postId))).andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true)).andExpect(jsonPath("$.likeCount").value(1));
        // giving a heart twice keeps one heart
        mvc.perform(as(ben, put("/api/v1/me/likes/" + postId)))
                .andExpect(jsonPath("$.liked").value(true)).andExpect(jsonPath("$.likeCount").value(1));
        mvc.perform(as(ben, get("/api/v1/me/likes"))).andExpect(jsonPath("$", hasItem(postId)));

        mvc.perform(as(ben, json(post("/api/v1/me/comments"), Map.of("postId", postId, "body", "Lovely."))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.authorName").value("Ben"));
        mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(jsonPath("$.items[0].body").value("Lovely."));
        mvc.perform(get("/api/v1/posts/" + postId))
                .andExpect(jsonPath("$.likeCount").value(1)).andExpect(jsonPath("$.commentCount").value(1));

        mvc.perform(as(ben, delete("/api/v1/me/likes/" + postId)))
                .andExpect(jsonPath("$.liked").value(false)).andExpect(jsonPath("$.likeCount").value(0));

        // a new name is carried to posts and comments
        mvc.perform(as(ben, json(patch("/api/v1/me"), Map.of("displayName", "Benjamin", "bio", "Reads at night."))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Benjamin"))
                .andExpect(jsonPath("$.bio").value("Reads at night."));
        mvc.perform(get("/api/v1/posts/" + postId + "/comments"))
                .andExpect(jsonPath("$.items[0].authorName").value("Benjamin"));
        mvc.perform(get("/api/v1/authors/" + ada.id())).andExpect(status().isOk())
                .andExpect(jsonPath("$.author.name").value("Ada")).andExpect(jsonPath("$.total").value(1));

        // only the author (or an admin) removes a post
        mvc.perform(as(ben, delete("/api/v1/me/posts/" + postId))).andExpect(status().isForbidden());
        mvc.perform(as(ada, delete("/api/v1/me/posts/" + postId))).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/posts/" + postId)).andExpect(status().isNotFound());
    }

    @Test
    void postRules() throws Exception {
        Account ada = join("Ada");
        mvc.perform(as(ada, json(post("/api/v1/me/posts"), Map.of("kind", "QUOTE", "body", "x".repeat(301)))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value(containsString("at most 300 characters")));
        mvc.perform(as(ada, json(post("/api/v1/me/posts"), Map.of("kind", "NOVEL", "body", "text"))))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(as(ada, post("/api/v1/me/posts").contentType(MediaType.APPLICATION_JSON).content("{nope")))
                .andExpect(status().isBadRequest());
    }

    // ---- chats ----

    @Test
    void chatBetweenTwoMembers() throws Exception {
        Account ada = join("Ada");
        Account ben = join("Ben");
        mvc.perform(as(ada, json(post("/api/v1/me/conversations/" + ben.id() + "/messages"), Map.of("body", "Hi Ben"))))
                .andExpect(status().isCreated());
        mvc.perform(as(ben, get("/api/v1/me/conversations")))
                .andExpect(jsonPath("$.unread").value(1))
                .andExpect(jsonPath("$.items[0].otherName").value("Ada"));
        mvc.perform(as(ben, get("/api/v1/me/conversations/" + ada.id())))
                .andExpect(jsonPath("$.items[0].body").value("Hi Ben"));
        mvc.perform(as(ben, get("/api/v1/me/conversations"))).andExpect(jsonPath("$.unread").value(0));
        mvc.perform(as(ada, json(post("/api/v1/me/conversations/classic:shakespeare/messages"), Map.of("body", "Hi"))))
                .andExpect(status().isUnprocessableContent());
    }

    // ---- moderation and members ----

    @Test
    void reportDismissRemoveAndManageMembers() throws Exception {
        Account boss = new Account(null, "boss@verse.test", login("boss@verse.test", "boss-password"));
        mvc.perform(as(boss, get("/api/v1/me"))).andExpect(jsonPath("$.admin").value(true));

        Account ada = join("Ada");
        Account ben = join("Ben");
        String postId = publish(ada, "Reported");
        mvc.perform(as(ada, json(post("/api/v1/me/reports"), Map.of("postId", postId))))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(as(ben, json(post("/api/v1/me/reports"), Map.of("postId", postId, "reason", "spam"))))
                .andExpect(status().isAccepted());
        mvc.perform(as(ben, json(post("/api/v1/me/reports"), Map.of("postId", postId))))
                .andExpect(status().isUnprocessableContent());

        JsonNode reports = read(mvc.perform(as(boss, get("/api/v1/admin/reports"))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        JsonNode report = null;
        for (JsonNode r : reports.get("items")) {
            if (postId.equals(r.get("postId").asString())) {
                report = r;
            }
        }
        assertThat(report).isNotNull();
        assertThat(report.get("post").get("title").asString()).isEqualTo("Reported");
        mvc.perform(as(boss, post("/api/v1/admin/reports/" + report.get("id").asString() + "/dismiss")))
                .andExpect(status().isNoContent());
        mvc.perform(as(boss, delete("/api/v1/admin/posts/" + postId))).andExpect(status().isNoContent());

        // promote, then suspend: the suspended member's token stops working at once
        mvc.perform(as(boss, get("/api/v1/admin/members?q=" + ben.email()))).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].status").value("ACTIVE"));
        mvc.perform(as(boss, json(patch("/api/v1/admin/members/" + ben.id()), Map.of("role", "admin"))))
                .andExpect(jsonPath("$.role").value("admin"));
        mvc.perform(as(ben, get("/api/v1/admin/reports"))).andExpect(status().isOk());
        mvc.perform(as(boss, json(patch("/api/v1/admin/members/" + ben.id()), Map.of("status", "SUSPENDED"))))
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
        mvc.perform(as(ben, get("/api/v1/me"))).andExpect(status().isUnauthorized());
        mvc.perform(json(post("/api/v1/auth/login"), Map.of("email", ben.email(), "password", "long-enough")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(containsString("suspended")));

        String bossId = read(mvc.perform(as(boss, get("/api/v1/me"))).andReturn().getResponse().getContentAsString())
                .get("id").asString();
        mvc.perform(as(boss, json(patch("/api/v1/admin/members/" + bossId), Map.of("role", "user"))))
                .andExpect(status().isUnprocessableContent());
    }

    // ---- account deletion ----

    @Test
    void deletingAnAccountRemovesEverything() throws Exception {
        Account ada = join("Ada");
        Account ben = join("Ben");
        String adasPost = publish(ada, "Mine");
        String bensPost = publish(ben, "Ben's");
        mvc.perform(as(ada, put("/api/v1/me/likes/" + bensPost)));
        mvc.perform(as(ada, json(post("/api/v1/me/comments"), Map.of("postId", bensPost, "body", "Nice"))));
        mvc.perform(as(ada, json(post("/api/v1/me/conversations/" + ben.id() + "/messages"), Map.of("body", "Hey"))));

        mvc.perform(as(ada, get("/api/v1/me/summary")))
                .andExpect(jsonPath("$.posts").value(1)).andExpect(jsonPath("$.comments").value(1))
                .andExpect(jsonPath("$.likes").value(1)).andExpect(jsonPath("$.messages").value(1));
        mvc.perform(as(ada, json(post("/api/v1/me/deletion"), Map.of("password", "wrong"))))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(as(ada, json(post("/api/v1/me/deletion"), Map.of("password", "long-enough"))))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/posts/" + adasPost)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/posts/" + bensPost))
                .andExpect(jsonPath("$.likeCount").value(0)).andExpect(jsonPath("$.commentCount").value(0));
        mvc.perform(as(ben, get("/api/v1/me/conversations"))).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(as(ada, get("/api/v1/me"))).andExpect(status().isUnauthorized());
        mvc.perform(json(post("/api/v1/auth/login"), Map.of("email", ada.email(), "password", "long-enough")))
                .andExpect(status().isUnauthorized());
    }
}
