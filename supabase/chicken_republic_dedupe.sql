-- Chicken Republic: clear out the questions the retired file left behind.
--
-- WHAT WENT WRONG. The first Chicken Republic options file, written by hand
-- from the list you sent, called its drinks question Drink. The file that
-- replaced it is built from your export, which calls the same question Drinks,
-- and a file only clears away the questions it writes itself. So on six meals
-- both survived and the product page asked for a drink twice. The same thing
-- happened to the chips question, where the old file wrote Size (chips) and
-- the export writes Size (Chips) or Size.
--
-- The old questions also carry the old prices. A large chips was free on them
-- and is 1,200 on the export. A Monster was 1,800 and is 1,000. The export
-- wins, so the old ones go.
--
-- THREE THINGS HAPPEN HERE, and nothing else. No product is added, renamed,
-- priced, switched on or off, and no photograph is gone near.
--   1. A Drink question goes where the same meal already has the Drinks
--      question from the export, or a numbered Drink 1, Drink 2 from the
--      pot meals.
--   2. Every Size (chips) question goes. It is the old spelling, and nothing
--      writes it any more.
--   3. The four meals left with only the old Drink question keep it, but the
--      drinks in it are re-priced to the ones the export uses everywhere else.
--      They are Citizens Meal, Citizens Meal BOGOF, Quarter Rotisserie Combo
--      and ChickWhizz Meal: the meals whose descriptions name a side without
--      saying which sides, so the export gives them no question of its own.
--
-- Past orders are untouched: an order copies the wording and the price it was
-- given at the time.
--
-- Safe to run twice. Run it after chicken_republic_options.sql,
-- chicken_republic_pot_meals.sql and chicken_republic_choices.sql.

drop table if exists cr_std_drink;
create table cr_std_drink (name text not null, delta int not null, sort int not null);

insert into cr_std_drink (name, delta, sort) values ('Sprite (35cl)', 0, 1);
insert into cr_std_drink (name, delta, sort) values ('Mineral Water (75cl)', 0, 2);
insert into cr_std_drink (name, delta, sort) values ('Coca Cola (35cl)', 0, 3);
insert into cr_std_drink (name, delta, sort) values ('Fanta Orange (35cl)', 0, 4);
insert into cr_std_drink (name, delta, sort) values ('Schweppes Mojito (40cl)', 200, 5);
insert into cr_std_drink (name, delta, sort) values ('Schweppes Pineapple (40cl)', 200, 6);
insert into cr_std_drink (name, delta, sort) values ('Schweppes Chapman (40cl)', 200, 7);
insert into cr_std_drink (name, delta, sort) values ('Fanta Orange (50cl)', 350, 8);
insert into cr_std_drink (name, delta, sort) values ('Sprite (50cl)', 350, 9);
insert into cr_std_drink (name, delta, sort) values ('Coca Cola (50cl)', 350, 10);
insert into cr_std_drink (name, delta, sort) values ('Predator - Gold', 500, 11);
insert into cr_std_drink (name, delta, sort) values ('5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_std_drink (name, delta, sort) values ('Monster Energy - Mango Loco', 1000, 13);
insert into cr_std_drink (name, delta, sort) values ('Monster Energy - Ultra', 1000, 14);
insert into cr_std_drink (name, delta, sort) values ('Monster Energy - Regular', 1000, 15);

do $crdedupe$
declare
  r uuid;
  stale record;
  doubled int := 0;
  chips int := 0;
  repriced int := 0;
begin
  select id into r from restaurants where name ilike '%chicken republic%' limit 1;
  if r is null then
    raise exception 'No Chicken Republic found. Run chicken_republic_full.sql first.';
  end if;

  -- 1. The old Drink question, where the meal already asks for a drink.
  with gone as (
    delete from item_option_groups g
    using menu_items m
    where g.menu_item_id = m.id
      and m.restaurant_id = r
      and g.name = 'Drink'
      and exists (
        select 1 from item_option_groups h
        where h.menu_item_id = g.menu_item_id
          and h.id <> g.id
          and (h.name = 'Drinks' or h.name like 'Drink %')
      )
    returning g.id
  )
  select count(*) into doubled from gone;

  -- 2. The old chips question, whatever else the meal has.
  with gone as (
    delete from item_option_groups g
    using menu_items m
    where g.menu_item_id = m.id
      and m.restaurant_id = r
      and g.name = 'Size (chips)'
    returning g.id
  )
  select count(*) into chips from gone;

  -- 3. What is left of the old list, re-priced. A Monster at 1,800 is the
  --    signature of it: the export charges 1,000.
  for stale in
    select distinct og.id
    from item_option_groups og
    join menu_items m on m.id = og.menu_item_id
    join item_options o on o.group_id = og.id
    where m.restaurant_id = r
      and og.name = 'Drink'
      and o.name = 'Monster Energy - Ultra'
      and o.price_delta = 1800
  loop
    delete from item_options where group_id = stale.id;
    insert into item_options (group_id, name, price_delta, sort_order)
    select stale.id, d.name, d.delta, d.sort from cr_std_drink d;
    repriced := repriced + 1;
  end loop;

  raise notice 'Removed % doubled drink questions and % old chips questions. Re-priced % drink lists.',
    doubled, chips, repriced;
end $crdedupe$;

drop table if exists cr_std_drink;

-- Anything still asking twice. Nothing should come back but the pot meals,
-- which ask once per drink they come with: Drink 1, Drink 2 and so on.
select m.name as item, string_agg(g.name, ' | ' order by g.sort_order) as questions
from menu_items m
join restaurants r on r.id = m.restaurant_id
join item_option_groups g on g.menu_item_id = m.id
where r.name ilike '%chicken republic%'
group by m.id, m.name
having count(*) filter (where g.name ilike '%drink%') > 1
    or count(*) filter (where g.name ilike 'size%') > 1
order by 1;
