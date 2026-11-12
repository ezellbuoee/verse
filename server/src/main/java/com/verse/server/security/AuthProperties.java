package com.verse.server.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code verse.auth.*}: the HS256 secret that signs sign-in tokens, and how long a token stays valid.
 *
 * @param jwtSecret at least 32 characters; keep it the same across restarts and replicas or everyone is signed out
 * @param tokenTtl  lifetime of a token, e.g. {@code 7d} or {@code 12h}
 */
@ConfigurationProperties("verse.auth")
public record AuthProperties(String jwtSecret, Duration tokenTtl) {

    static final int MIN_SECRET_LENGTH = 32;

    public AuthProperties {
        if (jwtSecret == null || jwtSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("verse.auth.jwt-secret (env VERSE_JWT_SECRET) must be set to at least "
                    + MIN_SECRET_LENGTH + " characters.");
        }
        if (tokenTtl == null || tokenTtl.isNegative() || tokenTtl.isZero()) {
            tokenTtl = Duration.ofDays(7);
        }
    }
}
