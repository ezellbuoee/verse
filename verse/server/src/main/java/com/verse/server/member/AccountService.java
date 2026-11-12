package com.verse.server.member;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.chat.ChatService;
import com.verse.server.feed.FeedIndex;
import com.verse.server.moderation.ModerationService;
import com.verse.server.post.PostRepository;
import com.verse.server.post.PostService;
import com.verse.server.post.PostService.Author;
import com.verse.server.post.PostService.PostException;
import com.verse.server.post.ReactionService;
import com.verse.server.post.ReactionService.Given;

/** "Delete my account": removes the member and everything they wrote. Irreversible. */
@Service
public class AccountService {

    private final MemberService members;
    private final PostService posts;
    private final PostRepository postRepository;
    private final ReactionService reactions;
    private final ChatService chat;
    private final ModerationService moderation;
    private final FeedIndex index;

    public AccountService(MemberService members, PostService posts, PostRepository postRepository,
            ReactionService reactions, ChatService chat, ModerationService moderation, FeedIndex index) {
        this.members = members;
        this.posts = posts;
        this.postRepository = postRepository;
        this.reactions = reactions;
        this.chat = chat;
        this.moderation = moderation;
        this.index = index;
    }

    public record Summary(int posts, int comments, int likes, int messages) {
    }

    /** What would be deleted, for the confirmation screen. */
    public Summary summary() {
        Author me = posts.currentAuthor();
        Given given = reactions.givenBy(me.id());
        return new Summary((int) postRepository.countByAuthorId(me.id()), (int) given.comments(),
                (int) given.likes(), (int) chat.countInvolving(me.id()));
    }

    @Transactional
    public void deleteMyAccount(String password) {
        Author me = posts.currentAuthor();
        if (!members.passwordMatches(me.id(), password)) {
            throw new PostException("That password is not right.");
        }
        // own posts with their likes and comments, and the reports this member made
        moderation.deleteEverythingOf(me.id());
        // own comments and likes on other people's posts (their counters are fixed)
        reactions.deleteAllBy(me.id());
        // chats in both directions
        chat.deleteAllOf(me.id());
        // the account itself: no trace of email, name or password hash stays behind
        members.delete(me.id());
        index.invalidate();
    }
}
