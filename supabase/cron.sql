-- The two things Sudu has to do on a clock, scheduled from Supabase rather
-- than from the host.
--
-- Keeping the schedule with the data means it survives a change of hosting,
-- and it does not use up the cron allowance of a hosting plan.
--
--   1. Chase the carts nobody finished, once a morning.
--   2. Tell people a run is closing, ninety minutes before the cut off.
--   3. Close shared deliveries whose fifteen minutes are up.
--
-- Neither sends anything twice: an abandoned cart is marked once it has been
-- reported, and a run carries the time it was warned about.
--
-- BEFORE YOU RUN THIS
--
-- Replace REPLACE_WITH_CRON_SECRET everywhere below, in all three addresses,
-- with whatever CRON_SECRET is set to in Vercel. If you have not set one,
-- delete the whole "?key=REPLACE_WITH_CRON_SECRET" from each address and the
-- endpoints will answer without it. Setting one is better: without it anybody who guesses the
-- address can make the shop send notifications.
--
-- Safe to run twice: each job is unscheduled first, so running this again
-- replaces what is there rather than doubling it.

-- Supabase ships both of these, and enabling them is idempotent.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Carts filled in and left. 08:00 UTC is 9am in Lagos, early enough to chase
-- somebody before a lunchtime run closes.
select cron.unschedule('sudu-abandoned-carts-daily')
where exists (select 1 from cron.job where jobname = 'sudu-abandoned-carts-daily');

select cron.schedule(
  'sudu-abandoned-carts-daily',
  '0 8 * * *',
  $$
  select net.http_get(
    url := 'https://sudu.store/api/abandoned?key=REPLACE_WITH_CRON_SECRET',
    timeout_milliseconds := 20000
  );
  $$
);

-- Closing soon. Checked every quarter of an hour, because the warning goes out
-- in the ninety minutes before a cut off and a run has to be caught inside
-- that window. Most of these calls find nothing to do and cost nothing.
select cron.unschedule('sudu-closing-soon')
where exists (select 1 from cron.job where jobname = 'sudu-closing-soon');

select cron.schedule(
  'sudu-closing-soon',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://sudu.store/api/notify/closing?key=REPLACE_WITH_CRON_SECRET',
    timeout_milliseconds := 20000
  );
  $$
);

-- Shared deliveries whose fifteen minutes are up. Checked every minute,
-- because until a group closes nobody in it has a delivery fee and so nobody
-- can pay, and fifteen minutes is short enough that an hourly check would
-- leave people waiting three quarters of an hour for a total.
select cron.unschedule('sudu-close-shared-deliveries')
where exists (select 1 from cron.job where jobname = 'sudu-close-shared-deliveries');

select cron.schedule(
  'sudu-close-shared-deliveries',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://sudu.store/api/groups/close?key=REPLACE_WITH_CRON_SECRET',
    timeout_milliseconds := 20000
  );
  $$
);

-- Useful afterwards:
--
--   select jobname, schedule, active from cron.job;
--
--   select j.jobname, d.status, d.start_time, d.return_message
--   from cron.job_run_details d join cron.job j on j.jobid = d.jobid
--   order by d.start_time desc limit 20;
--
--   select cron.unschedule('sudu-closing-soon');
