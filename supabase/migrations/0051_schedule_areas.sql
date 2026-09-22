-- Where the runs a weekday opens actually go.
--
-- A run always passes Sangotedo and goes anywhere else only if somebody said
-- so. That was only ever said on a run itself, one run at a time, after it
-- had opened. Runs open weeks ahead by themselves, so "my Saturday run goes
-- to Lekki" meant ticking a box on every Saturday forever, and a week that
-- was missed is a restaurant nobody can order from with no sign of why.
alter table run_schedule
  add column if not exists areas text not null default '';
