-- Room in the car for the three menus that came in after 0044.
--
-- 0044 set drinks to a quarter of a container so four of them ride in the
-- space of one meal, and ran before Yin Yang Express, DO Bowls and Jay's
-- Diner existed. Everything in those three landed at a whole container, so a
-- can of Pepsi took as much room as a burrito bowl and pushed an order up a
-- rung on the delivery ladder by itself.
--
-- Matched by section rather than by a pattern over names: a regex over the
-- whole menu is how thirty five micellar waters and a fruit salad once
-- became drinks. Every figure here is editable per item in admin.
update menu_items mi
set container_pct = v.pct
from restaurants r, menu_categories mc,
     (values
       -- A card is flat. It takes no room at all, and an order of nothing
       -- but cards still counts as one container because the ladder starts
       -- there.
       ('DO Bowls', 'Cards and Stickers', 0),
       ('DO Bowls', 'Drinks', 25),
       -- Tubs, not meals.
       ('Jay''s Diner', 'Sauce Dips', 25)
     ) as v(shop_name, section_name, pct)
where mi.restaurant_id = r.id
  and mi.category_id = mc.id
  and r.name = v.shop_name
  and mc.name = v.section_name;

-- One section, two sizes: a bottle of Coke is a quarter, a milkshake is a
-- tall cup that will not sit four to a box.
update menu_items mi
set container_pct = case when mi.name ilike '%shake%' then 50 else 25 end
from restaurants r, menu_categories mc
where mi.restaurant_id = r.id
  and mi.category_id = mc.id
  and r.name = 'Jay''s Diner'
  and mc.name = 'Milkshake & Drinks';
