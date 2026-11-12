package com.verse.server.api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;

/** The OpenAPI description of the API v1 (springdoc): {@code /v3/api-docs}, UI at {@code /swagger-ui.html}. */
@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI verseOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Verse API").version("v1")
                        .description("A community of posts (poems and quotes), authors, hearts, comments, chats and "
                                + "moderation. Public reads under /api/v1, the signed-in member's actions under "
                                + "/api/v1/me, moderation under /api/v1/admin. Lists are pages, errors are "
                                + "application/problem+json."))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                                .description("The accessToken from POST /api/v1/auth/login")));
    }
}
