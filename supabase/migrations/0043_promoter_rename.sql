-- Letting a promoter's code change without losing who they brought.
--
-- The code is the key: a customer carries it for life, an order carries it,
-- a payout is filed under it. So renaming one meant orphaning all of that,
-- and being stuck with whatever was typed the day somebody was set up is a
-- poor reason to say no to them.
--
-- The database can move the children itself. Every reference becomes ON
-- UPDATE CASCADE, so a rename is one update and nothing is left pointing at
-- a code that no longer exists.
do $$
begin
  alter table customers drop constraint if exists customers_promoter_code_fkey;
  alter table customers add constraint customers_promoter_code_fkey
    foreign key (promoter_code) references promoters(code)
    on delete set null on update cascade;
exception when others then
  -- A database where that constraint was never named this way keeps what it
  -- has. A rename then refuses outright rather than half happening.
  raise notice 'customers.promoter_code left as it was';
end $$;

do $$
begin
  alter table orders drop constraint if exists orders_promoter_code_fkey;
  alter table orders add constraint orders_promoter_code_fkey
    foreign key (promoter_code) references promoters(code)
    on delete set null on update cascade;
exception when others then
  raise notice 'orders.promoter_code left as it was';
end $$;

do $$
begin
  alter table promoter_payouts drop constraint if exists promoter_payouts_promoter_code_fkey;
  alter table promoter_payouts add constraint promoter_payouts_promoter_code_fkey
    foreign key (promoter_code) references promoters(code)
    on delete cascade on update cascade;
exception when others then
  raise notice 'promoter_payouts.promoter_code left as it was';
end $$;
