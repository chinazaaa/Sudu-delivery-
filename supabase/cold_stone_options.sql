-- Cold Stone: the questions an ice cream actually asks.
--
-- Two whole families of products went in as bare flavours. A scoop and a
-- signature creation are both made to order at the counter, and both are
-- priced by the cup you pick, so ordering one without a cup size is not an
-- order anybody can fill. The kitchen was being asked to guess.
--
-- Plain flavours (Ice cream by the scoop) carry the Cyo questions.
-- Ready to love flavours (Signature creations) carry the Rtl questions.
-- Both then ask about waffles and toppings, in the order the counter asks.
--
-- Cup size is the only required question in each family. Everything else is
-- something somebody may want and may not.
--
-- Prices are the add-on prices from the Cold Stone list, so a customer sees
-- the same numbers here as anywhere else.
--
-- Safe to run twice: these groups are rebuilt from scratch on every run, so a
-- price change here replaces what was there. Nothing else on the items is
-- touched.

drop table if exists cs_opt;
create table cs_opt (
  family   text    not null,
  grp      text    not null,
  required boolean not null,
  maxsel   int     not null,
  gsort    int     not null,
  label    text    not null,
  delta    int     not null,
  osort    int     not null
);

-- Plain flavours: cup size, then how the waffle is done, then what goes in,
-- then the waffle itself.
insert into cs_opt (family, grp, required, maxsel, gsort, label, delta, osort) values
  ('scoop', 'Cyo cup size', true, 1, 1, 'Cyo Kid Size',         0, 1),
  ('scoop', 'Cyo cup size', true, 1, 1, 'Cyo Like It',        840, 2),
  ('scoop', 'Cyo cup size', true, 1, 1, 'Cyo Love It',       2880, 3),
  ('scoop', 'Cyo cup size', true, 1, 1, 'Cyo Gotta Have It', 4080, 4),
  ('scoop', 'Cyo cup size', true, 1, 1, 'Cyo Mine',          5280, 5),
  ('scoop', 'Cyo cup size', true, 1, 1, 'Cyo Ours Cup',     15600, 6),

  ('scoop', 'How would you like your waffle?', false, 1, 2, 'Crushed-In Waffle', 0, 1),
  ('scoop', 'How would you like your waffle?', false, 1, 2, 'Packed Waffle',     0, 2),
  ('scoop', 'How would you like your waffle?', false, 1, 2, 'Served-In Waffle',  0, 3),

  ('scoop', 'Toppings', false, 3, 3, 'Brown Coconut Shavings',  800,  1),
  ('scoop', 'Toppings', false, 3, 3, 'Pie Crust',               800,  2),
  ('scoop', 'Toppings', false, 3, 3, 'White Coconut Shavings',  800,  3),
  ('scoop', 'Toppings', false, 3, 3, 'Cashew Nut',              960,  4),
  ('scoop', 'Toppings', false, 3, 3, 'Oreo Cookies',           1100,  5),
  ('scoop', 'Toppings', false, 3, 3, 'M&M',                    1320,  6),
  ('scoop', 'Toppings', false, 3, 3, 'Snickers',               1320,  7),
  ('scoop', 'Toppings', false, 3, 3, 'Rainbow Sprinkles',      1320,  8),
  ('scoop', 'Toppings', false, 3, 3, 'Twix',                   1320,  9),
  ('scoop', 'Toppings', false, 3, 3, 'Peanut Butter',          1320, 10),
  ('scoop', 'Toppings', false, 3, 3, 'Strawberry',             1400, 11),
  ('scoop', 'Toppings', false, 3, 3, 'White Chocolate Chips',  1680, 12),
  ('scoop', 'Toppings', false, 3, 3, 'Dark Coconut Chips',     1680, 13),
  ('scoop', 'Toppings', false, 3, 3, 'Almond',                 1920, 14),
  ('scoop', 'Toppings', false, 3, 3, 'Gummy Bear',             1920, 15),

  ('scoop', 'Waffles', false, 1, 4, 'Plain Waffle',   1080, 1),
  ('scoop', 'Waffles', false, 1, 4, 'Dipped Waffle',  1320, 2),
  ('scoop', 'Waffles', false, 1, 4, 'Coated Waffle',  1560, 3);

-- Ready to love flavours. Same waffles and toppings, a different ladder of
-- cups, and the counter asks about the waffle before the toppings.
insert into cs_opt (family, grp, required, maxsel, gsort, label, delta, osort) values
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Kid''s Size',         0, 1),
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Like It',           960, 2),
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Love It',          1680, 3),
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Gotta Have It Size',3720, 4),
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Mine Size',        5880, 5),
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Ours Size',       13680, 6),
  ('signature', 'Rtl cup size', true, 1, 1, 'Rtl Everybody Size',  23520, 7),

  ('signature', 'Waffles', false, 1, 2, 'Plain Waffle',   1080, 1),
  ('signature', 'Waffles', false, 1, 2, 'Dipped Waffle',  1320, 2),
  ('signature', 'Waffles', false, 1, 2, 'Coated Waffle',  1560, 3),

  ('signature', 'How would you like your waffle?', false, 1, 3, 'Crushed-In Waffle', 0, 1),
  ('signature', 'How would you like your waffle?', false, 1, 3, 'Packed Waffle',     0, 2),
  ('signature', 'How would you like your waffle?', false, 1, 3, 'Served-In Waffle',  0, 3),

  ('signature', 'Toppings', false, 3, 4, 'Brown Coconut Shavings',  800,  1),
  ('signature', 'Toppings', false, 3, 4, 'Pie Crust',               800,  2),
  ('signature', 'Toppings', false, 3, 4, 'White Coconut Shavings',  800,  3),
  ('signature', 'Toppings', false, 3, 4, 'Cashew Nut',              960,  4),
  ('signature', 'Toppings', false, 3, 4, 'Oreo Cookies',           1100,  5),
  ('signature', 'Toppings', false, 3, 4, 'M&M',                    1320,  6),
  ('signature', 'Toppings', false, 3, 4, 'Snickers',               1320,  7),
  ('signature', 'Toppings', false, 3, 4, 'Rainbow Sprinkles',      1320,  8),
  ('signature', 'Toppings', false, 3, 4, 'Twix',                   1320,  9),
  ('signature', 'Toppings', false, 3, 4, 'Peanut Butter',          1320, 10),
  ('signature', 'Toppings', false, 3, 4, 'Strawberry',             1400, 11),
  ('signature', 'Toppings', false, 3, 4, 'White Chocolate Chips',  1680, 12),
  ('signature', 'Toppings', false, 3, 4, 'Dark Coconut Chips',     1680, 13),
  ('signature', 'Toppings', false, 3, 4, 'Almond',                 1920, 14),
  ('signature', 'Toppings', false, 3, 4, 'Gummy Bear',             1920, 15);

do $coldstoneopts$
declare
  r       uuid;
  scoops  uuid;
  sigs    uuid;
  n       int;
begin
  select id into r from restaurants
  where name ilike '%cold stone%' or name ilike '%coldstone%'
  limit 1;
  if r is null then
    raise notice 'Cold Stone is not on the menu yet. Run cold_stone_full.sql first.';
    return;
  end if;

  select id into scoops from menu_categories
  where restaurant_id = r and name = 'Ice cream by the scoop' limit 1;
  select id into sigs from menu_categories
  where restaurant_id = r and name = 'Signature creations' limit 1;

  if scoops is null and sigs is null then
    raise notice 'Neither section was found. Run cold_stone_full.sql first.';
    return;
  end if;

  -- Rebuilt rather than patched, so this file is the whole truth about these
  -- groups and a second run cannot double anything up.
  delete from item_option_groups g
  using menu_items m
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and m.category_id in (scoops, sigs)
    and g.name in (select distinct grp from cs_opt);

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select m.id, v.grp, v.required, v.maxsel, v.gsort
  from menu_items m
       join (select distinct family, grp, required, maxsel, gsort from cs_opt) v
         on (v.family = 'scoop'     and m.category_id = scoops)
         or (v.family = 'signature' and m.category_id = sigs)
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, o.label, o.delta, o.osort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join cs_opt o
         on o.grp = g.name
        and ((o.family = 'scoop'     and m.category_id = scoops)
          or (o.family = 'signature' and m.category_id = sigs))
  where m.restaurant_id = r;

  select count(*) into n from menu_items
  where restaurant_id = r and category_id in (scoops, sigs);

  raise notice '% flavours now ask for a cup size, a waffle and toppings.', n;
end $coldstoneopts$;

drop table if exists cs_opt;
