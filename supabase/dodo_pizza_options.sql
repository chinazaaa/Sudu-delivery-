-- Dodo Pizza: which pizza the deal is for.
--
-- Eight deals in the export let you pick the flavour, and two of them let you
-- pick a second one. That is all the export carries, so that is all this puts
-- in. A deal whose flavour was never asked went to the counter naming the
-- offer and not the pizza.
--
-- The flavours cost nothing extra, whichever you pick, which is what the
-- export says.
--
-- THE EXPORT IS SHORT ON SEVERAL DEALS. Family Deal, Combo for 2, Group Pizza
-- Deal, Office Feast, Work and Share Combo and the three Bear kids meals all
-- clearly need a flavour picked and carry none. Pizza Duet is two pizzas with
-- one flavour choice, and Combo for 4 is two large pizzas with one. Those are
-- gaps in what Chowdeck exported, not decisions, and nothing is invented here
-- to paper over them. Send the missing lists and they go in the same way.
--
-- Safe to run twice: these two questions are rebuilt from scratch each run.

drop table if exists dodo_opt;
create table dodo_opt (
  item  text not null,
  grp   text not null,
  gsort int  not null,
  label text not null,
  osort int  not null
);

insert into dodo_opt (item, grp, gsort, label, osort) values
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Veggie', 7),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Margherita', 13),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('Buy 2 Get 1 Free', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Pepperoni', 1),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Beef Suya', 2),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Cheesy Chicken', 3),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Margherita', 4),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Sweet Chili Chicken', 5),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Chicken Supreme', 6),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Beef Mexican', 7),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Super Meaty', 8),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Chicken Suya', 9),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Veggie', 10),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Meaty BBQ', 11),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Hawaiian', 12),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Dodo BBQ', 13),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Cheeseburger Pizza', 14),
  ('Buy 2 Get 1 Free', 'Second pizza flavour', 2, 'Shawarma Pizza', 15),
  ('Combo for 1', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('Combo for 1', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('Combo for 1', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('Combo for 1', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('Combo for 1', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('Combo for 1', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('Combo for 1', 'Pizza flavour', 1, 'Veggie', 7),
  ('Combo for 1', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('Combo for 1', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('Combo for 1', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('Combo for 1', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('Combo for 1', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('Combo for 1', 'Pizza flavour', 1, 'Margherita', 13),
  ('Combo for 1', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('Combo for 1', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('Combo for 4', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('Combo for 4', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('Combo for 4', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('Combo for 4', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('Combo for 4', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('Combo for 4', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('Combo for 4', 'Pizza flavour', 1, 'Veggie', 7),
  ('Combo for 4', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('Combo for 4', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('Combo for 4', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('Combo for 4', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('Combo for 4', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('Combo for 4', 'Pizza flavour', 1, 'Margherita', 13),
  ('Combo for 4', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('Combo for 4', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Veggie', 7),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Margherita', 13),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('Deluxe Offer', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Veggie', 7),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Margherita', 13),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('Dodo saver deal', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('Pizza Duet', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('Pizza Duet', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('Pizza Duet', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('Pizza Duet', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('Pizza Duet', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('Pizza Duet', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('Pizza Duet', 'Pizza flavour', 1, 'Veggie', 7),
  ('Pizza Duet', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('Pizza Duet', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('Pizza Duet', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('Pizza Duet', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('Pizza Duet', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('Pizza Duet', 'Pizza flavour', 1, 'Margherita', 13),
  ('Pizza Duet', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('Pizza Duet', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Veggie', 7),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Margherita', 13),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('The Ultimate Dodo Deal', 'Pizza flavour', 1, 'Hawaiian', 15),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Pepperoni', 1),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Beef Suya', 2),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Cheesy Chicken', 3),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Margherita', 4),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Sweet Chili Chicken', 5),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Chicken Supreme', 6),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Beef Mexican', 7),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Super Meaty', 8),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Chicken Suya', 9),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Veggie', 10),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Meaty BBQ', 11),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Hawaiian', 12),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Dodo BBQ', 13),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Cheeseburger Pizza', 14),
  ('The Ultimate Dodo Deal', 'Second pizza flavour', 2, 'Shawarma Pizza', 15),
  ('dodo flash deal', 'Pizza flavour', 1, 'Beef Suya', 1),
  ('dodo flash deal', 'Pizza flavour', 1, 'Meaty BBQ', 2),
  ('dodo flash deal', 'Pizza flavour', 1, 'Cheesy Chicken', 3),
  ('dodo flash deal', 'Pizza flavour', 1, 'Dodo BBQ', 4),
  ('dodo flash deal', 'Pizza flavour', 1, 'Super Meaty', 5),
  ('dodo flash deal', 'Pizza flavour', 1, 'Chicken Supreme', 6),
  ('dodo flash deal', 'Pizza flavour', 1, 'Veggie', 7),
  ('dodo flash deal', 'Pizza flavour', 1, 'Shawarma Pizza', 8),
  ('dodo flash deal', 'Pizza flavour', 1, 'Beef Mexican', 9),
  ('dodo flash deal', 'Pizza flavour', 1, 'Sweet Chili Chicken', 10),
  ('dodo flash deal', 'Pizza flavour', 1, 'Pepperoni', 11),
  ('dodo flash deal', 'Pizza flavour', 1, 'Chicken Suya', 12),
  ('dodo flash deal', 'Pizza flavour', 1, 'Margherita', 13),
  ('dodo flash deal', 'Pizza flavour', 1, 'Cheeseburger Pizza', 14),
  ('dodo flash deal', 'Pizza flavour', 1, 'Hawaiian', 15);

do $dodo$
declare
  r     uuid;
  found int;
  g     int;
  o     int;
begin
  select id into r from restaurants where name ilike '%dodo%' limit 1;
  if r is null then
    raise notice 'Dodo Pizza is not on the menu yet. Run dodo_pizza_full.sql first.';
    return;
  end if;

  select count(distinct m.id) into found
  from menu_items m join dodo_opt x
    on upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
     = upper(regexp_replace(x.item, '[^a-zA-Z0-9]', '', 'g'))
  where m.restaurant_id = r;
  raise notice 'Deals matched by name: % of 8', found;

  delete from item_option_groups gg
  using menu_items m
  where gg.menu_item_id = m.id
    and m.restaurant_id = r
    and gg.name in (select distinct grp from dodo_opt);

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select distinct m.id, x.grp, true, 1, x.gsort
  from menu_items m join dodo_opt x
    on upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
     = upper(regexp_replace(x.item, '[^a-zA-Z0-9]', '', 'g'))
  where m.restaurant_id = r;
  get diagnostics g = row_count;

  insert into item_options (group_id, name, price_delta, sort_order)
  select gg.id, x.label, 0, x.osort
  from item_option_groups gg
       join menu_items m on m.id = gg.menu_item_id
       join dodo_opt x
         on x.grp = gg.name
        and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
          = upper(regexp_replace(x.item, '[^a-zA-Z0-9]', '', 'g'))
  where m.restaurant_id = r;
  get diagnostics o = row_count;

  raise notice '% questions added, with % flavours between them.', g, o;

  select count(*) into found from (
    select gg.menu_item_id, gg.name
    from item_option_groups gg join menu_items m on m.id = gg.menu_item_id
    where m.restaurant_id = r
    group by 1, 2 having count(*) > 1
  ) d;
  raise notice 'Deals asking the same question twice: %', found;
end $dodo$;

drop table if exists dodo_opt;
