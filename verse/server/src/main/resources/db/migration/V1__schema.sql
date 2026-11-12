-- Verse schema. Works on PostgreSQL (production) and H2 (development, tests).
-- Author ids are not foreign keys on purpose: imported classics ("classic:<slug>") and name-only authors have no
-- member row. Likes and comments go with their post; reports outlive it (status REMOVED).

create table members (
    id               varchar(36)  primary key,
    email            varchar(320) not null unique,
    display_name     varchar(40)  not null,
    password_hash    varchar(100) not null,
    role             varchar(16)  not null,
    status           varchar(16)  not null,
    bio              varchar(300),
    age_confirmed_at timestamp with time zone,
    created_at       timestamp with time zone not null
);

create table posts (
    id            varchar(36)   primary key,
    kind          varchar(16)   not null,
    title         varchar(200),
    body          varchar(10000) not null,
    source        varchar(500),
    mood          varchar(16),
    author_name   varchar(120)  not null,
    author_id     varchar(120),
    like_count    bigint        not null default 0,
    comment_count bigint        not null default 0,
    created_at    timestamp with time zone not null
);
create index posts_author_idx on posts (author_id);

create table post_likes (
    id         varchar(36) primary key,
    post_id    varchar(36) not null references posts (id) on delete cascade,
    member_id  varchar(36) not null,
    created_at timestamp with time zone not null,
    constraint post_likes_once unique (post_id, member_id)
);
create index post_likes_member_idx on post_likes (member_id);

create table comments (
    id          varchar(36)   primary key,
    post_id     varchar(36)   not null references posts (id) on delete cascade,
    body        varchar(1000) not null,
    author_name varchar(120)  not null,
    author_id   varchar(120)  not null,
    created_at  timestamp with time zone not null
);
create index comments_post_idx on comments (post_id);
create index comments_author_idx on comments (author_id);

create table messages (
    id              varchar(36)   primary key,
    conversation_id varchar(80)   not null,
    from_id         varchar(36)   not null,
    from_name       varchar(40)   not null,
    to_id           varchar(36)   not null,
    body            varchar(2000) not null,
    read_at         timestamp with time zone,
    created_at      timestamp with time zone not null
);
create index messages_conversation_idx on messages (conversation_id);
create index messages_from_idx on messages (from_id);
create index messages_to_idx on messages (to_id);

create table reports (
    id            varchar(36)  primary key,
    post_id       varchar(36)  not null,
    reporter_id   varchar(36)  not null,
    reporter_name varchar(40)  not null,
    reason        varchar(500),
    status        varchar(16)  not null,
    created_at    timestamp with time zone not null
);
create index reports_post_idx on reports (post_id);
create index reports_status_idx on reports (status);
