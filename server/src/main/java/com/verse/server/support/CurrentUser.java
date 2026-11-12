package com.verse.server.support;

import java.util.Optional;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.verse.server.security.MemberPrincipal;

/** The member behind the current request. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Optional<MemberPrincipal> get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof MemberPrincipal p ? Optional.of(p) : Optional.empty();
    }

    public static MemberPrincipal require() {
        return get().orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Please sign in."));
    }

    public static boolean isAdmin() {
        return get().map(MemberPrincipal::admin).orElse(false);
    }
}
