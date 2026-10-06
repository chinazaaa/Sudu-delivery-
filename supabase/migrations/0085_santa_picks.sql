-- More than one thing off the same list.
--
-- A sixty thousand naira budget against a list of five thousand naira things
-- is not one present, it is five, and a column called wish_id can only ever
-- hold the first of them. So the choice moves out of the assignment and into
-- rows of its own.
--
-- Each one is its own errand, from its own shop, so each one past the first
-- costs another fetch. That is taken out of the budget rather than asked for
-- afterwards: the budget is theirs, whatever is not spent goes back to them,
-- and chasing somebody for another delivery fee in December is how a gift
-- does not get bought.
--
-- assignment_id and wish_id are unique together, so picking the same thing
-- twice is the double tap it almost always is rather than two of it.
create table if not exists santa_picks (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references santa_assignments(id) on delete cascade,
  wish_id       uuid not null references santa_wishes(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (assignment_id, wish_id)
);

create index if not exists santa_picks_assignment on santa_picks (assignment_id);

-- Whatever had already been chosen, kept.
insert into santa_picks (assignment_id, wish_id)
select id, wish_id from santa_assignments
where wish_id is not null
on conflict do nothing;
