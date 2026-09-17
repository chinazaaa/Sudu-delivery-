-- Emptying out the testing, ready for the first real order.
--
-- THIS DELETES DATA PERMANENTLY. Read it before running it.
--
-- It removes:
--   every order, and everything hanging off one
--   every group order and the people named in them
--   every saved cart
--   every customer, and with them every PIN
--   every run, past and future, so none of the test runs is left on the shop
--   every payout recorded against a promoter
--
-- It keeps:
--   the restaurants, the menus, the photographs, the questions on a meal
--   settings, the strip, the delivery bands, the message templates
--   the blocks you deliver to
--   the promoters themselves, their codes, PINs and bank details
--   the weekly schedule, which is what builds the runs back
--
-- Order numbers start again at 1001.
--
-- AFTERWARDS: open Admin, Runs. The schedule opens the next few runs on its
-- own the moment admin loads, so the shop has somewhere to take orders. Check
-- Admin, Schedule first and make sure the days and times on it are the ones
-- you actually want.
--
-- Run it in one go. Safe to run twice: the second time there is nothing left
-- to remove.

begin;

-- Orders, deepest table first so nothing is left pointing at a missing row.
delete from order_item_options;
delete from order_items;
delete from orders;
delete from group_members;
delete from order_groups;

-- Carts that never became orders.
delete from carts;

-- The customer book, PINs and all. Anyone who orders again is created fresh.
delete from customers;

-- Payouts recorded against test runs, then the runs themselves. Nothing is
-- ordered on them any more, so they go rather than sitting on the shop as
-- empty nights. What each run cost is kept on the run, so it goes with it.
delete from promoter_payouts;
delete from coupon_runs;
delete from batches;

-- Order numbers start again, since nothing is using the old ones.
alter sequence order_no_seq restart with 1001;

commit;

-- What is left, to check before opening the shop.
select
  (select count(*) from orders)      as orders,
  (select count(*) from customers)   as customers,
  (select count(*) from carts)       as carts,
  (select count(*) from batches)     as runs,
  (select count(*) from run_schedule where active) as schedule_rows,
  (select count(*) from menu_items)  as menu_items,
  (select count(*) from menu_items where available) as on_sale,
  (select count(*) from hostels where active) as blocks;
