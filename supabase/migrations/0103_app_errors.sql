-- Where the server writes down what went wrong.
--
-- A failed render shows a reference number and keeps the real message in
-- the host's log, which is a different website behind a different login and
-- cannot be queried. Three crashes in one day each cost a round of reading
-- code and guessing, because the one sentence that would have ended it was
-- somewhere nobody in the conversation could reach. This is that sentence,
-- next to the same reference the page prints.
create table if not exists app_errors (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  digest text not null default '',
  message text not null default '',
  stack text not null default '',
  route text not null default '',
  method text not null default '',
  source text not null default ''
);

create index if not exists app_errors_at on app_errors (at desc);
create index if not exists app_errors_digest on app_errors (digest);

alter table app_errors enable row level security;
