package com.verse.server.security;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

import com.verse.server.member.MemberEntity;
import com.verse.server.member.MemberRepository;

/**
 * Turns a valid token into the member behind it. The role comes from the database, not from the token, so a
 * promotion, a suspension or a deleted account takes effect on the next request.
 */
@Component
public class MemberAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final MemberRepository members;

    public MemberAuthenticationConverter(MemberRepository members) {
        this.members = members;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        MemberEntity member = members.findById(jwt.getSubject())
                .filter(m -> MemberEntity.STATUS_ACTIVE.equals(m.getStatus()))
                .orElseThrow(() -> new InvalidBearerTokenException("This account is no longer active."));
        return UsernamePasswordAuthenticationToken.authenticated(MemberPrincipal.of(member), jwt,
                List.of(new SimpleGrantedAuthority(member.getRole())));
    }
}
