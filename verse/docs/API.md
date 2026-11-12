# Verse API v1

The HTTP API of the Verse backend: a community of **posts** (poems and quotes), **authors**, hearts, comments,
one-to-one chats and moderation. The API is generic on purpose, so the same backend
can serve another client (a phone app) or another kind of community (short stories, aphorisms) by changing the
document model and the words in the UI, not the API.

- Live description: `GET /v3/api-docs` (OpenAPI 3.1 JSON), `GET /v3/api-docs.yaml`, Swagger UI at
  `/swagger-ui.html`.
- Source: `server/src/main/java/com/verse/server/api/` (conventions in `ApiV1.java`).

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1` |
| Who may call | Public reads live directly under `/api/v1`. What the signed-in member does lives under `/api/v1/me`. Moderation lives under `/api/v1/admin` (admin role). |
| Authentication | `POST /api/v1/auth/login` with `{"email": "…", "password": "…"}` answers `{ "accessToken", "tokenType": "Bearer", "expiresAt" }`. Send it as `Authorization: Bearer <accessToken>`. Tokens are signed JWTs (HS256), valid for `VERSE_TOKEN_TTL` (default 7 days). Role, suspension and deletion are checked on every request, so they apply at once. Signing out is forgetting the token. |
| Format | JSON in, JSON out, UTF-8. Times are ISO-8601 in UTC (`2026-11-02T10:15:30Z`). Ids are opaque strings. |
| Lists | Always the `Page` envelope: `{ "items": [...], "page": 0, "size": 24, "total": 3629, "hasMore": true }`. `page` starts at 0, `size` is capped at 60. |
| Creates | `201 Created` with the created resource (and a `Location` header where it has an address). |
| Deletes, dismiss | `204 No Content`. |
| Accepted for later | `202 Accepted` (reports). |
| Errors | `application/problem+json` (RFC 9457): `{ "type": "https://verse.example/problems/rejected", "title": "Not accepted", "status": 422, "detail": "Please enter a valid email address.", "instance": "/api/v1/signup" }`. `detail` is a sentence the client can show as is. |
| Status codes | `400` body not readable · `401` sign in required · `403` not allowed · `404` not found · `422` input rejected (validation, business rule) · `500` our fault, try again |
| Subject of writes | The server never takes a member id from the request body for a write. Under `/me` the caller is always the subject. |
| Versioning | Breaking changes get a new base path (`/api/v2`). Additive changes (new fields, new endpoints) do not. |
| CORS | Only the public URL (`VERSE_PUBLIC_URL`) in production. |

## Public (no token)

| Method and path | What it does | Parameters |
|---|---|---|
| `GET /api/v1/daily` | The day's selection for the front page. Same for everyone, changes at midnight UTC. | – |
| `GET /api/v1/posts` | Posts, newest first. | `page`, `size`, `sort=newest\|loved`, `kind=POEM\|QUOTE`, `mood`, `author=<id>`, `q=<words>` (all words must appear in title, text or author name) |
| `GET /api/v1/posts/{id}` | One post. | – |
| `GET /api/v1/posts/{id}/comments` | Comments of a post, oldest first. | `page`, `size` |
| `GET /api/v1/authors` | Authors, most active first. | `page`, `size`, `q=<part of name>`, `kind=classic\|member` |
| `GET /api/v1/authors/{id}` | An author's page: who they are and their numbers. Posts: `/posts?author={id}`. | – |
| `POST /api/v1/signup` | Create an account (18+). Body `{ email, displayName, password, over18 }` → `201 { id, email, displayName }`. | – |
| `POST /api/v1/auth/login` | Sign in. Body `{ email, password }` → `200 { accessToken, tokenType, expiresAt }`; `401` with a readable `detail` otherwise. | – |

### Daily

```json
{
  "date": "2026-11-02",
  "topPost": { "...Post" },            // best-rated recent poems, rotating daily
  "quote": { "...Post" },              // one of the seven most-loved quotes, rotating
  "authorOfTheDay": { "...Author" },   // an author with at least three pieces, rotating
  "moodOfTheDay": "JOY",
  "selection": [ "...six Posts by six authors, mood of the day first, fixed for the day" ],
  "fresh": [ "...five newest poems" ],
  "mostLoved": [ "...six posts with the most hearts" ],
  "moods": [ { "mood": "NATURE", "count": 871 } ],
  "authors": [ "...eight most active Authors" ],
  "totals": { "posts": 3629, "poems": 3217, "quotes": 412, "authors": 16 }
}
```

Scores: top post = 3·hearts + 2·comments + 2 if published this week; the ten best rotate by day. Everything is
derived from the date and the content, so there is no editor and no state to back up.

### Post

```json
{ "id": "…", "kind": "POEM", "title": "Son of Klay", "body": "A book of tales,\n…", "source": null,
  "mood": "LOVE", "authorName": "Ezio Olubelleau", "authorId": "15905644-…", "likeCount": 1,
  "commentCount": 0, "createdAt": "2026-10-27T15:21:16Z" }
```

`authorId` is `null` for posts filed under a name only; ids starting with `classic:` are imported public-domain
authors (no account, no chat). `source` is the attribution of imported content.

### Author

```json
{ "id": "classic:dickinson", "name": "Emily Dickinson", "classic": true, "poems": 446, "quotes": 0,
  "likes": 1, "mood": "NATURE", "bio": "Emily Dickinson (1830–1886). Poems…" }
```

`GET /authors/{id}` wraps it: `{ "author": {…}, "since": "…", "moods": [...], "mostLoved": {…Post}|null, "total": 446 }`.

## The signed-in member: `/api/v1/me` (token required)

| Method and path | What it does | Body → answer |
|---|---|---|
| `GET /me` | Who am I. | → `{ id, name, admin, bio }` |
| `PATCH /me` | Change display name and bio (also renames the author on own posts and comments). | `{ displayName, bio }` → `Me` |
| `GET /me/summary` | What deleting the account would remove. | → `{ posts, comments, likes, messages }` |
| `POST /me/deletion` | Delete the account and everything written. | `{ password }` → `204` |
| `POST /me/posts` | Publish. | `{ kind, title, body, source, mood }` → `201 Post` |
| `DELETE /me/posts/{id}` | Remove an own post (admins: any post). | → `204` |
| `GET /me/likes` | Ids of posts I gave a heart. | → `["id", …]` |
| `PUT /me/likes/{postId}` | Give a heart (idempotent). | → `{ liked, likeCount }` |
| `DELETE /me/likes/{postId}` | Take it back (idempotent). | → `{ liked, likeCount }` |
| `POST /me/comments` | Comment on a post. | `{ postId, body }` → `201 Comment` |
| `POST /me/reports` | Report a post to the admins. | `{ postId, reason }` → `202` |
| `GET /me/conversations` | My chats, newest first, with the unread total. | → `{ unread, items: [ConversationSummary] }` |
| `GET /me/conversations/{memberId}` | The chat with one member; reading marks their messages read. | → `{ otherId, otherName, items: [Message] }` |
| `POST /me/conversations/{memberId}/messages` | Send a message. | `{ body }` → `201 Message` |

## Moderation and members: `/api/v1/admin` (admin role)

| Method and path | What it does |
|---|---|
| `GET /admin/reports` | Open reports, newest first (`Page` of `Report`, each with the reported post). |
| `POST /admin/reports/{id}/dismiss` | Dismiss, the post stays. `204`. |
| `DELETE /admin/posts/{id}` | Remove any post with its hearts and comments; its open reports become `REMOVED`. `204`. |
| `GET /admin/members` | Members, newest first (`Page` of `{ id, email, displayName, role, status, since }`). `q` matches part of the email or name. |
| `PATCH /admin/members/{id}` | Change `role` (`user` \| `admin`) and/or `status` (`ACTIVE` \| `SUSPENDED`). Admins cannot demote or suspend themselves. |

## Examples

```bash
# the front page
curl -s http://localhost:8082/api/v1/daily | jq '.topPost.title, .moodOfTheDay, .authorOfTheDay.name'

# search
curl -s 'http://localhost:8082/api/v1/posts?q=rain&kind=POEM&size=5' | jq '.total, [.items[].title]'

# sign in, keep the token
TOKEN=$(curl -s -H 'Content-Type: application/json' \
  -d '{"email":"admin@verse.local","password":"password"}' http://localhost:8082/api/v1/auth/login | jq -r .accessToken)

# publish
curl -s -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"POEM","title":"Rain","body":"It falls.\nIt stays.","source":"","mood":"NATURE"}' \
  http://localhost:8082/api/v1/me/posts

# a heart, then take it back
curl -s -X PUT    -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/v1/me/likes/<postId>
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/v1/me/likes/<postId>

# an error, as problem+json
curl -s -H 'Content-Type: application/json' -d '{"email":"x","displayName":"","password":"1","over18":false}' \
  http://localhost:8082/api/v1/signup
```

## Reusing the backend

- **Services, not controllers, hold the rules.** `PostService`, `ReactionService`, `ChatService`,
  `ModerationService`, `AccountService`, `ProfileService` and `MemberService` know nothing about HTTP. The
  controllers in `api/` only map requests to them and results to the DTOs in `ApiModels`.
- **Reads come from `FeedIndex`**, an in-memory view of all posts, rebuilt when the shared `feed_version` counter
  moves (every write bumps it, every read checks it, so replicas stay in step), and queried through `Catalog`. For a much
  larger site, replace `FeedIndex` with a search index; the API stays.
- **Storage is plain JPA.** One table per concept (`members`, `posts`, `post_likes`, `comments`, `messages`,
  `reports`), created by the Flyway migrations in `server/src/main/resources/db/migration`. A schema change is a new
  `V<n>__<what>.sql` file; never edit one that has shipped.
- **Kinds and moods are data.** They are checked in `PostService` (`KINDS`, `MOODS`) and stored as strings; a new
  kind (`STORY`) or mood needs that set and a label in the client, nothing in the API.
- **Security is by path.** `SecurityConfiguration` opens the public reads, signup and login, requires a token for
  `/me/**` and the admin role for `/admin/**`; the controllers carry `@PreAuthorize` as a second line.

## Changing the API

1. Add or change the DTO in `ApiModels` (records, nullable fields documented with `@Schema`).
2. Add the endpoint to the matching controller with `@Operation(summary = …)`; secured ones under `/me` or
   `/admin`, public ones also in the `permitAll` list of `SecurityConfiguration`.
3. Map errors to `PostException` (422) or `AccessDeniedException` (403); anything else becomes a 500 with a safe
   message.
4. Add a case to `server/src/test/java/com/verse/server/VerseApiTest.java`, update this file, `client/src/verse/feedApi.ts`
   or `rpc.ts`, and refresh `docs/openapi.yaml` (`curl -s localhost:8082/v3/api-docs.yaml > docs/openapi.yaml`).
