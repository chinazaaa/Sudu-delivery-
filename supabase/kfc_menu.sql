-- KFC Novare menu, as listed publicly.
-- 58 items in 7 categories, 51 of them priced.
-- Anything without a price, or marked out of stock where it was copied, is
-- created switched off so it cannot be ordered until you price it in
-- Admin, Menu. Check every price at the counter before the first run.
--
-- Safe to run twice: it skips anything already there.

do $$
declare
  r uuid;
  c uuid;
begin
  select id into r from restaurants where name ilike '%KFC%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active, sort_order)
    values ('KFC Novare', 'Novare Mall, Sangotedo', time '21:00', true, 10)
    returning id into r;
  end if;

  -- Deal (16)
  select id into c from menu_categories where restaurant_id = r and name = 'Deal';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Deal', 1) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise chowdeck', 1699, '2 Pcs KFC Hot Wings & 1 KFC Spicy Rice', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise chowdeck');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '21 pcs kfc bucket (d)', 62499, 'COB-OR /HC 21 PIECES & 2 Pepsi Btl', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = '21 pcs kfc bucket (d)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Family meal 1', 26199, '6 Pcs COB, 2 Reg KFC Spicy Rice, 2 Yam Fries, 2 Pepsi Btls', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Family meal 1');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Family meal 2', 30999, '8 Pcs COB, 2 Reg KFC Spicy Rice, 2 Yam Fries, 2 Pepsi Btls', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Family meal 2');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5 in 1 meal box', 12699, '1 Pc HC/OR, 1 Zinger Burger, 1 Reg Yam Fries, 1 Btl Drink & 2 Hot wing or 2 Strips or 1 Reg. Popcorn', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5 in 1 meal box');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise 1', 5199, '1 Pc HC/OR, 1 KFC Spicy Rice & 1 Water', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise 1');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Double zinger burger meal', 12699, '1 large burger, 1 Reg Yam Fries, 1 Btl Drink', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Double zinger burger meal');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Family meal 3', 40599, '12 Pcs COB, 2 Reg KFC Spicy Rice, 2 Yam Fries, 2 Pepsi Btls', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Family meal 3');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '12 pcs kfc bucket (d)', 38599, 'COB-OR /HC 12 PIECES & 2 Pepsi Btl', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = '12 pcs kfc bucket (d)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '8 pcs kfc bucket', 26999, 'COB-OR /HC 8 PIECES & 2 Pepsi Btl', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = '8 pcs kfc bucket');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Zinger burger meal(d)', 9599, '1 zinger burger, 1 Reg Yam Fries, 1 Btl Drink', true, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Zinger burger meal(d)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise 2', 7599, '2 Pc HC/OR, 1 KFC Spicy Rice & 1 Water', true, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise 2');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Zinger box meal (d)', 10899, '1 zinger burger, 1pc chicken, 1 Reg Yam Fries, 1 Btl Drink', true, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Zinger box meal (d)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc celebration feast bucket', 23999, '3 Pcs COB-OR/HC, 6 Pcs Wings, 6 Pcs Strips & 2 Btl Pepsi', true, 14
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc celebration feast bucket');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '5 in 1 special meal box', 13199, '1 Pc HC/OR, 1 Reg Yam Fries, 3 Pcs KFC Hot Wings, 3 Pcs Strips, 1 Blt Drink', true, 15
  where not exists (select 1 from menu_items where restaurant_id = r and name = '5 in 1 special meal box');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise 3', 0, '3 Pc HC/OR, 1 KFC Spicy Rice & 1 Water', false, 16
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise 3');

  -- Alacarte (29)
  select id into c from menu_categories where restaurant_id = r and name = 'Alacarte';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Alacarte', 2) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Moi moi - reg', 2999, '', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Moi moi - reg');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Crspy chkn strip 8 pc', 11399, '', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Crspy chkn strip 8 pc');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Water (50 cl)', 799, '', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Water (50 cl)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Crspy chkn strip 5 pc', 8099, '', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Crspy chkn strip 5 pc');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc spicy rice', 2999, '', true, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc spicy rice');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc spicy rice - lrg', 3699, '', true, 6
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc spicy rice - lrg');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc hot wings 8pcs', 10599, '', true, 7
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc hot wings 8pcs');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Zinger pepe burger', 6699, '', true, 8
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Zinger pepe burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cob-hc 5 pieces', 15699, '', true, 9
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cob-hc 5 pieces');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Double zinger burger', 9799, '', true, 10
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Double zinger burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc hot wings 5pcs', 6699, '', true, 11
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc hot wings 5pcs');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Yam fries lrg', 2599, '', true, 12
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Yam fries lrg');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Zinger suya burger', 6699, '', true, 13
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Zinger suya burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cob-or 1 pieces', 3699, '', true, 14
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cob-or 1 pieces');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepsi 500ml(pet btl.)', 1099, '', true, 15
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepsi 500ml(pet btl.)');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cob-hc 1 pieces', 3699, '', true, 16
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cob-hc 1 pieces');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Yam fries reg', 2399, '', true, 17
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Yam fries reg');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cob-hc suya 1 pieces', 3699, '', true, 18
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cob-hc suya 1 pieces');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Crspy chkn strip 3 pc', 5499, '', true, 19
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Crspy chkn strip 3 pc');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc double down', 9399, '', true, 20
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc double down');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cob-hc suya 5 pieces', 15699, '', true, 21
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cob-hc suya 5 pieces');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Kfc hot wings 3pcs', 5299, '', true, 22
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Kfc hot wings 3pcs');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Extra cheese', 1499, '', true, 23
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Extra cheese');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Zinger burger', 6699, '', true, 24
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Zinger burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Cob-or 5 pieces', 15699, '', true, 25
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Cob-or 5 pieces');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Yam fries xlrg', 3199, '', true, 26
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Yam fries xlrg');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Pepe sauce', 599, '', true, 27
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Pepe sauce');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Moi moi - lrg', 0, '', false, 28
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Moi moi - lrg');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'FIERY FRIES SACHET', 0, '', false, 29
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'FIERY FRIES SACHET');

  -- Streetwise (2)
  select id into c from menu_categories where restaurant_id = r and name = 'Streetwise';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Streetwise', 3) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise Regular Chowdeck', 3500, 'Large Spicy Rice + 1 pc Chicken', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise Regular Chowdeck');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise Large Chowdeck', 4000, 'Xtra Large Spicy Rice+1pc Chicken', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise Large Chowdeck');

  -- Wings & chicken (4)
  select id into c from menu_categories where restaurant_id = r and name = 'Wings & chicken';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Wings & chicken', 4) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '12pcs chicken combo', 23999, '12pcs chicken= 6pcs chicken + 6pcs wings + 2 yam fries + 2 pepsi', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = '12pcs chicken combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, '12pcs chicken', 20999, '12pcs chicken= 6pcs chicken + 6pcs wings', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = '12pcs chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Weekday Delight Combo', 11999, '10pcs chicken combo= 5strips + 5wings + 1 yam fries + 1 pepsi', true, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Weekday Delight Combo');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Weekday Delight', 9999, '10pcs chicken= 5strips + 5wings', true, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Weekday Delight');

  -- Promotions (1)
  select id into c from menu_categories where restaurant_id = r and name = 'Promotions';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Promotions', 5) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Streetwise Xtra Large Chowdeck', 5500, 'Xtra Large Spicy Rice + 1 pc Chicken + 1 Pepsi + 1 Moi Moi', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Streetwise Xtra Large Chowdeck');

  -- Burgers (1)
  select id into c from menu_categories where restaurant_id = r and name = 'Burgers';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'Burgers', 6) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bogo StreetBite Burger', 0, 'Buy a streetbite burger and get another half the price', false, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bogo StreetBite Burger');

  -- You should try (5)
  select id into c from menu_categories where restaurant_id = r and name = 'You should try';
  if c is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (r, 'You should try', 7) returning id into c;
  end if;
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Zingy Burger', 3499, '', true, 1
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Zingy Burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'StreetBite Burger', 2399, '', true, 2
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'StreetBite Burger');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bogo 21 pc bucket chicken', 0, 'Buy a bogo 21 pc bucket and get another completely free', false, 3
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bogo 21 pc bucket chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bogo 12 pc bucket chicken', 0, 'Buy a bogo 12 pc bucket and get another completely free', false, 4
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bogo 12 pc bucket chicken');
  insert into menu_items (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c, 'Bogo 8 pc bucket chicken', 0, 'Buy a bogo 8 pc bucket and get another completely free', false, 5
  where not exists (select 1 from menu_items where restaurant_id = r and name = 'Bogo 8 pc bucket chicken');

end $$;

notify pgrst, 'reload schema';

-- Switch off the placeholder items from the original seed, now that the real
-- menu is here. Hidden rather than deleted, in case an old order points at one.
update menu_items set available = false
where name in ('Original Recipe 2pc + chips', '8pc bucket', 'Wrap meal',
               'Refuel Meal', 'Zinger burger meal')
  and restaurant_id in (select id from restaurants where name ilike '%kfc%');
