# Verse

Verse is a small community for poems and quotes. Visitors read without an account: a front page that picks
something new every morning, about 3,600 public-domain classics (Shakespeare, Dickinson, Tagore, Whitman, …), poet
pages and search. Members (18+) write poems and quotes, give hearts, comment and chat one to one. Admins handle
reports and manage members.

- **Server:** Java 21, Spring Boot 4 (Web MVC, Data JPA, Security with JWT bearer tokens, Actuator), Flyway,
  PostgreSQL. The API is documented with OpenAPI (Swagger UI at `/swagger-ui.html`).
- **Client:** React 19 and TypeScript, built with webpack, served by nginx. No UI framework: plain components and
  one stylesheet, with light and dark themes.
- **Deployment:** Docker images, Docker Compose for a single host, a Helm chart for Kubernetes.

```
 browser ──► frontend (nginx :8020) ──/api/──► server (Spring Boot :8080) ──► PostgreSQL
              static client bundle               REST API /api/v1, health /actuator/health
```

---

## Contents

- [Repository layout](#repository-layout)
- [Run it locally (development)](#run-it-locally-development)
- [Run it with Docker Compose](#run-it-with-docker-compose)
- [Install on Kubernetes with Helm](#install-on-kubernetes-with-helm)
- [Configuration](#configuration)
- [Testing](#testing)
- [API](#api)
- [How it works](#how-it-works)
- [Upgrading from 1.x](#upgrading-from-1x)

## Repository layout

| Path | What is there |
|---|---|
| `server/` | Spring Boot application: `api/` (controllers, DTOs), `member/`, `post/`, `chat/`, `moderation/`, `feed/` (services, entities, repositories), `security/`, `seed/`. Flyway migrations in `src/main/resources/db/migration`, seed data in `src/main/resources/seed`. |
| `client/` | React client. `src/verse/` holds the screens, `api.ts` / `rpc.ts` / `feedApi.ts` the API calls, `auth.ts` the sign-in token, `verse.css` the look. |
| `e2e/` | Playwright end-to-end tests (visitor, member and admin flows). |
| `compose/` | Docker Compose files, `.env` defaults, backup and restore scripts. |
| `deploy/helm/verse/` | Helm chart. See its [README](deploy/helm/verse/README.md). |
| `docs/` | [API guide](docs/API.md) and the generated [OpenAPI description](docs/openapi.yaml). |
| `tools/classics/` | Script that builds the classics seed file from Project Gutenberg texts. |
| `quality/` | Checkstyle rules for the server. |

## Run it locally (development)

**You need:** JDK 21 or newer, Node.js 22 or newer with npm. No database: the dev profile uses an H2 file
database in `server/data/`.

```bash
# 1. the server on http://localhost:8082 (dev profile: H2 database, sample accounts, the classics)
./gradlew :server:bootRun

# 2. in a second terminal, the client on http://localhost:8020 (proxies /api to the server, hot reload)
cd client
npm install
npm start
```

Open <http://localhost:8020>. The first start creates the schema and imports the classics; that takes a few
seconds. Sample accounts (dev profile only, password `password`):

| Email | Role |
|---|---|
| `admin@verse.local` | admin: sees **Reports** and **Members** |
| `user1@verse.local`, `user2@verse.local` | member |

Or join with any email address.

Useful variations:

- **Start over:** stop the server and delete `server/data/`.
- **Against PostgreSQL instead of H2:** start only the database from Compose and use the `local-db` profile:
  ```bash
  docker compose -f compose/docker-compose.yml up -d postgres
  ./gradlew :server:bootRun -Dspring.profiles.active=dev,local-db
  ```
- **From the IDE:** IntelliJ has run configurations in `.run/` (*server start [dev]*, *client start*), VS Code
  in `.vscode/launch.json`. The server's working directory must be `server/`.
- **Gradle for the client:** `./gradlew :client:start` runs the same dev server; `./gradlew build` builds and checks
  server and client.

## Run it with Docker Compose

**You need:** Docker with Compose v2.

```bash
docker compose -f compose/docker-compose.yml up -d --build
```

This builds both images from source and starts PostgreSQL, the server and the client. Open
<http://localhost:8020> and sign in as `admin@verse.local` with password `change-me-please` (from
`compose/.env`). The server is also reachable on <http://localhost:8082> and the database on `localhost:8093`.

Stop with `docker compose -f compose/docker-compose.yml down` (add `-v` to delete the database too).

### A single production host

1. Copy the example and fill in real values (generate secrets with `openssl rand -base64 36`):
   ```bash
   cp compose/.env.prod.example compose/.env.prod
   ```
2. Start, with the production overrides (port 80, restart policies, no database or server ports published):
   ```bash
   docker compose -f compose/docker-compose.yml -f compose/docker-compose.prod.yml \
     --env-file compose/.env.prod up -d --build
   ```
3. Put a TLS-terminating proxy (Caddy, Traefik, your cloud's load balancer) in front of port 80.
4. Sign in with `VERSE_ADMIN_EMAIL` / `VERSE_ADMIN_PASSWORD`, make your own account an admin on the
   **Members** page, then remove both variables from `.env.prod` and run step 2 again.
5. Back up nightly with cron: `0 3 * * * /path/to/verse/compose/backup.sh` (dumps to `/var/backups/verse`,
   keeps 14 days). Restore with `compose/restore.sh <dump-file>`.

## Install on Kubernetes with Helm

**You need:** a cluster, `kubectl`, Helm 3, a container registry the cluster can pull from, and (for a public site)
an ingress controller. cert-manager is optional, for TLS certificates.

### 1. Build and push the images

```bash
REGISTRY=registry.example.org/verse     # your registry
TAG=2.0.0

docker build -f server/Dockerfile -t $REGISTRY/server:$TAG .
docker build -t $REGISTRY/frontend:$TAG client
docker push $REGISTRY/server:$TAG
docker push $REGISTRY/frontend:$TAG
```

On a local cluster (kind, minikube, Rancher Desktop) you can skip the registry: build with the plain names
`verse/server:2.0.0` and `verse/frontend:2.0.0` (and `kind load docker-image …` for kind), then leave
`image.registry` empty.

### 2. Install

```bash
helm upgrade --install verse deploy/helm/verse \
  --namespace verse --create-namespace \
  --set publicUrl=https://verse.example.org \
  --set image.registry=registry.example.org --set image.server=verse/server --set image.frontend=verse/frontend \
  --set image.tag=2.0.0 \
  --set bootstrapAdmin.email=you@example.org \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt
```

This creates the in-cluster PostgreSQL (with a 5 GiB volume), the server and the frontend, an ingress with TLS for
the `publicUrl` host and a nightly backup job. The database password, the token secret and the admin password are
generated on the first install and kept on every upgrade.

### 3. Check and sign in

```bash
kubectl -n verse get pods -w                       # wait until all pods are Running and ready
kubectl -n verse get secret verse-verse-app -o jsonpath='{.data.adminPassword}' | base64 -d; echo
```

Open your `publicUrl` (or, without an ingress, `kubectl -n verse port-forward svc/verse-verse-frontend 8020:80` and
<http://localhost:8020>) and sign in with the bootstrap admin. Make your own account an admin on **Members**, then
turn the bootstrap admin off:

```bash
helm upgrade verse deploy/helm/verse -n verse --reuse-values --set bootstrapAdmin.email=""
```

### Day two

- **New version:** build and push with a new tag, then
  `helm upgrade verse deploy/helm/verse -n verse --reuse-values --set image.tag=<new tag>`. Database migrations run
  when the server starts.
- **Managed database:** `--set postgres.enabled=false --set postgres.external.host=<host> --set postgres.password=<pw>`
  (create the database and user first; `postgres.database` and `postgres.username` default to `verse`).
- **Backups** land on the `verse-verse-backups` volume. How to restore is in the
  [chart README](deploy/helm/verse/README.md#backups-and-restore).
- **Uninstall:** `helm uninstall verse -n verse`. The database volume (`data-verse-verse-postgres-0`) and the backup
  volume are kept; delete them with `kubectl -n verse delete pvc …` if you really want the data gone.

All chart values are listed in [`deploy/helm/verse/values.yaml`](deploy/helm/verse/values.yaml) and explained in the
[chart README](deploy/helm/verse/README.md).

## Configuration

The server reads environment variables (or the matching Spring properties in
`server/src/main/resources/config/application.properties`).

| Variable | Default | Meaning |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` in the image | `prod` = JSON logs, minimal actuator. `dev` = H2, sample data, port 8082. |
| `VERSE_DB_URL` | `jdbc:postgresql://localhost:5432/verse` | JDBC URL of the database. |
| `VERSE_DB_USERNAME` / `VERSE_DB_PASSWORD` | `verse` / – | Database account. |
| `VERSE_JWT_SECRET` | – (required) | Key that signs sign-in tokens, 32+ characters. Keep it stable or everyone is signed out. |
| `VERSE_TOKEN_TTL` | `7d` | How long a sign-in lasts (`12h`, `30d`, …). |
| `VERSE_PUBLIC_URL` | – | Public address; allowed as CORS origin. Not needed when client and API share the origin. |
| `VERSE_ADMIN_EMAIL` / `VERSE_ADMIN_PASSWORD` | – | Bootstrap admin: created if missing, promoted if it exists (password then unchanged). |
| `VERSE_ADMIN_NAME` | `Admin` | Display name of a newly created bootstrap admin. |
| `VERSE_SEED_CLASSICS` | `true` | Import the classics when the posts table is empty. |
| `JAVA_OPTS` | `-XX:MaxRAMPercentage=70` | JVM options (image only). |

The frontend image takes one variable, `VERSE_SERVER_URL` (default `http://server:8080`): where nginx forwards
`/api`.

## Testing

```bash
./gradlew :server:test          # API tests against an in-memory database (signup, sign-in, posts, hearts,
                                # comments, chats, reports, members, account deletion)
./gradlew :server:check         # tests and Checkstyle
cd client && npm run compile    # type check, ESLint, Prettier
```

End to end, against a running Verse (the dev setup above by default):

```bash
cd e2e
npm install
npx playwright install chromium
npm run e2e:test                                 # BASE_URL=https://… to test a deployment
```

The admin test signs in as `admin@verse.local`; against a deployment, set `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD` (it is skipped otherwise). The tests create their own throwaway accounts.

## API

Base path `/api/v1`. Public reads (`/daily`, `/posts`, `/authors`), joining (`/signup`) and signing in
(`/auth/login`) need no token; everything under `/me` needs `Authorization: Bearer <token>`, everything under
`/admin` the admin role. Errors are `application/problem+json` with a sentence the client shows as is.

The full guide with examples is in [docs/API.md](docs/API.md); the live description is at `/v3/api-docs` and
`/swagger-ui.html` on the server.

## How it works

- **Data:** six tables (`members`, `posts`, `post_likes`, `comments`, `messages`, `reports`) created by Flyway.
  Posts carry their author's name and id, so imported classics (`classic:<slug>`) need no member row. Like and
  comment counts are stored on the post and recounted on every change.
- **Reads** come from `FeedIndex`, an in-memory view of all posts. Every write bumps a one-row change counter
  (`feed_version`) in its transaction; each read checks it (a primary-key lookup) and rebuilds the view when it moved,
  so every server replica sees a change as soon as it is committed. Filtering, search and the daily selection run on that view,
  which keeps a few thousand posts fast without a search engine.
- **The daily selection** is computed from the date and the content: same for everyone, new every day at midnight
  UTC, no editor needed.
- **Sign-in** is a signed JWT with the member id. The member is loaded from the database on every request, so a
  role change, a suspension or a deleted account takes effect immediately.
- **Account deletion** removes the member, their posts (with hearts and comments), their comments and hearts on other
  posts, their chats and their reports.

## Upgrading from 1.x

Version 1.x ran on a different platform. 2.0 replaces it with the stack described above. The REST API under `/api/v1` keeps its paths and JSON shapes; what changed:

- **Signing in** is `POST /api/v1/auth/login` (`{email, password}` → `{accessToken}`), sent as
  `Authorization: Bearer …`.
- **New database schema.** 2.0 starts on an empty database and imports the classics. Members, member posts, hearts,
  comments and chats stored in a 1.x database are **not migrated**.
- **Configuration:** the Compose variables are now `VERSE_DB_*`, `VERSE_JWT_SECRET`, `VERSE_ADMIN_*` (see
  `compose/.env.prod.example`); the two databases `verse_ds` / `verse_cs` became one database `verse`. The bootstrap
  admin moved from `import/auth/users-prod/admin.yaml` to `VERSE_ADMIN_EMAIL` / `VERSE_ADMIN_PASSWORD`.
- **Helm:** the chart no longer has an init job, model ConfigMaps or `deploy/helm/sync-files.sh`. Install 2.0 as a
  new release, or uninstall the 1.x release and delete its database volume first.
- **Member status** `DELETED` is now `SUSPENDED` and is set on the **Members** page.
