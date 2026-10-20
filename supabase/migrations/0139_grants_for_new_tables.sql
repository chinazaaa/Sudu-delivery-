-- New tables keep working when Supabase stops granting them automatically.
--
-- From 30 October 2026, a table created in "public" gets no Data API access
-- of its own: supabase-js, PostgREST and GraphQL all answer "permission
-- denied" until somebody writes a GRANT. Existing tables keep what they
-- have, so nothing here is broken today; the next table anybody adds would
-- have been, in every query touching it, and the error arrives at runtime
-- rather than at deploy.
--
-- Default privileges put it back for this project rather than asking every
-- future migration to remember. They attach to the role that creates the
-- table, which here is postgres: it owns all fifty-nine of them and it is
-- what runs migrations, whether from the dashboard, the CLI or a branch.
--
-- service_role only. The shop has no customer accounts: every read and
-- write goes through server code holding the service key, and RLS refuses
-- everything else. Granting anon a default select on every table the shop
-- ever adds would widen the surface for a role it does not use.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

-- Sequences go with them, or an insert into a table with a generated key
-- fails on the sequence instead of on the table.
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
