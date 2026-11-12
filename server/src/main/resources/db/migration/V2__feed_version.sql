-- A change counter for the posts read model: every write to posts, likes or comments bumps it in the same
-- transaction, so each server replica notices changes made by the others (see FeedIndex).
create table feed_version (
    id      integer primary key,
    version bigint  not null
);
insert into feed_version (id, version) values (1, 0);
