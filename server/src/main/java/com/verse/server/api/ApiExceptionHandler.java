package com.verse.server.api;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.verse.server.member.MemberService.SignInException;
import com.verse.server.member.MemberService.SignupException;
import com.verse.server.post.PostService.PostException;

/**
 * Errors of the API v1 as {@code application/problem+json} (RFC 9457). The {@code detail} is always a sentence a
 * person can read; the client shows it as is. Refusals by the security filters (no or a bad token) use the same
 * shape, see {@code SecurityConfiguration}.
 */
@RestControllerAdvice(basePackageClasses = ApiExceptionHandler.class)
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    public static final URI TYPE_BASE = URI.create("https://verse.example/problems/");

    @ExceptionHandler({PostException.class, SignupException.class})
    public ProblemDetail rejected(RuntimeException e) {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, "rejected", "Not accepted", e.getMessage());
    }

    @ExceptionHandler(SignInException.class)
    public ProblemDetail signInFailed(SignInException e) {
        return problem(HttpStatus.UNAUTHORIZED, "sign-in-failed", "Sign in failed", e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail badBody(HttpMessageNotReadableException e) {
        return problem(HttpStatus.BAD_REQUEST, "bad-request", "Bad request",
                "The request body could not be read as JSON.");
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ProblemDetail notSignedIn(AuthenticationCredentialsNotFoundException e) {
        return problem(HttpStatus.UNAUTHORIZED, "sign-in-required", "Sign in required", "Please sign in.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail denied(AccessDeniedException e) {
        String detail = e.getMessage() == null || e.getMessage().isBlank() ? "You are not allowed to do that."
                : e.getMessage();
        return problem(HttpStatus.FORBIDDEN, "forbidden", "Not allowed", detail);
    }

    @ExceptionHandler(RuntimeException.class)
    public ProblemDetail failed(RuntimeException e) {
        LOGGER.error("API call failed", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "failed", "Something went wrong",
                "Sorry, that did not work on our side. Please try again in a moment.");
    }

    private static ProblemDetail problem(HttpStatus status, String type, String title, String detail) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(status, detail);
        p.setType(TYPE_BASE.resolve(type));
        p.setTitle(title);
        return p;
    }
}
