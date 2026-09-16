-- How the customer said they would pay, so the pay page shows the right thing
-- and admin knows who is waiting on a card link.

do $$ begin create type payment_method as enum ('transfer', 'card');
exception when duplicate_object then null; end $$;

alter table orders
  add column if not exists payment_method payment_method not null default 'transfer';
