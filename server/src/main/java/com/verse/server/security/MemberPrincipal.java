package com.verse.server.security;

import com.verse.server.member.MemberEntity;

/** The signed-in member of the current request, read fresh from the database for every request. */
public record MemberPrincipal(String id, String email, String displayName, String role) {

    public boolean admin() {
        return MemberEntity.ROLE_ADMIN.equals(role);
    }

    static MemberPrincipal of(MemberEntity m) {
        return new MemberPrincipal(m.getId(), m.getEmail(), m.getDisplayName(), m.getRole());
    }
}
