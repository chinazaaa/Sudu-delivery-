-- Clearing out the test data before going live.
--
-- THIS DELETES DATA PERMANENTLY. Read it before running it.
--
-- It removes:
--   every order, and everything hanging off one
--   every group order and the people named in them
--   every saved cart
--   every customer, and with them every PIN
--   the ten placeholder menu items seeded before the real menus arrived
--
-- It keeps:
--   the restaurants
--   every menu item, category, size, crust and extra you imported yourself
--   settings, hostels, promoters, delivery bands, message templates
--   the runs themselves, which simply have no orders on them afterwards
--
-- Run it in one go. Anything that fails leaves the rest untouched.

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

-- Order numbers start again at 1001, since nothing is using the old ones.
alter sequence order_no_seq restart with 1001;

-- The placeholder items seeded before the real menus were imported. They were
-- hidden rather than deleted so old orders kept their item names; with the
-- orders gone there is nothing left to protect.
delete from item_options where group_id in (
  select g.id from item_option_groups g
  join menu_items m on m.id = g.menu_item_id
  join restaurants r on r.id = m.restaurant_id
  where (r.name ilike '%kfc%' and m.name in (
           'Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
           'Refuel Meal', 'Zinger burger meal'))
     or (r.name ilike '%domino%' and m.name in (
           'Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
           'Chicken wings (6)', 'Garlic bread'))
);

delete from item_option_groups where menu_item_id in (
  select m.id from menu_items m
  join restaurants r on r.id = m.restaurant_id
  where (r.name ilike '%kfc%' and m.name in (
           'Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
           'Refuel Meal', 'Zinger burger meal'))
     or (r.name ilike '%domino%' and m.name in (
           'Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
           'Chicken wings (6)', 'Garlic bread'))
);

delete from menu_items m
using restaurants r
where r.id = m.restaurant_id
  and ((r.name ilike '%kfc%' and m.name in (
          'Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
          'Refuel Meal', 'Zinger burger meal'))
    or (r.name ilike '%domino%' and m.name in (
          'Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
          'Chicken wings (6)', 'Garlic bread')));

commit;

-- What is left, to check before opening the shop.
select
  (select count(*) from orders)     as orders,
  (select count(*) from customers)  as customers,
  (select count(*) from carts)      as carts,
  (select count(*) from menu_items) as menu_items,
  (select count(*) from menu_items where available) as on_sale;
