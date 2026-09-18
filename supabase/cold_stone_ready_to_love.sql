-- Cold Stone: Ready to love flavours get their own section.
--
-- These are the tubs that are already made: you pick a cup and they scoop it.
-- They are not built to order the way a signature creation is, and Cold Stone
-- lists them apart from both the creations and the plain scoops. Ours had
-- them scattered: four filed as signature creations, one as a plain scoop and
-- one, Hennessey, filed as a topping.
--
-- Sweet Banana Cream and Hennessey stay switched off, because they are out of
-- stock, but they are priced properly now so that switching one back on in
-- Admin cannot sell ice cream for nothing.
--
-- Run this before cold_stone_options.sql, which then gives the new section
-- its own questions.
--
-- Safe to run twice.

do $rtl$
declare
  r     uuid;
  cat   uuid;
  moved int;
begin
  select id into r from restaurants
  where name ilike '%cold stone%' or name ilike '%coldstone%'
  limit 1;
  if r is null then
    raise notice 'Cold Stone is not on the menu yet. Run cold_stone_full.sql first.';
    return;
  end if;

  select id into cat from menu_categories
  where restaurant_id = r and name = 'Ready to love flavours' limit 1;

  -- Sits with the other 7,200 flavours rather than at the bottom, so the two
  -- families that cost the same are read together. The shove only happens the
  -- first time: doing it again on every run would walk the other sections
  -- further down the page each time.
  if cat is null then
    update menu_categories set sort_order = sort_order + 1
    where restaurant_id = r and sort_order >= 2;

    insert into menu_categories (restaurant_id, name, sort_order)
    values (r, 'Ready to love flavours', 2)
    returning id into cat;
  end if;

  update menu_items m
  set category_id = cat,
      price_food  = 7200,
      sort_order  = v.sort
  from (values
    ('SWEETCREAMBAILEYS', 1),
    ('COOKIESANDCREAM',   2),
    ('CHOCOMUDPIE',       3),
    ('AMERICONE',         4),
    ('SWEETBANANACREAM',  5),
    ('HENNESSEY',         6)
  ) as v(key, sort)
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g')) = v.key;
  get diagnostics moved = row_count;

  raise notice '% flavours moved into Ready to love flavours.', moved;

  -- A section nothing lives in any more is clutter in Admin.
  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $rtl$;
