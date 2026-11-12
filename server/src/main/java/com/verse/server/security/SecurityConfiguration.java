package com.verse.server.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.verse.server.api.ApiExceptionHandler;
import com.verse.server.api.ApiV1;

import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Stateless bearer-token security. Public reads, joining and signing in are open; {@code /api/v1/me/**} needs a
 * signed-in member and {@code /api/v1/admin/**} an admin. Refusals are {@code application/problem+json} like every
 * other API error.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfiguration {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Bean
    public SecurityFilterChain apiSecurity(HttpSecurity http, MemberAuthenticationConverter members)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                // uses the corsConfigurationSource bean below
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, ApiV1.BASE + "/daily", ApiV1.BASE + "/posts/**",
                                ApiV1.BASE + "/authors/**").permitAll()
                        .requestMatchers(HttpMethod.POST, ApiV1.BASE + "/signup", ApiV1.BASE + "/auth/login")
                        .permitAll()
                        .requestMatchers(ApiV1.ADMIN + "/**").hasAuthority(ApiV1.ADMIN_AUTHORITY)
                        .requestMatchers(ApiV1.ME, ApiV1.ME + "/**").authenticated()
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/v3/api-docs/**",
                                "/v3/api-docs.yaml", "/swagger-ui/**", "/swagger-ui.html", "/error").permitAll()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(rs -> rs
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(members))
                        .authenticationEntryPoint((request, response, e) -> problem(response,
                                HttpStatus.UNAUTHORIZED, "sign-in-required", "Sign in required", "Please sign in.")))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) -> problem(response,
                                HttpStatus.UNAUTHORIZED, "sign-in-required", "Sign in required", "Please sign in."))
                        .accessDeniedHandler((request, response, e) -> problem(response, HttpStatus.FORBIDDEN,
                                "forbidden", "Not allowed", "You are not allowed to do that.")));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${verse.cors.allowed-origins:}") List<String> allowedOrigins) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        List<String> origins = allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList();
        if (!origins.isEmpty()) {
            CorsConfiguration config = new CorsConfiguration();
            config.setAllowedOrigins(origins);
            config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Accept-Language"));
            source.registerCorsConfiguration("/api/**", config);
        }
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtEncoder jwtEncoder(AuthProperties properties) {
        return NimbusJwtEncoder.withSecretKey(key(properties)).algorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    public JwtDecoder jwtDecoder(AuthProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key(properties)).macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(TokenService.ISSUER));
        return decoder;
    }

    private static SecretKey key(AuthProperties properties) {
        return new SecretKeySpec(properties.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    private static void problem(HttpServletResponse response, HttpStatus status, String type, String title,
            String detail) throws IOException {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("type", ApiExceptionHandler.TYPE_BASE.resolve(type).toString());
        p.put("title", title);
        p.put("status", status.value());
        p.put("detail", detail);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        JSON.writeValue(response.getOutputStream(), p);
    }
}
