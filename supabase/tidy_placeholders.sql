-- Remove the demo items the very first seed created.
--
-- Medium pepperoni, Medium BBQ chicken, Large meat lovers, Chicken wings (6),
-- Garlic bread and Classic pizza were placeholders, put there so the site had
-- something to show before any real menu existed. They were later switched
-- off rather than deleted, which is why they still appear on the menu reading
-- "Sold out today".
--
-- reset.sql removes them too, but it also wipes every order and customer.
-- This does nothing but take the placeholders away.
--
-- Safe to run twice. An item that has genuinely been ordered is kept rather
-- than deleted, since an order has to keep pointing at what was ordered.

delete from item_options o
using item_option_groups g, menu_items m
where o.group_id = g.id
  and g.menu_item_id = m.id
  and m.name in ('Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
                 'Chicken wings (6)', 'Garlic bread', 'Classic pizza',
                 'Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
                 'Refuel Meal', 'Zinger burger meal')
  and not exists (select 1 from order_items oi where oi.menu_item_id = m.id);

delete from item_option_groups g
using menu_items m
where g.menu_item_id = m.id
  and m.name in ('Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
                 'Chicken wings (6)', 'Garlic bread', 'Classic pizza',
                 'Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
                 'Refuel Meal', 'Zinger burger meal')
  and not exists (select 1 from order_items oi where oi.menu_item_id = m.id);

delete from menu_items m
where m.name in ('Medium pepperoni', 'Medium BBQ chicken', 'Large meat lovers',
                 'Chicken wings (6)', 'Garlic bread', 'Classic pizza',
                 'Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
                 'Refuel Meal', 'Zinger burger meal')
  and not exists (select 1 from order_items oi where oi.menu_item_id = m.id);

-- Burger Nation was seeded as a placeholder before Burger King had a menu.
-- It goes entirely, along with anything filed under it.
delete from menu_items m
using restaurants r
where m.restaurant_id = r.id
  and r.name ilike '%burger nation%'
  and not exists (select 1 from order_items oi where oi.menu_item_id = m.id);

delete from restaurants r
where r.name ilike '%burger nation%'
  and not exists (select 1 from menu_items m where m.restaurant_id = r.id);

-- Anything still switched off across the whole site, so you can see at a
-- glance what a customer is being shown as sold out.
select r.name as restaurant, m.name, m.price_food
from menu_items m
     join restaurants r on r.id = m.restaurant_id
where not m.available
order by r.name, m.name;
