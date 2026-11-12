package com.verse.server.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.member.MemberService;
import com.verse.server.member.MemberService.Member;
import com.verse.server.post.PostService;
import com.verse.server.post.PostService.Author;
import com.verse.server.post.PostService.PostException;

/** One-to-one quick chat. A conversation is the pair of member ids, sorted. */
@Service
public class ChatService {

    static final int MAX_BODY = 2000;

    public record Message(String id, String fromId, String fromName, String toId, String body, Instant createdAt,
            boolean read) {

        static Message of(MessageEntity m) {
            return new Message(m.getId(), m.getFromId(), m.getFromName(), m.getToId(), m.getBody(), m.getCreatedAt(),
                    m.getReadAt() != null);
        }
    }

    public record Conversation(String otherId, String otherName, String lastBody, Instant lastAt, long unread) {
    }

    private final MessageRepository repository;
    private final PostService posts;
    private final MemberService members;

    public ChatService(MessageRepository repository, PostService posts, MemberService members) {
        this.repository = repository;
        this.posts = posts;
        this.members = members;
    }

    public static String conversationId(String a, String b) {
        return a.compareTo(b) <= 0 ? a + "|" + b : b + "|" + a;
    }

    @Transactional
    public Message send(String toId, String rawBody) {
        Author me = posts.currentAuthor();
        String body = rawBody == null ? "" : rawBody.strip();
        if (toId == null || toId.isBlank() || toId.equals(me.id())) {
            throw new PostException("Please choose someone to chat with.");
        }
        if (toId.startsWith("classic:")) {
            throw new PostException("The classic poets are not on Verse to chat, sadly.");
        }
        if (body.isEmpty()) {
            throw new PostException("Please write a message first.");
        }
        if (body.length() > MAX_BODY) {
            throw new PostException("A message can have at most 2000 characters.");
        }
        displayName(toId).orElseThrow(() -> new PostException("This member no longer exists."));
        return Message.of(repository.save(
                new MessageEntity(conversationId(me.id(), toId), me.id(), me.name(), toId, body)));
    }

    /** Messages with one member, oldest first. Incoming unread messages are marked read. */
    @Transactional
    public List<Message> conversation(String otherId) {
        Author me = posts.currentAuthor();
        List<MessageEntity> messages = repository.findByConversationIdOrderByCreatedAtAsc(
                conversationId(me.id(), otherId));
        List<Message> result = messages.stream().map(Message::of).toList();
        Instant now = Instant.now();
        messages.stream().filter(m -> me.id().equals(m.getToId()) && m.getReadAt() == null)
                .forEach(m -> m.setReadAt(now));
        return result;
    }

    /** The signed-in member's conversations, newest first, with unread counts. */
    public List<Conversation> conversations() {
        Author me = posts.currentAuthor();
        Map<String, List<Message>> byOther = new LinkedHashMap<>();
        for (MessageEntity e : repository.findInvolving(me.id())) {
            Message m = Message.of(e);
            String other = m.fromId().equals(me.id()) ? m.toId() : m.fromId();
            byOther.computeIfAbsent(other, k -> new ArrayList<>()).add(m);
        }
        List<Conversation> result = new ArrayList<>();
        byOther.forEach((other, messages) -> {
            Message last = messages.stream().max(Comparator.comparing(Message::createdAt)).orElseThrow();
            long unread = messages.stream().filter(m -> m.toId().equals(me.id()) && !m.read()).count();
            String name = displayName(other).or(() -> messages.stream().filter(m -> m.fromId().equals(other))
                    .map(Message::fromName).findFirst()).orElse("Former member");
            result.add(new Conversation(other, name, last.body(), last.createdAt(), unread));
        });
        result.sort(Comparator.comparing(Conversation::lastAt).reversed());
        return result;
    }

    public long unreadTotal() {
        return repository.countByToIdAndReadAtIsNull(posts.currentAuthor().id());
    }

    public long countInvolving(String memberId) {
        return repository.findInvolving(memberId).size();
    }

    /** Deletes every chat message a member sent or received. */
    @Transactional
    public void deleteAllOf(String memberId) {
        repository.deleteInvolving(memberId);
    }

    /** Display name of an active member. */
    public Optional<String> displayName(String id) {
        return members.byId(id).filter(Member::active).map(Member::displayName);
    }
}
