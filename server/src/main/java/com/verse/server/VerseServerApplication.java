package com.verse.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class VerseServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(VerseServerApplication.class, args);
    }
}
