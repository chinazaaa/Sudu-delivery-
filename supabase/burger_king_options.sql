-- Burger King: every question a meal leaves open.
--
-- Built from the options export. 37 products carry a real choice; the rest
-- carry none, and 64 questions in the export have a single answer, which is a
-- tap that tells nobody anything, so those are left out.
--
-- SIDES AND DRINKS ARE ASKED ONCE, NOT ONCE PER SIZE. The export lists a meal
-- three times, regular, medium and large, each with its own side list. Our
-- menu is one product with the size already a choice, so the portions are
-- folded together: you pick the size, then the side, rather than being shown
-- Side Regular, Side Medium and Side Large all at once and picking three.
--
-- Every option costs nothing extra. That is what the export says, and it is
-- why none of them carry a price.
--
-- A dip sauce is optional; a side and a drink are not, because a meal without
-- one is not a meal anybody can hand over.
--
-- Safe to run twice: these four questions are rebuilt from scratch each run.

drop table if exists bk_opt;
create table bk_opt (
  item   text not null,
  grp    text not null,
  gsort  int  not null,
  label  text not null,
  osort  int  not null
);

insert into bk_opt (item, grp, gsort, label, osort) values
  ('BBQ Egg Burger Meal', 'Side', 1, 'Fries', 1),
  ('BBQ Egg Burger Meal', 'Side', 1, 'Plantain', 2),
  ('BBQ Egg Burger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('BBQ Egg Burger Meal', 'Side', 1, 'Yam fries', 4),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Fanta', 2),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Juice', 3),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Schweppes Chapman', 4),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Schweppes Mojito', 5),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Schweppes Pineapple', 6),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Sprite', 7),
  ('BBQ Egg Burger Meal', 'Drink', 2, 'Water', 8),
  ('Big King Chicken Meal', 'Side', 1, 'Fries', 1),
  ('Big King Chicken Meal', 'Side', 1, 'Plantain', 2),
  ('Big King Chicken Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Big King Chicken Meal', 'Side', 1, 'Yam fries', 4),
  ('Big King Chicken Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Big King Chicken Meal', 'Drink', 2, 'Fanta', 2),
  ('Big King Chicken Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Big King Chicken Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Big King Chicken Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Big King Chicken Meal', 'Drink', 2, 'Sprite', 6),
  ('Big King Chicken Meal', 'Drink', 2, 'Water', 7),
  ('Big King Meal', 'Side', 1, 'Fries', 1),
  ('Big King Meal', 'Side', 1, 'Plantain', 2),
  ('Big King Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Big King Meal', 'Side', 1, 'Yam fries', 4),
  ('Big King Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Big King Meal', 'Drink', 2, 'Fanta', 2),
  ('Big King Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Big King Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Big King Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Big King Meal', 'Drink', 2, 'Sprite', 6),
  ('Big King Meal', 'Drink', 2, 'Water', 7),
  ('Cheeseburger Meal', 'Side', 1, 'Fries', 1),
  ('Cheeseburger Meal', 'Side', 1, 'Plantain', 2),
  ('Cheeseburger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Cheeseburger Meal', 'Side', 1, 'Yam fries', 4),
  ('Cheeseburger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Cheeseburger Meal', 'Drink', 2, 'Fanta', 2),
  ('Cheeseburger Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Cheeseburger Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Cheeseburger Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Cheeseburger Meal', 'Drink', 2, 'Sprite', 6),
  ('Cheeseburger Meal', 'Drink', 2, 'Water', 7),
  ('Chicken Burger Meal', 'Side', 1, 'Fries', 1),
  ('Chicken Burger Meal', 'Side', 1, 'Plantain', 2),
  ('Chicken Burger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Chicken Burger Meal', 'Side', 1, 'Yam fries', 4),
  ('Chicken Burger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Chicken Burger Meal', 'Drink', 2, 'Fanta', 2),
  ('Chicken Burger Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Chicken Burger Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Chicken Burger Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Chicken Burger Meal', 'Drink', 2, 'Sprite', 6),
  ('Chicken Burger Meal', 'Drink', 2, 'Water', 7),
  ('Chicken Royale Meal', 'Side', 1, 'Fries', 1),
  ('Chicken Royale Meal', 'Side', 1, 'Plantain', 2),
  ('Chicken Royale Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Chicken Royale Meal', 'Side', 1, 'Yam fries', 4),
  ('Chicken Royale Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Chicken Royale Meal', 'Drink', 2, 'Fanta', 2),
  ('Chicken Royale Meal', 'Drink', 2, 'Sprite', 3),
  ('Chicken Royale Meal', 'Drink', 2, 'Water', 4),
  ('Chicken Wings', 'Dip Sauce', 3, 'BBQ Dip', 1),
  ('Chicken Wings', 'Dip Sauce', 3, 'Fiery Chilli - Dip Pot', 2),
  ('Chicken Wings', 'Dip Sauce', 3, 'Garlic Mayo Vegan - Dip Pot', 3),
  ('Chicken Wings', 'Dip Sauce', 3, 'Honey Mustard - Dip Pot', 4),
  ('Chicken Wings', 'Dip Sauce', 3, 'Sweet Chilli - Dip Pot', 5),
  ('Crispy Chicken Meal', 'Side', 1, 'Fries', 1),
  ('Crispy Chicken Meal', 'Side', 1, 'Plantain', 2),
  ('Crispy Chicken Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Crispy Chicken Meal', 'Side', 1, 'Yam fries', 4),
  ('Crispy Chicken Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Crispy Chicken Meal', 'Drink', 2, 'Fanta', 2),
  ('Crispy Chicken Meal', 'Drink', 2, 'Sprite', 3),
  ('Crispy Chicken Meal', 'Drink', 2, 'Water', 4),
  ('Double Cheeseburger Meal', 'Side', 1, 'Fries', 1),
  ('Double Cheeseburger Meal', 'Side', 1, 'Plantain', 2),
  ('Double Cheeseburger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Double Cheeseburger Meal', 'Side', 1, 'Yam fries', 4),
  ('Double Cheeseburger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Double Cheeseburger Meal', 'Drink', 2, 'Fanta', 2),
  ('Double Cheeseburger Meal', 'Drink', 2, 'Sprite', 3),
  ('Double Cheeseburger Meal', 'Drink', 2, 'Water', 4),
  ('Double Steakhouse Meal', 'Side', 1, 'Fries', 1),
  ('Double Steakhouse Meal', 'Side', 1, 'Plantain', 2),
  ('Double Steakhouse Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Double Steakhouse Meal', 'Side', 1, 'Yam fries', 4),
  ('Double Steakhouse Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Double Steakhouse Meal', 'Drink', 2, 'Fanta', 2),
  ('Double Steakhouse Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Double Steakhouse Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Double Steakhouse Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Double Steakhouse Meal', 'Drink', 2, 'Sprite', 6),
  ('Double Steakhouse Meal', 'Drink', 2, 'Water', 7),
  ('Double Whopper Meal', 'Side', 1, 'Fries', 1),
  ('Double Whopper Meal', 'Side', 1, 'Plantain', 2),
  ('Double Whopper Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Double Whopper Meal', 'Side', 1, 'Yam fries', 4),
  ('Double Whopper Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Double Whopper Meal', 'Drink', 2, 'Fanta', 2),
  ('Double Whopper Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Double Whopper Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Double Whopper Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Double Whopper Meal', 'Drink', 2, 'Sprite', 6),
  ('Double Whopper Meal', 'Drink', 2, 'Water', 7),
  ('Egg Burger Meal', 'Side', 1, 'Fries', 1),
  ('Egg Burger Meal', 'Side', 1, 'Plantain', 2),
  ('Egg Burger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Egg Burger Meal', 'Side', 1, 'Yam fries', 4),
  ('Egg Burger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Egg Burger Meal', 'Drink', 2, 'Fanta', 2),
  ('Egg Burger Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Egg Burger Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Egg Burger Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Egg Burger Meal', 'Drink', 2, 'Sprite', 6),
  ('Egg Burger Meal', 'Drink', 2, 'Water', 7),
  ('Egg and Beef Burger Meal', 'Side', 1, 'Fries', 1),
  ('Egg and Beef Burger Meal', 'Side', 1, 'Plantain', 2),
  ('Egg and Beef Burger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Egg and Beef Burger Meal', 'Side', 1, 'Yam fries', 4),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Fanta', 2),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Sprite', 6),
  ('Egg and Beef Burger Meal', 'Drink', 2, 'Water', 7),
  ('Fire Up', 'Chicken', 9, 'Smoky Chicken', 1),
  ('Fire Up', 'Chicken', 9, 'Spicy Chicken', 2),
  ('Fire Up - Max', 'Drink', 2, 'Coca-Cola', 1),
  ('Fire Up - Max', 'Drink', 2, 'Fanta', 2),
  ('Fire Up - Max', 'Drink', 2, 'Sprite', 3),
  ('Fire Up - Max', 'Drink', 2, 'Water', 4),
  ('Fire Up - Max', 'Chicken', 9, 'Smoky Chicken', 1),
  ('Fire Up - Max', 'Chicken', 9, 'Spicy Chicken', 2),
  ('Hamburger Meal', 'Side', 1, 'Fries', 1),
  ('Hamburger Meal', 'Side', 1, 'Plantain', 2),
  ('Hamburger Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Hamburger Meal', 'Side', 1, 'Yam fries', 4),
  ('Hamburger Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Hamburger Meal', 'Drink', 2, 'Fanta', 2),
  ('Hamburger Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Hamburger Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Hamburger Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Hamburger Meal', 'Drink', 2, 'Sprite', 6),
  ('Hamburger Meal', 'Drink', 2, 'Water', 7),
  ('Kids Meal Cheeseburger', 'Side', 1, 'Fries', 1),
  ('Kids Meal Cheeseburger', 'Side', 1, 'Plantain', 2),
  ('Kids Meal Cheeseburger', 'Side', 1, 'Sweet Potato', 3),
  ('Kids Meal Cheeseburger', 'Side', 1, 'Yam fries', 4),
  ('Kids Meal Hamburger', 'Side', 1, 'Fries', 1),
  ('Kids Meal Hamburger', 'Side', 1, 'Plantain', 2),
  ('Kids Meal Hamburger', 'Side', 1, 'Sweet Potato', 3),
  ('Kids Meal Hamburger', 'Side', 1, 'Yam fries', 4),
  ('King Chicken Fillet meal', 'Side', 1, 'Fries', 1),
  ('King Chicken Fillet meal', 'Side', 1, 'Plantain', 2),
  ('King Chicken Fillet meal', 'Side', 1, 'Sweet Potato', 3),
  ('King Chicken Fillet meal', 'Side', 1, 'Yam fries', 4),
  ('King Chicken Fillet meal', 'Drink', 2, 'Coca-Cola', 1),
  ('King Chicken Fillet meal', 'Drink', 2, 'Fanta', 2),
  ('King Chicken Fillet meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('King Chicken Fillet meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('King Chicken Fillet meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('King Chicken Fillet meal', 'Drink', 2, 'Sprite', 6),
  ('King Chicken Fillet meal', 'Drink', 2, 'Water', 7),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Fanta', 2),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Sprite', 6),
  ('Meat Lover Gourmet Meal', 'Drink', 2, 'Water', 7),
  ('Nuggets', 'Dip Sauce', 3, 'BBQ Dip', 1),
  ('Nuggets', 'Dip Sauce', 3, 'Fiery Chilli - Dip Pot', 2),
  ('Nuggets', 'Dip Sauce', 3, 'Garlic Mayo Vegan - Dip Pot', 3),
  ('Nuggets', 'Dip Sauce', 3, 'Honey Mustard - Dip Pot', 4),
  ('Nuggets', 'Dip Sauce', 3, 'Sweet Chilli - Dip Pot', 5),
  ('Small Chops Lite Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Small Chops Lite Meal', 'Drink', 2, 'Fanta', 2),
  ('Small Chops Lite Meal', 'Drink', 2, 'Sprite', 3),
  ('Small Chops Lite Meal', 'Drink', 2, 'Water', 4),
  ('Small Chops Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Small Chops Meal', 'Drink', 2, 'Fanta', 2),
  ('Small Chops Meal', 'Drink', 2, 'Sprite', 3),
  ('Small Chops Meal', 'Drink', 2, 'Water', 4),
  ('Steakhouse Meal', 'Side', 1, 'Fries', 1),
  ('Steakhouse Meal', 'Side', 1, 'Plantain', 2),
  ('Steakhouse Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Steakhouse Meal', 'Side', 1, 'Yam fries', 4),
  ('Steakhouse Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Steakhouse Meal', 'Drink', 2, 'Fanta', 2),
  ('Steakhouse Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Steakhouse Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Steakhouse Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Steakhouse Meal', 'Drink', 2, 'Sprite', 6),
  ('Steakhouse Meal', 'Drink', 2, 'Water', 7),
  ('Suya Chopz - Chowdeck Xclusive', 'Drink', 2, 'Coca-Cola', 1),
  ('Suya Chopz - Chowdeck Xclusive', 'Drink', 2, 'Fanta', 2),
  ('Suya Chopz - Chowdeck Xclusive', 'Drink', 2, 'Juice', 3),
  ('Suya Chopz - Chowdeck Xclusive', 'Drink', 2, 'Sprite', 4),
  ('Suya Chopz - Chowdeck Xclusive', 'Drink', 2, 'Water', 5),
  ('Suya Whopper', 'Side', 1, 'Fries', 1),
  ('Suya Whopper', 'Side', 1, 'Plantain', 2),
  ('Suya Whopper', 'Side', 1, 'Sweet Potato', 3),
  ('Suya Whopper', 'Side', 1, 'Yam fries', 4),
  ('Suya Whopper', 'Drink', 2, 'Coca-Cola', 1),
  ('Suya Whopper', 'Drink', 2, 'Fanta', 2),
  ('Suya Whopper', 'Drink', 2, 'Juice', 3),
  ('Suya Whopper', 'Drink', 2, 'Schweppes Chapman', 4),
  ('Suya Whopper', 'Drink', 2, 'Schweppes Mojito', 5),
  ('Suya Whopper', 'Drink', 2, 'Schweppes Pineapple', 6),
  ('Suya Whopper', 'Drink', 2, 'Sprite', 7),
  ('Suya Whopper', 'Drink', 2, 'Water', 8),
  ('Suya Whopper Jr. Meal', 'Side', 1, 'Fries', 1),
  ('Suya Whopper Jr. Meal', 'Side', 1, 'Plantain', 2),
  ('Suya Whopper Jr. Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Suya Whopper Jr. Meal', 'Side', 1, 'Yam fries', 4),
  ('Suya Whopper Jr. Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Suya Whopper Jr. Meal', 'Drink', 2, 'Fanta', 2),
  ('Suya Whopper Jr. Meal', 'Drink', 2, 'Sprite', 3),
  ('Suya Whopper Jr. Meal', 'Drink', 2, 'Water', 4),
  ('Whopper Junior Meal', 'Side', 1, 'Fries', 1),
  ('Whopper Junior Meal', 'Side', 1, 'Plantain', 2),
  ('Whopper Junior Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Whopper Junior Meal', 'Side', 1, 'Yam fries', 4),
  ('Whopper Junior Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Whopper Junior Meal', 'Drink', 2, 'Fanta', 2),
  ('Whopper Junior Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Whopper Junior Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Whopper Junior Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Whopper Junior Meal', 'Drink', 2, 'Sprite', 6),
  ('Whopper Junior Meal', 'Drink', 2, 'Water', 7),
  ('Whopper Meal', 'Side', 1, 'Fries', 1),
  ('Whopper Meal', 'Side', 1, 'Plantain', 2),
  ('Whopper Meal', 'Side', 1, 'Sweet Potato', 3),
  ('Whopper Meal', 'Side', 1, 'Yam fries', 4),
  ('Whopper Meal', 'Drink', 2, 'Coca-Cola', 1),
  ('Whopper Meal', 'Drink', 2, 'Fanta', 2),
  ('Whopper Meal', 'Drink', 2, 'Schweppes Chapman', 3),
  ('Whopper Meal', 'Drink', 2, 'Schweppes Mojito', 4),
  ('Whopper Meal', 'Drink', 2, 'Schweppes Pineapple', 5),
  ('Whopper Meal', 'Drink', 2, 'Sprite', 6),
  ('Whopper Meal', 'Drink', 2, 'Water', 7);

do $bk$
declare
  r     uuid;
  found int;
  g     int;
  o     int;
begin
  select id into r from restaurants
  where name ilike '%burger king%' limit 1;
  if r is null then
    raise notice 'Burger King is not on the menu yet. Run burger_king_full.sql first.';
    return;
  end if;

  select count(*) into found
  from menu_items m join bk_opt x
    on upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
     = upper(regexp_replace(x.item, '[^a-zA-Z0-9]', '', 'g'))
  where m.restaurant_id = r;
  raise notice 'Products matched by name: %', found;

  -- Cleared across the whole restaurant, so a question written under an older
  -- name cannot survive beside its replacement.
  delete from item_option_groups gg
  using menu_items m
  where gg.menu_item_id = m.id
    and m.restaurant_id = r
    and gg.name in (select distinct grp from bk_opt);

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select distinct m.id, x.grp, x.grp <> 'Dip Sauce', 1, x.gsort
  from menu_items m join bk_opt x
    on upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
     = upper(regexp_replace(x.item, '[^a-zA-Z0-9]', '', 'g'))
  where m.restaurant_id = r;
  get diagnostics g = row_count;

  insert into item_options (group_id, name, price_delta, sort_order)
  select gg.id, x.label, 0, x.osort
  from item_option_groups gg
       join menu_items m on m.id = gg.menu_item_id
       join bk_opt x
         on x.grp = gg.name
        and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
          = upper(regexp_replace(x.item, '[^a-zA-Z0-9]', '', 'g'))
  where m.restaurant_id = r;
  get diagnostics o = row_count;

  raise notice '% questions added, with % answers between them.', g, o;

  select count(*) into found from (
    select gg.menu_item_id, gg.name
    from item_option_groups gg join menu_items m on m.id = gg.menu_item_id
    where m.restaurant_id = r
    group by 1, 2 having count(*) > 1
  ) d;
  raise notice 'Products asking the same question twice: %', found;
end $bk$;

drop table if exists bk_opt;

