-- Somebody asking to become a promoter.
--
-- Promoters were made by hand in admin, which was right while there were
-- two of them and somebody had asked in person. A page on the shop that
-- says what the job is and takes an application turns that into something
-- people can find on their own, and the admin list is where they are
-- answered rather than an inbox where they are missed.
--
-- The application is not a promoter. It holds what somebody typed and
-- nothing else; approving it is what writes a promoters row, which is why
-- the code lives there and not here. Approved applications are kept rather
-- than deleted, so a shop can see who it turned down and who it did not.
create table if not exists promoter_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  -- Where they would be posting, in their own words: an Instagram handle, a
  -- course mates group, a hall. It is the whole of what this decides on.
  reach text not null default '',
  -- Their own words on why. Optional, and the thing most worth reading.
  said text not null default '',
  -- "new", "approved", "declined". Never deleted, so a decision can be
  -- looked back at.
  status text not null default 'new',
  -- The code they were given on approval, so the two can be joined later.
  code text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists promoter_applications_new_idx
  on promoter_applications (created_at desc)
  where status = 'new';

alter table promoter_applications enable row level security;
