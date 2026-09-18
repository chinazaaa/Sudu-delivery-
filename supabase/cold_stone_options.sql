-- Cold Stone: the questions an ice cream actually asks.
--
-- Three whole families of products went in as bare flavours. A plain scoop,
-- a signature creation and a ready to love tub are all priced by the cup you
-- pick, so ordering one without a cup size is not an order anybody can fill.
-- The kitchen was being asked to guess.
--
-- Plain flavours are the ones in Ice cream by the scoop. They carry the
-- create your own ladder. The creations in Signature creations carry the
-- bigger seven step ladder. Both then ask about waffles and toppings, in the
-- order the counter asks.
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

-- Plain flavours: the create your own ladder, a different set of prices from
-- the one the creations use.
insert into cs_opt (family, grp, required, maxsel, gsort, label, delta, osort) values
  ('scoop', 'Cup size', true, 1, 1, 'Kid Size',         0, 1),
  ('scoop', 'Cup size', true, 1, 1, 'Like It',        840, 2),
  ('scoop', 'Cup size', true, 1, 1, 'Love It',       2880, 3),
  ('scoop', 'Cup size', true, 1, 1, 'Gotta Have It', 4080, 4),
  ('scoop', 'Cup size', true, 1, 1, 'Mine',          5280, 5),
  ('scoop', 'Cup size', true, 1, 1, 'Ours Cup',     15600, 6),

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

-- The 7,200 creations. Cold Stone splits these into Ready to love and
-- Signature at the counter, but the two cup ladders are the same seven sizes
-- at the same prices, so one question covers both and nobody has to know
-- which family a flavour is in. The sizes are named plainly for the same
-- reason: Rtl and Signature are their words for their staff, not a
-- customer's.
insert into cs_opt (family, grp, required, maxsel, gsort, label, delta, osort) values
  ('signature', 'Cup size', true, 1, 1, 'Kid''s Size',      0, 1),
  ('signature', 'Cup size', true, 1, 1, 'Like It',        960, 2),
  ('signature', 'Cup size', true, 1, 1, 'Love It',       1680, 3),
  ('signature', 'Cup size', true, 1, 1, 'Gotta Have It', 3720, 4),
  ('signature', 'Cup size', true, 1, 1, 'Mine',          5880, 5),
  ('signature', 'Cup size', true, 1, 1, 'Ours',         13680, 6),
  ('signature', 'Cup size', true, 1, 1, 'Everybody',    23520, 7),

  ('signature', 'How would you like your waffle?', false, 1, 2, 'Crushed-In Waffle', 0, 1),
  ('signature', 'How would you like your waffle?', false, 1, 2, 'Packed Waffle',     0, 2),
  ('signature', 'How would you like your waffle?', false, 1, 2, 'Served-In Waffle',  0, 3),

  ('signature', 'Toppings', false, 3, 3, 'Brown Coconut Shavings',  800,  1),
  ('signature', 'Toppings', false, 3, 3, 'Pie Crust',               800,  2),
  ('signature', 'Toppings', false, 3, 3, 'White Coconut Shavings',  800,  3),
  ('signature', 'Toppings', false, 3, 3, 'Cashew Nut',              960,  4),
  ('signature', 'Toppings', false, 3, 3, 'Oreo Cookies',           1100,  5),
  ('signature', 'Toppings', false, 3, 3, 'M&M',                    1320,  6),
  ('signature', 'Toppings', false, 3, 3, 'Snickers',               1320,  7),
  ('signature', 'Toppings', false, 3, 3, 'Rainbow Sprinkles',      1320,  8),
  ('signature', 'Toppings', false, 3, 3, 'Twix',                   1320,  9),
  ('signature', 'Toppings', false, 3, 3, 'Peanut Butter',          1320, 10),
  ('signature', 'Toppings', false, 3, 3, 'Strawberry',             1400, 11),
  ('signature', 'Toppings', false, 3, 3, 'White Chocolate Chips',  1680, 12),
  ('signature', 'Toppings', false, 3, 3, 'Dark Coconut Chips',     1680, 13),
  ('signature', 'Toppings', false, 3, 3, 'Almond',                 1920, 14),
  ('signature', 'Toppings', false, 3, 3, 'Gummy Bear',             1920, 15),

  ('signature', 'Waffles', false, 1, 4, 'Plain Waffle',   1080, 1),
  ('signature', 'Waffles', false, 1, 4, 'Dipped Waffle',  1320, 2),
  ('signature', 'Waffles', false, 1, 4, 'Coated Waffle',  1560, 3);

-- Ready to love flavours. The same seven cup sizes as a creation, but the
-- counter asks about the waffle itself before asking how it is done, so the
-- questions are in their order rather than ours.
insert into cs_opt (family, grp, required, maxsel, gsort, label, delta, osort) values
  ('rtl', 'Cup size', true, 1, 1, 'Kid''s Size',      0, 1),
  ('rtl', 'Cup size', true, 1, 1, 'Like It',        960, 2),
  ('rtl', 'Cup size', true, 1, 1, 'Love It',       1680, 3),
  ('rtl', 'Cup size', true, 1, 1, 'Gotta Have It', 3720, 4),
  ('rtl', 'Cup size', true, 1, 1, 'Mine',          5880, 5),
  ('rtl', 'Cup size', true, 1, 1, 'Ours',         13680, 6),
  ('rtl', 'Cup size', true, 1, 1, 'Everybody',    23520, 7),

  ('rtl', 'Waffles', false, 1, 2, 'Plain Waffle',   1080, 1),
  ('rtl', 'Waffles', false, 1, 2, 'Dipped Waffle',  1320, 2),
  ('rtl', 'Waffles', false, 1, 2, 'Coated Waffle',  1560, 3),

  ('rtl', 'How would you like your waffle?', false, 1, 3, 'Crushed-In Waffle', 0, 1),
  ('rtl', 'How would you like your waffle?', false, 1, 3, 'Packed Waffle',     0, 2),
  ('rtl', 'How would you like your waffle?', false, 1, 3, 'Served-In Waffle',  0, 3),

  ('rtl', 'Toppings', false, 3, 4, 'Brown Coconut Shavings',  800,  1),
  ('rtl', 'Toppings', false, 3, 4, 'Pie Crust',               800,  2),
  ('rtl', 'Toppings', false, 3, 4, 'White Coconut Shavings',  800,  3),
  ('rtl', 'Toppings', false, 3, 4, 'Cashew Nut',              960,  4),
  ('rtl', 'Toppings', false, 3, 4, 'Oreo Cookies',           1100,  5),
  ('rtl', 'Toppings', false, 3, 4, 'M&M',                    1320,  6),
  ('rtl', 'Toppings', false, 3, 4, 'Snickers',               1320,  7),
  ('rtl', 'Toppings', false, 3, 4, 'Rainbow Sprinkles',      1320,  8),
  ('rtl', 'Toppings', false, 3, 4, 'Twix',                   1320,  9),
  ('rtl', 'Toppings', false, 3, 4, 'Peanut Butter',          1320, 10),
  ('rtl', 'Toppings', false, 3, 4, 'Strawberry',             1400, 11),
  ('rtl', 'Toppings', false, 3, 4, 'White Chocolate Chips',  1680, 12),
  ('rtl', 'Toppings', false, 3, 4, 'Dark Coconut Chips',     1680, 13),
  ('rtl', 'Toppings', false, 3, 4, 'Almond',                 1920, 14),
  ('rtl', 'Toppings', false, 3, 4, 'Gummy Bear',             1920, 15);

do $coldstoneopts$
declare
  places int;
  n      int;
  g      int;
  o      int;
  stale  int;
  twice  int;
begin
  select count(*) into places from restaurants
  where name ilike '%cold stone%' or name ilike '%coldstone%';
  raise notice 'Cold Stone rows found: %', places;

  select count(*) into n
  from menu_items m
       join menu_categories c on c.id = m.category_id
       join restaurants rr on rr.id = m.restaurant_id
  where (rr.name ilike '%cold stone%' or rr.name ilike '%coldstone%')
    and c.name in ('Ice cream by the scoop', 'Signature creations', 'Ready to love flavours');
  raise notice 'Flavours in those three sections: %', n;

  if n = 0 then
    raise notice 'Nothing to do. Check the three section names in Admin, Menu.';
    return;
  end if;

  -- Rebuilt rather than patched, so this file is the whole truth about these
  -- groups and a second run cannot double anything up.
  --
  -- Cleared across the whole restaurant rather than inside the three sections.
  -- Tying the clean up to a section was the bug behind a flavour asking for a
  -- cup size twice: a group written while the flavour sat somewhere else was
  -- never reached, so the rename left the old one standing beside the new.
  -- Anything ending in cup size goes, whatever it is called, because there is
  -- no such question on a Cold Stone item that this file did not write.
  delete from item_option_groups gg
  using menu_items m, restaurants rr
  where gg.menu_item_id = m.id
    and rr.id = m.restaurant_id
    and (rr.name ilike '%cold stone%' or rr.name ilike '%coldstone%')
    and (
      gg.name in (select distinct grp from cs_opt)
      or gg.name ilike '%cup size%'
    );

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select m.id, v.grp, v.required, v.maxsel, v.gsort
  from menu_items m
       join menu_categories c on c.id = m.category_id
       join restaurants rr on rr.id = m.restaurant_id
       join (select distinct family, grp, required, maxsel, gsort from cs_opt) v
         on (v.family = 'scoop'     and c.name = 'Ice cream by the scoop')
         or (v.family = 'signature' and c.name = 'Signature creations')
         or (v.family = 'rtl'       and c.name = 'Ready to love flavours')
  where rr.name ilike '%cold stone%' or rr.name ilike '%coldstone%';
  get diagnostics g = row_count;

  insert into item_options (group_id, name, price_delta, sort_order)
  select gg.id, x.label, x.delta, x.osort
  from item_option_groups gg
       join menu_items m on m.id = gg.menu_item_id
       join menu_categories c on c.id = m.category_id
       join restaurants rr on rr.id = m.restaurant_id
       join cs_opt x
         on x.grp = gg.name
        and ((x.family = 'scoop'     and c.name = 'Ice cream by the scoop')
          or (x.family = 'signature' and c.name = 'Signature creations')
          or (x.family = 'rtl'       and c.name = 'Ready to love flavours'))
  where rr.name ilike '%cold stone%' or rr.name ilike '%coldstone%';
  get diagnostics o = row_count;

  raise notice '% flavours now carry % question groups and % choices.', n, g, o;

  -- Said out loud, because the only way to know this worked is to look. Both
  -- of these must read 0. Anything else means a flavour is still asking the
  -- same question twice.
  select count(*) into stale
  from item_option_groups gg
       join menu_items m on m.id = gg.menu_item_id
       join restaurants rr on rr.id = m.restaurant_id
  where (rr.name ilike '%cold stone%' or rr.name ilike '%coldstone%')
    and gg.name ilike '%cup size%'
    and gg.name <> 'Cup size';
  raise notice 'Old cup size groups left behind: %', stale;

  select count(*) into twice from (
    select gg.menu_item_id
    from item_option_groups gg
         join menu_items m on m.id = gg.menu_item_id
         join restaurants rr on rr.id = m.restaurant_id
    where rr.name ilike '%cold stone%' or rr.name ilike '%coldstone%'
    group by gg.menu_item_id, gg.name
    having count(*) > 1
  ) d;
  raise notice 'Flavours asking the same question twice: %', twice;
end $coldstoneopts$;

drop table if exists cs_opt;
