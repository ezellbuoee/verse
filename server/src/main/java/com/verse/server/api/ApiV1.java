package com.verse.server.api;

/**
 * Conventions of the Verse API v1.
 * <ul>
 * <li>Base path {@value #BASE}. Public reads live directly under it; everything the signed-in member does lives
 * under {@value #ME}, everything an admin does under {@value #ADMIN}. The split is also the security rule: the
 * base paths are open, {@code /me} and {@code /admin} need a bearer token ({@code Authorization: Bearer …}) from
 * {@code POST /api/v1/auth/login}.</li>
 * <li>Lists return a {@code Page} envelope: items, page, size, total, hasMore. Page size is capped at 60.</li>
 * <li>Errors are {@code application/problem+json} (RFC 9457) with a plain-language {@code detail}.</li>
 * <li>Creates answer 201 with the created resource, deletes answer 204, toggles answer the new state.</li>
 * <li>Times are ISO-8601 in UTC. Ids are opaque strings.</li>
 * </ul>
 * The machine-readable description is served at {@code /v3/api-docs} (Swagger UI at {@code /swagger-ui.html}).
 */
public final class ApiV1 {

    public static final String BASE = "/api/v1";
    public static final String ME = BASE + "/me";
    public static final String ADMIN = BASE + "/admin";

    /** Spring Security expression for "signed in". */
    public static final String SIGNED_IN = "isAuthenticated()";
    /** Spring Security expression for "signed in as an admin". */
    public static final String IS_ADMIN = "hasAuthority('admin')";
    /** The authority an admin has (the member's role). */
    public static final String ADMIN_AUTHORITY = "admin";

    private ApiV1() {
    }
}
