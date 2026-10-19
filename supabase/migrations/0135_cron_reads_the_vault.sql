-- Every scheduled job reads the secret at the moment it fires.
--
-- Two separate faults, both silent, found on a day the shop had two carts
-- sitting unpaid against an open run and nobody was told about either.
--
-- The first: three of the four jobs carried the secret in the address,
-- pasted in by hand when cron.sql was first run. The secret in Vercel was
-- changed at some point afterwards, as secrets are, and from that moment
-- every one of those jobs answered 401. The daily cart email, the
-- closing-soon warning to customers, and the sweep that closes shared
-- deliveries had all been failing, the last of them once a minute.
--
-- The second: the alerts job was created as a POST to a route that only
-- answers GET, so it had never once run since the day it was written. It
-- returned 405 before the handler was reached, which is why no amount of
-- checking the secret would ever have explained it.
--
-- So nothing holds a copy of the secret any more. Each job reads the vault
-- when it fires, which is what the alerts job always did and the reason it
-- was the only one that would still have worked. Rotating the secret is now
-- one vault update and nothing else.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- GET, because that is the only method the route answers.
select cron.schedule(
  'sudu-alerts',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := 'https://sudu.store/api/cron/alerts',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cron_secret' limit 1
      )
    ),
    timeout_milliseconds := 20000
  );
  $job$
);

select cron.schedule(
  'sudu-abandoned-carts-daily',
  '0 8 * * *',
  $job$
  select net.http_get(
    url := 'https://sudu.store/api/abandoned?key=' || (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'cron_secret' limit 1
    ),
    timeout_milliseconds := 20000
  );
  $job$
);

select cron.schedule(
  'sudu-closing-soon',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := 'https://sudu.store/api/notify/closing?key=' || (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'cron_secret' limit 1
    ),
    timeout_milliseconds := 20000
  );
  $job$
);

select cron.schedule(
  'sudu-close-shared-deliveries',
  '*/5 * * * *',
  $job$
  select net.http_get(
    url := 'https://sudu.store/api/groups/close?key=' || (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'cron_secret' limit 1
    ),
    timeout_milliseconds := 20000
  );
  $job$
);

-- Worth knowing afterwards: a job that runs is not a job that worked.
-- cron.job_run_details says the call was made; the status code says whether
-- the other end accepted it, and that is the one that was lying.
--
--   select r.status_code, count(*), max(r.created)
--   from net._http_response r
--   where r.created > now() - interval '1 day'
--   group by r.status_code;
