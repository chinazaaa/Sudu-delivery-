-- Photo storage for menu items, restaurant logos and home page slides.
--
-- Run this once. Without it, every photo upload in admin fails with
-- "Bucket not found", because the app writes to a bucket called "menu".
-- Anyone can read (the photos are on the public menu); only the service
-- role writes, which is what the server uses.

insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do update set public = true;

drop policy if exists "menu photos are public" on storage.objects;
create policy "menu photos are public"
  on storage.objects for select
  using (bucket_id = 'menu');
