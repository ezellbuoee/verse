package com.verse.server.member;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.feed.FeedIndex;
import com.verse.server.member.MemberService.Member;
import com.verse.server.post.CommentRepository;
import com.verse.server.post.PostRepository;
import com.verse.server.post.PostService;
import com.verse.server.post.PostService.Author;

/** The signed-in member's profile: a name change is carried to their posts and comments. */
@Service
public class ProfileService {

    private final MemberService members;
    private final PostService posts;
    private final PostRepository postRepository;
    private final CommentRepository comments;
    private final FeedIndex index;

    public ProfileService(MemberService members, PostService posts, PostRepository postRepository,
            CommentRepository comments, FeedIndex index) {
        this.members = members;
        this.posts = posts;
        this.postRepository = postRepository;
        this.comments = comments;
        this.index = index;
    }

    /** The bio of a member, empty when there is none. */
    public String bioOf(String memberId) {
        return members.byId(memberId).map(Member::bio).orElse("");
    }

    @Transactional
    public Member updateMine(String displayName, String bio) {
        Author me = posts.currentAuthor();
        Member saved = members.updateProfile(me.id(), displayName, bio);
        postRepository.renameAuthor(me.id(), saved.displayName());
        comments.renameAuthor(me.id(), saved.displayName());
        index.invalidate();
        return saved;
    }
}
