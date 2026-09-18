-- Every product, in the shape the import template asks for.
--
-- Run it in the SQL editor, then use the download button above the results to
-- save it as CSV. The columns come out in the template order, so the file can
-- go straight into the other shop with no rearranging.
--
-- WHAT GOES WHERE
--   category       the restaurant it comes from, which is how a customer
--                  thinks about it. Swap in c.name below for the menu section
--                  instead, Burgers or Drinks and so on.
--   quantity       left empty, with infinite quantity set to Yes. Food is
--                  cooked on the night, so there is no stock count to keep.
--   sku            the restaurant in short, then a number, so every row has
--                  one and two restaurants cannot collide.
--   images         the photograph on the menu, empty where there is none.
--   discount price, cost price, weight
--                  left empty. Nothing here holds them.
--
-- Only what is on sale. Delete the available line to take everything,
-- including what is switched off.

select
  m.name                                       as "name",
  m.description                                as "description",
  m.price_food                                 as "price",
  ''                                           as "discount price",
  ''                                           as "quantity",
  'Yes'                                        as "infinite quantity",
  r.name                                       as "category",
  ''                                           as "cost price",
  ''                                           as "weight",
  upper(regexp_replace(left(r.name, 12), '[^a-zA-Z0-9]', '', 'g'))
    || '-'
    || lpad((row_number() over (partition by r.id order by m.sort_order, m.name))::text, 4, '0')
                                               as "sku",
  m.image_url                                  as "images"
from menu_items m
join restaurants r on r.id = m.restaurant_id
left join menu_categories c on c.id = m.category_id
where m.available
  and r.active
order by r.name, m.sort_order, m.name;
