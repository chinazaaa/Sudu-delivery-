-- The quarter-hourly check that sends the two alerts nothing else can.
--
-- Vercel's scheduler was the obvious home for this and is the wrong one:
-- on the plan this shop is on it runs a job once a day, and an alert about
-- a run closing in ninety minutes is worth nothing tomorrow. Supabase is
-- already paid for, already has pg_cron and pg_net turned on, and is the
-- same place every other scheduled thing would go.
--
-- The secret lives in the vault rather than in the command, because
-- cron.job is readable and a secret in it is a secret anybody with the
-- database can read. The route refuses to run without it: anything that
-- can buzz somebody's phone should not be callable by a stranger.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if secret is null then
    raise notice 'No cron_secret in the vault yet; the job is created and will 401 until there is one.';
  end if;
end $$;

select cron.schedule(
  'sudu-alerts',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://sudu.store/api/cron/alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cron_secret' limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
