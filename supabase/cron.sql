-- The daily recap of carts nobody finished, scheduled from Supabase rather
-- than from the host. Keeping the schedule with the data means it survives a
-- change of hosting, and it does not use up a hosting plan's cron allowance.
--
-- Run this once, after editing the two values below.

-- Supabase ships both of these; enabling them is idempotent.
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- Replace the site address with your own, and the secret with whatever
-- CRON_SECRET is set to in the host's environment. With no CRON_SECRET set,
-- drop the "?key=..." from the end.
--
-- 08:00 UTC is 9am in Lagos, which is early enough to chase a lunchtime run.
select cron.schedule(
  'sudu-abandoned-carts-daily',
  '0 8 * * *',
  $$
  select net.http_get(
    url := 'https://sudu-delivery.vercel.app/api/abandoned?key=REPLACE_WITH_CRON_SECRET',
    timeout_milliseconds := 20000
  );
  $$
);

-- Useful afterwards:
--   select * from cron.job;                       -- what is scheduled
--   select * from cron.job_run_details
--     order by start_time desc limit 10;          -- did it run, and what happened
--   select cron.unschedule('sudu-abandoned-carts-daily');
