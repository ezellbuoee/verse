package com.verse.server.api;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.verse.server.api.ApiModels.AccountDto;
import com.verse.server.api.ApiModels.LoginRequest;
import com.verse.server.api.ApiModels.SignupRequest;
import com.verse.server.api.ApiModels.TokenDto;
import com.verse.server.member.MemberService;
import com.verse.server.member.MemberService.Member;
import com.verse.server.security.TokenService;
import com.verse.server.security.TokenService.Token;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Joining (18+) and signing in, public. The token from {@code POST /api/v1/auth/login} is sent as
 * {@code Authorization: Bearer <token>} to everything under {@code /api/v1/me} and {@code /api/v1/admin}.
 */
@RestController
@RequestMapping(ApiV1.BASE)
@Tag(name = "Account", description = "Joining and signing in.")
public class AccountController {

    private final MemberService members;
    private final TokenService tokens;

    public AccountController(MemberService members, TokenService tokens) {
        this.members = members;
        this.tokens = tokens;
    }

    @PostMapping("/signup")
    @Operation(summary = "Create an account", description = "Email becomes the login name. The person must be 18+.")
    public ResponseEntity<AccountDto> signup(@RequestBody SignupRequest request) {
        Member m = members.signup(request.email(), request.displayName(), request.password(), request.over18());
        return ResponseEntity.created(URI.create(ApiV1.ME))
                .body(new AccountDto(m.id(), m.email(), m.displayName()));
    }

    @PostMapping("/auth/login")
    @Operation(summary = "Sign in", description = "Answers 401 with a readable detail when email and password do not "
            + "match. Signing out is forgetting the token.")
    public TokenDto login(@RequestBody LoginRequest request) {
        Token token = tokens.issue(members.authenticate(request.email(), request.password()));
        return new TokenDto(token.value(), "Bearer", token.expiresAt());
    }
}
