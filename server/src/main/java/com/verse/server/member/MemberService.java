package com.verse.server.member;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.verse.server.security.MemberPrincipal;
import com.verse.server.support.CurrentUser;

/** Member accounts: signup rules, password checks, lookup by email, and what an admin may change. */
@Service
public class MemberService {

    static final int MAX_BIO = 300;
    static final Set<String> ROLES = Set.of(MemberEntity.ROLE_USER, MemberEntity.ROLE_ADMIN);
    static final Set<String> STATUSES = Set.of(MemberEntity.STATUS_ACTIVE, MemberEntity.STATUS_SUSPENDED);

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MIN_PASSWORD = 8;

    private final MemberRepository repository;
    private final PasswordEncoder encoder;
    /** Compared against when the email is unknown, so a wrong email takes as long as a wrong password. */
    private final String dummyHash;

    public MemberService(MemberRepository repository, PasswordEncoder encoder) {
        this.repository = repository;
        this.encoder = encoder;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    public record Member(String id, String email, String displayName, String role, String status, String bio,
            Instant since) {

        public boolean active() {
            return MemberEntity.STATUS_ACTIVE.equals(status);
        }

        static Member of(MemberEntity m) {
            return new Member(m.getId(), m.getEmail(), m.getDisplayName(), m.getRole(), m.getStatus(), m.getBio(),
                    m.getCreatedAt());
        }
    }

    public static class SignupException extends RuntimeException {
        public SignupException(String message) {
            super(message);
        }
    }

    /** Wrong email or password, or a suspended account. The message can be shown as is. */
    public static class SignInException extends RuntimeException {
        public SignInException(String message) {
            super(message);
        }
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /** Creates an active member. Throws {@link SignupException} with a plain-language reason. */
    @Transactional
    public Member signup(String rawEmail, String rawDisplayName, String password, boolean over18) {
        String email = normalizeEmail(rawEmail);
        String displayName = rawDisplayName == null ? "" : rawDisplayName.trim();
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new SignupException("Please enter a valid email address.");
        }
        if (displayName.length() < 2 || displayName.length() > 40) {
            throw new SignupException("Please choose a display name of 2 to 40 characters.");
        }
        if (password == null || password.length() < MIN_PASSWORD) {
            throw new SignupException("Please choose a password of at least 8 characters.");
        }
        if (!over18) {
            throw new SignupException("Verse is for people aged 18 and over.");
        }
        if (repository.existsByEmail(email)) {
            throw new SignupException("There is already an account with this email address.");
        }
        MemberEntity member = new MemberEntity(email, displayName, encoder.encode(password));
        member.setAgeConfirmedAt(Instant.now());
        try {
            return Member.of(repository.saveAndFlush(member));
        } catch (DataIntegrityViolationException e) {
            // two signups with the same address at the same moment: the unique index decides
            throw new SignupException("There is already an account with this email address.");
        }
    }

    /** The member for an email and password, for signing in. */
    public MemberEntity authenticate(String rawEmail, String password) {
        Optional<MemberEntity> member = repository.findByEmail(normalizeEmail(rawEmail));
        String hash = member.map(MemberEntity::getPasswordHash).orElse(dummyHash);
        boolean matches = password != null && encoder.matches(password, hash);
        if (member.isEmpty() || !matches) {
            throw new SignInException("That email and password did not match. Please try again.");
        }
        if (!MemberEntity.STATUS_ACTIVE.equals(member.get().getStatus())) {
            throw new SignInException("This account is suspended. Please contact the Verse admin.");
        }
        return member.get();
    }

    public Optional<Member> findByEmail(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        return email.isEmpty() ? Optional.empty() : repository.findByEmail(email).map(Member::of);
    }

    public Optional<Member> byId(String id) {
        return id == null || id.isBlank() ? Optional.empty() : repository.findById(id).map(Member::of);
    }

    /** Updates display name and bio of a member; returns the saved member. */
    @Transactional
    public Member updateProfile(String id, String rawDisplayName, String rawBio) {
        String displayName = rawDisplayName == null ? "" : rawDisplayName.strip();
        if (displayName.length() < 2 || displayName.length() > 40) {
            throw new SignupException("Please choose a display name of 2 to 40 characters.");
        }
        String bio = rawBio == null ? "" : rawBio.strip();
        if (bio.length() > MAX_BIO) {
            throw new SignupException("The bio can have at most 300 characters.");
        }
        MemberEntity m = repository.findById(id)
                .orElseThrow(() -> new SignupException("This account no longer exists."));
        m.setDisplayName(displayName);
        m.setBio(bio.isEmpty() ? null : bio);
        return Member.of(m);
    }

    public boolean passwordMatches(String id, String rawPassword) {
        return rawPassword != null && repository.findById(id)
                .map(m -> encoder.matches(rawPassword, m.getPasswordHash())).orElse(false);
    }

    @Transactional
    public void delete(String id) {
        repository.deleteById(id);
    }

    // ---- admin ----

    /** Admin: all members, newest first, optionally filtered by part of the email or name. */
    public List<Member> list(String q) {
        requireAdmin();
        String needle = q == null ? "" : q.strip().toLowerCase(Locale.ROOT);
        return repository.findAll().stream()
                .filter(m -> needle.isEmpty() || m.getEmail().contains(needle)
                        || m.getDisplayName().toLowerCase(Locale.ROOT).contains(needle))
                .sorted(Comparator.comparing(MemberEntity::getCreatedAt).reversed())
                .map(Member::of)
                .toList();
    }

    /** Admin: change role and/or status. Admins cannot demote or suspend themselves (nobody would be left). */
    @Transactional
    public Member change(String id, String role, String status) {
        MemberPrincipal me = requireAdmin();
        MemberEntity m = repository.findById(id)
                .orElseThrow(() -> new SignupException("This member no longer exists."));
        if (role != null) {
            String r = role.strip().toLowerCase(Locale.ROOT);
            if (!ROLES.contains(r)) {
                throw new SignupException("Unknown role.");
            }
            if (me.id().equals(id) && !MemberEntity.ROLE_ADMIN.equals(r)) {
                throw new SignupException("You cannot take away your own admin role.");
            }
            m.setRole(r);
        }
        if (status != null) {
            String s = status.strip().toUpperCase(Locale.ROOT);
            if (!STATUSES.contains(s)) {
                throw new SignupException("Unknown status.");
            }
            if (me.id().equals(id) && !MemberEntity.STATUS_ACTIVE.equals(s)) {
                throw new SignupException("You cannot suspend yourself.");
            }
            m.setStatus(s);
        }
        return Member.of(m);
    }

    /**
     * Startup: makes sure an admin with this email exists (created with the given password if new, promoted and
     * reactivated if it exists; an existing password is kept).
     */
    @Transactional
    public Member ensureAdmin(String rawEmail, String password, String displayName) {
        String email = normalizeEmail(rawEmail);
        MemberEntity m = repository.findByEmail(email).orElseGet(() -> {
            if (password == null || password.length() < MIN_PASSWORD) {
                throw new IllegalStateException("The bootstrap admin password must have at least 8 characters.");
            }
            MemberEntity created = new MemberEntity(email, displayName, encoder.encode(password));
            created.setAgeConfirmedAt(Instant.now());
            return repository.save(created);
        });
        m.setRole(MemberEntity.ROLE_ADMIN);
        m.setStatus(MemberEntity.STATUS_ACTIVE);
        return Member.of(m);
    }

    private static MemberPrincipal requireAdmin() {
        MemberPrincipal me = CurrentUser.require();
        if (!me.admin()) {
            throw new AccessDeniedException("Admins only.");
        }
        return me;
    }
}
