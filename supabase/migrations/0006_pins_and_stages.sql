-- Customers get a PIN instead of an account: four digits, generated on their
-- first order, readable in admin so it can be sent on WhatsApp by hand.

alter table customers
  add column pin              text not null default lpad((floor(random() * 10000))::int::text, 4, '0'),
  add column pin_fail_count   int not null default 0,
  add column pin_locked_until timestamptz;

-- Where the run has got to. One tap per stage, shared by everyone in the batch,
-- which is the honest version of tracking: no rider app, no GPS.
create type batch_stage as enum (
  'ordering',
  'closed',
  'at_counter',
  'on_the_road',
  'at_drop',
  'handed_out'
);

alter table batches
  add column stage            batch_stage not null default 'ordering',
  add column stage_updated_at timestamptz not null default now();
