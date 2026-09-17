-- KFC Novare, the whole menu.
--
-- Built from the price list you exported: 58 products across seven
-- sections. It supersedes kfc_menu.sql and is the one file to run when the
-- menu changes.
--
-- Every product the export lists is already on the menu and every product on
-- the menu is in the export, so nothing is added or removed here. What it
-- does is bring the prices, the descriptions and what is in stock up to date.
--
-- Where a card carries two prices, the dearer one is used.
--
-- 10 products the export marks out of stock go in switched off. They will
-- read "Sold out today" on the menu until you turn them on in Admin, Menu.
-- Each keeps whatever price it had, so turning one on is a single tap.
--
-- Names already on the menu are kept rather than replaced by the shouting
-- ones in the export, so Yam fries xlrg does not become YAM FRIES XLRG.
--
-- Safe to run twice.

drop table if exists kfc_import;
create table kfc_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Kfc celebration feast bucket', 0, false, '3 Pcs COB-OR/HC, 6 Pcs Wings, 6 Pcs Strips & 2 Btl Pepsi', 1);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', '5 in 1 special meal box', 13199, true, '1 Pc HC/OR, 1 Reg Yam Fries, 3 Pcs KFC Hot Wings, 3 Pcs Strips, 1 Blt Drink', 2);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Streetwise 2', 7599, true, '2 Pc HC/OR, 1 KFC Spicy Rice & 1 Water', 3);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Streetwise 3', 10499, true, '3 Pc HC/OR, 1 KFC Spicy Rice & 1 Water', 4);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Streetwise chowdeck', 1699, true, '2 Pcs KFC Hot Wings & 1 KFC Spicy Rice', 5);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', '8 pcs kfc bucket', 0, false, 'COB-OR /HC 8 PIECES & 2 Pepsi Btl', 6);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', '12 pcs kfc bucket (d)', 0, false, 'COB-OR /HC 12 PIECES & 2 Pepsi Btl', 7);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Streetwise 1', 5199, true, '1 Pc HC/OR, 1 KFC Spicy Rice & 1 Water', 8);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', '21 pcs kfc bucket (d)', 0, false, 'COB-OR /HC 21 PIECES & 2 Pepsi Btl', 9);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Zinger box meal (d)', 10899, true, '1zinger burger,1pc chicken, 1 Reg Yam Fries, 1 Btl Drink', 10);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Zinger burger meal(d)', 9599, true, '1 zinger burger, 1 Reg Yam Fries, 1 Btl Drink)', 11);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Double zinger burger meal', 12699, true, '1 large burger, 1 Reg Yam Fries, 1 Btl Drink)', 12);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', '5 in 1 meal box', 12699, true, '1 Pc HC/OR, 1 Zinger Burger, 1 Reg Yam Fries, 1 Btl Drink & 2 Hot wing or 2 Strips or 1 Reg. Popcorn', 13);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Family meal 3', 40599, true, '12 Pcs COB, 2 Reg KFC Spicy Rice, 2 Yam Fries, 2 Pepsi Btls', 14);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Family meal 2', 30999, true, '8 Pcs COB, 2 Reg KFC Spicy Rice, 2 Yam Fries, 2 Pepsi Btls', 15);
insert into kfc_import (category, name, price, available, description, sort) values ('Deal', 'Family meal 1', 26199, true, '6 Pcs COB, 2 Reg KFC Spicy Rice, 2 Yam Fries, 2 Pepsi Btls', 16);
insert into kfc_import (category, name, price, available, description, sort) values ('Streetwise', 'Streetwise Regular Chowdeck', 3500, true, 'Large Spicy Rice + 1 pc Chicken', 1);
insert into kfc_import (category, name, price, available, description, sort) values ('Streetwise', 'Streetwise Large Chowdeck', 4000, true, 'Xtra Large Spicy Rice+1pc Chicken', 2);
insert into kfc_import (category, name, price, available, description, sort) values ('Burgers', 'Bogo StreetBite Burger', 0, false, 'Buy a streetbite burger and get another half the price', 1);
insert into kfc_import (category, name, price, available, description, sort) values ('Wings & chicken', '12pcs chicken combo', 23999, true, '12pcs chicken= 6pcs chicken + 6pcs wings + 2 yam fries + 2 pepsi', 1);
insert into kfc_import (category, name, price, available, description, sort) values ('Wings & chicken', 'Weekday Delight', 0, false, '10pcs chicken= 5strips + 5wings', 2);
insert into kfc_import (category, name, price, available, description, sort) values ('Wings & chicken', '12pcs chicken', 20999, true, '12pcs chicken= 6pcs chicken + 6pcs wings', 3);
insert into kfc_import (category, name, price, available, description, sort) values ('Wings & chicken', 'Weekday Delight Combo', 0, false, '10pcs chicken combo= 5strips + 5wings + 1 yam fries + 1 pepsi', 4);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Kfc hot wings 3pcs', 5299, true, '', 1);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Kfc spicy rice - lrg', 3699, true, '', 2);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Kfc spicy rice', 2999, true, '', 3);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Yam fries xlrg', 3199, true, '', 4);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Cob-hc suya 1 pieces', 3699, true, '', 5);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Yam fries lrg', 2599, true, '', 6);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Crspy chkn strip 3 pc', 5499, true, '', 7);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Moi moi - reg', 2999, true, '', 8);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Cob-hc 1 pieces', 3699, true, '', 9);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Zinger burger', 6699, true, '', 10);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Cob-or 1 pieces', 3699, true, '', 11);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Pepsi 500ml(pet btl.)', 1099, true, '', 12);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Zinger suya burger', 6699, true, '', 13);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Crspy chkn strip 8 pc', 11399, true, '', 14);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'FIERY FRIES SACHET', 0, false, '', 15);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Cob-hc suya 5 pieces', 15699, true, '', 16);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Zinger pepe burger', 6699, true, '', 17);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Pepe sauce', 599, true, '', 18);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Double zinger burger', 9799, true, '', 19);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Crspy chkn strip 5 pc', 8099, true, '', 20);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Cob-or 5 pieces', 15699, true, '', 21);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Yam fries reg', 2399, true, '', 22);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Cob-hc 5 pieces', 15699, true, '', 23);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Water (50 cl)', 799, true, '', 24);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Extra cheese', 1499, true, '', 25);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Kfc hot wings 5pcs', 6699, true, '', 26);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Kfc double down', 9399, true, '', 27);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Kfc hot wings 8pcs', 10599, true, '', 28);
insert into kfc_import (category, name, price, available, description, sort) values ('Alacarte', 'Moi moi - lrg', 0, false, '', 29);
insert into kfc_import (category, name, price, available, description, sort) values ('You should try', 'Bogo 8 pc bucket chicken', 29499, true, 'Buy a bogo 8 pc bucket and get another completely free', 1);
insert into kfc_import (category, name, price, available, description, sort) values ('You should try', 'Bogo 12 pc bucket chicken', 41099, true, 'Buy a bogo 12 pc bucket and get another completely free', 2);
insert into kfc_import (category, name, price, available, description, sort) values ('You should try', 'Bogo 21 pc bucket chicken', 64999, true, 'Buy a bogo 21 pc bucket and get another completely free', 3);
insert into kfc_import (category, name, price, available, description, sort) values ('You should try', 'StreetBite Burger', 2399, true, '', 4);
insert into kfc_import (category, name, price, available, description, sort) values ('You should try', 'Zingy Burger', 3499, true, '', 5);
insert into kfc_import (category, name, price, available, description, sort) values ('Promotions', 'Streetwise Xtra Large Chowdeck', 0, false, 'Xtra Large Spicy Rice + 1 pc Chicken + 1 Pepsi + 1 Moi Moi', 1);

do $kfc$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%kfc%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('KFC Novare', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Deal', 1),
    ('Streetwise', 2),
    ('Burgers', 3),
    ('Wings & chicken', 4),
    ('Alacarte', 5),
    ('You should try', 6),
    ('Promotions', 7)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Deal', 1),
    ('Streetwise', 2),
    ('Burgers', 3),
    ('Wings & chicken', 4),
    ('Alacarte', 5),
    ('You should try', 6),
    ('Promotions', 7)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  -- A product with no price in the export keeps the one it has, so switching
  -- it back on later is a single tap.
  update menu_items m
  set name        = i.name,
      price_food  = case when i.price > 0 then i.price else m.price_food end,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from kfc_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from kfc_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where not exists (
    select 1 from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  );
  get diagnostics added = row_count;

  raise notice '% products corrected, % added.', moved, added;

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $kfc$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%kfc%'
  and not exists (
    select 1 from kfc_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%kfc%'
order by c.sort_order, m.sort_order;

drop table if exists kfc_import;
