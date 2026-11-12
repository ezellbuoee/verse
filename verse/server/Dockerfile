# Verse server: build the jar from source, run it on a JRE as a non-root user (port 8080).
#   docker build -f server/Dockerfile -t verse/server .     (from the repository root)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle gradle.properties package.json ./
COPY gradle gradle
COPY quality quality
COPY client/build.gradle client/build.gradle
COPY e2e/build.gradle e2e/build.gradle
COPY server/build.gradle server/build.gradle
COPY server/src server/src
RUN ./gradlew :server:bootJar --no-daemon -PskipCheckstyle=true

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 1001 --home-dir /app verse
WORKDIR /app
COPY --from=build /src/server/build/libs/server-*.jar /app/verse.jar
USER 1001
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=70"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/verse.jar"]
