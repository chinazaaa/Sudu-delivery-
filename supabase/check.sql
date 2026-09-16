-- What is actually in this database? Paste into the Supabase SQL editor and
-- run. It changes nothing, and it works whether or not the tables exist.

create or replace function pg_temp.rows_in(target text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  if to_regclass(target) is null then return -1; end if;   -- -1 means no table
  execute format('select count(*) from %s', target) into n;
  return n;
end $$;

select
  pg_temp.rows_in('public.restaurants') as restaurants,
  pg_temp.rows_in('public.menu_items')  as menu_items,
  pg_temp.rows_in('public.batches')     as batches,
  pg_temp.rows_in('public.orders')      as orders,
  pg_temp.rows_in('public.settings')    as settings,
  (to_regclass('public.order_groups') is not null)            as has_groups_table,
  exists (select 1 from information_schema.columns
          where table_name = 'batches' and column_name = 'flash_fee')  as has_flash_fee,
  exists (select 1 from information_schema.columns
          where table_name = 'batches' and column_name = 'stage')      as has_stage,
  exists (select 1 from information_schema.columns
          where table_name = 'customers' and column_name = 'pin')      as has_pin,
  case
    when to_regclass('public.restaurants') is null then 'Schema missing. Run setup.sql.'
    when not exists (select 1 from information_schema.columns
                     where table_name = 'batches' and column_name = 'flash_fee')
      then 'Schema is only partly applied. Run setup.sql again.'
    when pg_temp.rows_in('public.restaurants') = 0
      then 'Schema is complete but the menu is empty. Run setup.sql again, or add a restaurant in Admin, Menu.'
    else 'Everything is in place.'
  end as verdict;
