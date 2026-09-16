-- Pictures. A menu of text reads like a spreadsheet; students order food they
-- can see. Images are URLs so they can be pasted in from anywhere, including
-- Supabase Storage, without this app owning an upload pipeline.

alter table restaurants
  add column if not exists logo_url   text not null default '',
  add column if not exists banner_url text not null default '',
  -- Used for the restaurant's tab and card when it has no logo.
  add column if not exists brand_hex  text not null default '';

alter table menu_items
  add column if not exists image_url   text not null default '',
  add column if not exists description text not null default '';
