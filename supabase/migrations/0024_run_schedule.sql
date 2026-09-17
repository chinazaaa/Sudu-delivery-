-- The week's runs, as a schedule rather than a constant in the code. Each row
-- is one run on one weekday: when ordering closes, and when it lands.
create table if not exists run_schedule (
  id          uuid primary key default gen_random_uuid(),
  /** 0 = Sunday, through 6 = Saturday, as JavaScript counts them. */
  weekday     int not null check (weekday between 0 and 6),
  slot        batch_slot not null,
  /** Lagos time. Ordering closes at this time on that day. */
  cut_off     time not null,
  /** What customers are told about when it lands. */
  window_text text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (weekday, slot)
);
alter table run_schedule enable row level security;

-- Friday afternoon and Friday night, which is where the brief starts. Only
-- seeded into an empty table, so an edited schedule is never overwritten.
insert into run_schedule (weekday, slot, cut_off, window_text)
select * from (values
  (5, 'afternoon'::batch_slot, time '11:30', 'On campus ~2:00pm'),
  (5, 'night'::batch_slot,     time '18:00', 'On campus ~8:30pm')
) as seed(weekday, slot, cut_off, window_text)
where not exists (select 1 from run_schedule);

notify pgrst, 'reload schema';
