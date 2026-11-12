package com.verse.server.seed;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code verse.bootstrap-admin.*}: an admin account that is made sure of at every start when email and password
 * are set. Created if missing, promoted if it exists (its password is then left alone).
 */
@ConfigurationProperties("verse.bootstrap-admin")
public record BootstrapAdminProperties(String email, String password, String displayName) {

    public boolean enabled() {
        return email != null && !email.isBlank() && password != null && !password.isBlank();
    }
}
