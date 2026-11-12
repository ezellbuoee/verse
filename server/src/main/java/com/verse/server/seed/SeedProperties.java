package com.verse.server.seed;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code verse.seed.*}: what goes into an empty database at startup.
 *
 * @param classics   the public-domain classics (about 3,600 poems and quotes)
 * @param samples    a handful of sample posts (development)
 * @param devMembers sample accounts admin@ / user1@ / user2@verse.local, password "password" (development only)
 */
@ConfigurationProperties("verse.seed")
public record SeedProperties(boolean classics, boolean samples, boolean devMembers) {
}
