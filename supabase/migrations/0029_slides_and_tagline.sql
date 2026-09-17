-- The slider on the home page, written and illustrated in admin rather than
-- assembled from whatever restaurants happen to exist.
create table if not exists slides (
  id         uuid primary key default gen_random_uuid(),
  headline   text not null,
  body       text not null default '',
  image_url  text not null default '',
  /** Where the button goes, and what it says. Blank hides the button. */
  link_url   text not null default '',
  link_text  text not null default '',
  active     boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
alter table slides enable row level security;

-- The line under the name in the header.
alter table settings add column if not exists tagline text not null default '';

notify pgrst, 'reload schema';
