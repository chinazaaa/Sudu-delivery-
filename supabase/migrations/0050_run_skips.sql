-- Days the schedule calls for and you have deliberately taken off.
--
-- Deleting an empty run used to be unwinnable: admin opens every run the week
-- calls for, so a deleted Friday was back within the minute. It was marked
-- cancelled instead, which stopped it coming back but left it on the page
-- reading "cancelled" when what was wanted was gone.
--
-- One row here is a date and a slot the opener passes over. Opening a month
-- deliberately clears the ones inside it, which is how a day comes back.
create table if not exists run_skips (
  run_date date not null,
  slot batch_slot not null,
  created_at timestamptz not null default now(),
  primary key (run_date, slot)
);

alter table run_skips enable row level security;
