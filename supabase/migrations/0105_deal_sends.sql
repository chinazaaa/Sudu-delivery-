-- Every deal notification that actually left, kept.
--
-- Sending one was the only thing in admin that happened and then was not
-- written down anywhere. The page could show what this browser had sent
-- since it was opened, which empties on a reload, so the question whoever
-- is about to send asks first -- has this already gone out today, and did
-- the last one do anything -- had no answer on the screen at all.
--
-- A table of its own rather than a column anywhere, because a send is an
-- event: it hangs off nothing, and the only thing it is ever read against
-- is the clock.
create table if not exists deal_sends (
  id uuid primary key default gen_random_uuid(),
  -- Exactly what went, as it was sent. Not a reference to anything that
  -- could move afterwards: a history that reads today's menu to say what
  -- last week's notification said is not a history.
  title text not null default '',
  body text not null default '',
  -- Where tapping it opened, as the path the phone was handed.
  path text not null default '',
  -- How many phones took it, and how many it was offered to. The two differ
  -- when a token has died since the app was last opened.
  sent int not null default 0,
  audience int not null default 0,
  sent_at timestamptz not null default now()
);

create index if not exists deal_sends_at on deal_sends (sent_at desc);

alter table deal_sends enable row level security;

notify pgrst, 'reload schema';
