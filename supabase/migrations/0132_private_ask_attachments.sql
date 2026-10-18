-- Attachments on a request go in a bucket nobody can read without a key.
--
-- The menu bucket is public, which is right for a photograph of a burger
-- and wrong for somebody's unsubmitted thesis: a project sitting at a
-- public address before it is marked is a plagiarism risk we would have
-- created ourselves. Admin reads these through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('asks', 'asks', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

-- It holds a storage path now, not a public URL.
alter table custom_requests rename column photo_url to file_path;
