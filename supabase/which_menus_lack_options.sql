-- Which menus still ask nothing.
--
-- Read only. It changes nothing, and is safe to run on a live database at any
-- time, including mid run.
--
-- An item that should ask something and does not is an order that reaches the
-- counter without saying which side, which drink or which size, and somebody
-- has to guess or ring the customer back.

select
  r.name                                             as restaurant,
  count(*)                                           as items_on_sale,
  count(*) filter (where g.id is null)               as ask_nothing,
  count(*) filter (where g.id is not null)           as ask_something,
  round(
    100.0 * count(*) filter (where g.id is not null) / greatest(count(*), 1)
  )                                                  as percent_asking
from menu_items m
join restaurants r on r.id = m.restaurant_id
left join lateral (
  select 1 as id from item_option_groups gg where gg.menu_item_id = m.id limit 1
) g on true
where m.available
group by r.name
order by ask_nothing desc, r.name;

-- And the items themselves, for whichever restaurant you want to fix first.
-- Put its name in and run this one.
--
--   select m.name, m.price_food
--   from menu_items m join restaurants r on r.id = m.restaurant_id
--   where r.name ilike '%burger king%'
--     and m.available
--     and not exists (
--       select 1 from item_option_groups g where g.menu_item_id = m.id
--     )
--   order by m.name;
