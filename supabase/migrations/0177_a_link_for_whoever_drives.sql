-- A run somebody can drive without the admin password.
--
-- The run sheet already exists and is already phone shaped: one counter at
-- a time, what to collect, who it goes to. It is behind the admin login,
-- so the only person who can drive a run is a person trusted with the
-- whole shop. That is why the runner is family.
--
-- A token per run is the smallest thing that changes it. The link opens
-- one run and nothing else, shows what to buy and who to hand it to, and
-- stops working when the run is settled or the token is cleared. Nobody
-- holding it can see the money, another run, or anybody who did not order
-- on this one.
alter table batches
  add column if not exists runner_token text;

create unique index if not exists batches_runner_token_idx
  on batches (runner_token)
  where runner_token is not null;

comment on column batches.runner_token is
  'Opens this one run at /run/<token> without an admin login. Null means nobody is driving it but the shop.';

-- Which counters have been collected from, in the same pipe-wrapped shape
-- as areas and only_places: "|Dominos Pizza|KFC|".
--
-- On the run rather than per line, because collecting is a thing that
-- happens to a stop. Six lines at one counter come over the counter in one
-- bag and are ticked once.
alter table batches
  add column if not exists runner_got text not null default '';

comment on column batches.runner_got is
  'Counters already collected from on this run, pipe wrapped by name.';

-- Where to send the list before the car leaves.
--
-- The shop knows every line on tonight's run grouped by counter well
-- before anybody sets off, and sending that ahead is the difference
-- between collecting and queueing. It needs somewhere to send it.
alter table restaurants
  add column if not exists phone text not null default '';

comment on column restaurants.phone is
  'The counter''s own WhatsApp number, for sending the run list ahead. Empty means the list is read out at the counter.';
