-- Emptying out the testing, ready for the first real order.
--
-- THIS DELETES DATA PERMANENTLY. Read it before running it.
--
-- It removes:
--   every order, and everything hanging off one
--   every group order and the people named in them
--   every saved cart
--   every customer, and with them every PIN
--   every promoter, their PIN, their bank details and their payouts
--
-- It keeps:
--   the runs. They are on the schedule and have nothing ordered on them, so
--   they are ready for real orders. To clear those too, the last few lines of
--   this file say how.
--   the restaurants, the menus, the photographs, the questions on a meal
--   settings, the strip, the delivery bands, the message templates
--   the blocks you deliver to
--   the weekly schedule, and the runs it has already opened
--
-- Order numbers start again at 1001.
--
-- AFTERWARDS: set the real promoter up again under Admin, Promoter, and check
-- Admin, Runs reads the way you expect.
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

-- The promoters set up while testing, and every payout recorded against them.
-- Payouts first: they point at a promoter.
delete from promoter_payouts;
delete from promoters;

-- Order numbers start again, since nothing is using the old ones.
alter sequence order_no_seq restart with 1001;

commit;

-- What is left, to check before opening the shop.
select
  (select count(*) from orders)      as orders,
  (select count(*) from customers)   as customers,
  (select count(*) from carts)       as carts,
  (select count(*) from batches)     as runs_kept,
  (select count(*) from promoters)   as promoters,
  (select count(*) from run_schedule where active) as schedule_rows,
  (select count(*) from menu_items)  as menu_items,
  (select count(*) from menu_items where available) as on_sale,
  (select count(*) from hostels where active) as blocks;

-- THE RUNS, IF YOU WANT THEM GONE TOO. Not part of the above: a run with
-- nothing ordered on it is ready to take real orders, and the schedule would
-- only build the same ones back. Run these two lines on their own to clear
-- them, and open Admin, Runs afterwards so the schedule opens fresh ones.
--   delete from coupon_runs
--   delete from batches
