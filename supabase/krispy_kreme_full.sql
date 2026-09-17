-- Krispy Kreme Novare, the whole menu.
--
-- Built from the price list you exported: 82 products across seven
-- sections, from 90 rows. Nothing of this menu existed before, so
-- everything here is new.
--
-- THE BOXES CARRY A SIZE CHOICE. The export lists Single, Pack of Three,
-- Half Dozen, Dozen and Double Dozen as five separate products, twice over,
-- once for Assorted and once for Original Glazed. Each is one product here
-- with the box size as a choice, priced from the list.
--
-- CAPPUCCINO GOES IN SWITCHED OFF. The export prices it at zero naira, which
-- would put it on the menu as free. Price it in Admin, Menu and switch it on.
--
-- The export lists two different 5 dozen combos whose names differ only by a
-- hyphen, one for offices and one for Ramadan. The second is called
-- 5 dozen combo (Ramadan) so the two do not collide.
--
-- 41 products go in switched off: what the export marks out of stock, and
-- the cappuccino above.
--
-- Safe to run twice.

drop table if exists kk_import;
create table kk_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

drop table if exists kk_sizes;
create table kk_sizes (
  item  text not null,
  label text not null,
  delta int  not null,
  sort  int  not null
);

insert into kk_import (category, name, price, available, description, sort) values ('Doughnut boxes', 'Assorted doughnuts', 2100, true, 'An assorted dozen consisting 12 gourmet doughnuts of your choice', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnut boxes', 'Original Glazed doughnuts', 0, false, 'A box of 12 of the world famous glazed doughnuts', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Strawberry Iced with Sprinkle Doughnut', 2100, true, 'A fluffy ring doughnut topped with sweet strawberry icing and finished with colorful sprinkles made to brighten your day.', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Chocolate Iced with Sprinkles Doughnut', 2100, true, 'Indulge in a rich chocolate-glazed doughnut, topped with a burst of colorful sprinkles for that perfect touch of fun and sweetness, all for you!', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Coconut Ring Doughnut', 2100, true, 'If you love coconuts, this is for you! Enjoy our traditional doughnut ring topped with roasted coconuts for that extra flavour.', 3);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Crunchy Peanut Butter Flavoured Doughnut', 0, false, 'Experience the perfect balance of crunchy delight and smooth, sticky peanut butter, every bite is a nutty, satisfying treat.', 4);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Choco-Nut Halo Doughnut', 0, false, 'Choco-Nut Halo Doughnut is filled with hazelnut spread and topped with caramelized hazelnuts.', 5);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Easter Blossom Doughnut', 0, false, 'This yeast-raised soft ring doughnut, dipped in creamy white chocolate icing and drizzled with pink icing, is the perfect sweet Easter treat.', 6);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Cinnamon Roll', 0, false, 'Savor the warm, comforting taste of our classic cinnamon roll. Soft, sweet, and perfectly layered with rich cinnamon flavor in every bite.', 7);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Powdered Strawberry Flavoured Doughnut', 2100, true, 'Light, fluffy, and filled with sweet strawberry filling and coated with a light dusting of powdered sugar.', 8);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Triple Chocolate Flavoured Doughnut', 2100, true, 'Indulge in three delicious layers of chocolatey goodness, filled and topped with rich chocolate Kreme for maximum satisfaction. It’s a chocolate lover’s dream!', 9);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Original Dream Cake Doughnut', 0, false, 'More than a doughnut! Soft and rich, this doughnut is a true treat for cake lovers. Every bite is packed with flavor.', 10);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Midnight Glaze​ Doughnut', 0, false, 'Indulge in Midnight Glaze! A Soft, yeast-raised ring doughnut, dipped in rich chocolate icing.', 11);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Choco Snow Crunch Doughnut', 0, false, 'Your next craving starts here! Bite into this Yeast Raised Ring doughnut, dipped in Chocolate icing, Drizzled with white Kreme filling and Topped with chocolate chips', 12);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Milky Delight Doughnut', 2100, true, 'Soft and creamy! Milky doughnut is filled with smooth milk filling, lightly dusted with milk powder, and finished with a sweet milk drizzle! Pure milky goodness in every bite.', 13);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Smile Maker', 0, false, 'This chocolatey showstopper features a yeast-raised shell doughnut filled with milky chocolate filling, dipped in yellow icing, drizzled with black icing, and decorated with white fondant , ash icing and chocolate icing.', 14);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Chocolate carnival doughnut', 0, false, 'Celebrate every moment with our Chocolate Carnival Doughnut, a Soft, yeast-raised, dipped in Chocolate icing, drizzled with chocolate icing and topped with Sprinkles', 15);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Green Giggles', 2100, true, 'This gooey fun treat combines a yeast-raised ring doughnut dipped in green icing, drizzled with white chocolate icing, and topped with a decorative Slimer face sticker on the side.', 16);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Strawberry bubble', 0, false, 'This berry-sweet delight starts with a yeast-raised ring doughnut dipped in strawberry icing and decorated with pink strawberry icing for a decadent bite.', 17);
insert into kk_import (category, name, price, available, description, sort) values ('Doughnuts', 'Bites', 0, false, 'Delicious melt - in your mouth Original glazed doughnuts in bite sizes.', 18);
insert into kk_import (category, name, price, available, description, sort) values ('Pull aparts', 'Meatball Pull Apart', 1700, true, 'Our signature dough stuffed with meatballs and even more cheese. It''s an absolute baked delight that your cravings wouldn''t be able to resist.', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Pull aparts', 'Sausage Pull Apart', 1700, true, 'Our signature dough stuffed with sausages and even more cheese. It''s an absolute baked delight that your cravings wouldn''t be able to resist.', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Pull aparts', 'Chicken Pull Apart', 1700, true, 'Our signature dough stuffed with chicken pieces and even more cheese. It''s an absolute baked delight that your cravings wouldn''t be able to resist.', 3);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Chocolate Iced Matcha', 5700, true, 'A bold fusion of creamy matcha and rich chocolate, served over ice for a refreshing, indulgent sip.', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Iced matcha latte', 5700, true, 'A refreshing blend of matcha, chilled milk, and vanilla syrup, served over ice for a smooth, subtly sweet sip.', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Hot matcha latte', 5700, true, 'Warm, creamy, and naturally earthy, this soothing cup is the perfect way to unwind and recharge.', 3);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Special Tea', 2400, true, '"Special tea" encompasses unique, custom blends or infusions crafted with diverse ingredients, offering distinct flavors, health benefits, or seasonal variations.', 4);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Latte', 5500, true, 'Less airy milk froth, creamier steamed milk. Unmistakable coffee flavour but on the mild side. Tastes like espresso coated in milk. Sweeten this drink by adding a flavour if you like.', 5);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Chai tea', 5400, true, 'A classic spiced tea containing a blend of black tea and delicious spices.', 6);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Cappuccino', 0, false, 'Espresso combined with steamed milk and capped off with light, airy milk froth. Intense coffee taste but smoother than a straight espresso.', 7);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Caramel latte', 5200, true, 'Caramel sauce mixed with espresso and steamed 2% or skim milk, finished with whipped cream and a caramel drizzle.', 8);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Hazelnut Latte', 5200, true, 'Combines the rich, bold essence of espresso with the comforting, nutty sweetness of hazelnut flavoring', 9);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Americano', 4000, true, 'Premium brewed coffee topped with espresso shots.', 10);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Tea', 2000, true, 'Made with the finest tea leaves. Comes in 12 oz cup', 11);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Iced caramel macchiato latte', 0, false, 'A refreshing blend of matcha, creamy chilled milk, and a hint of vanilla syrup, served over ice for a smooth, lightly sweet sip', 12);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Caffe mocha', 5500, true, 'Chocolate blended with espresso and steamed milk, topped with whipped cream. Rich, but not overdone. Great chocolate taste without losing the coffee flavour.', 13);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Hot chocolate', 5300, true, 'rich, creamy, and chocolatey goodness.', 14);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Vanilla latte', 0, false, 'Espresso and steamed 2% or skim milk sweetened with vanilla syrup.', 15);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Espresso', 0, false, 'Our espresso is a concentrated form of coffee served in small, strong shots and is the base for many of our coffee drinks', 16);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Flat White', 0, false, 'Steamed milk infused with air, to create a smooth,velvety texture and creamy taste over espresso. Comes in 8 oz cup', 17);
insert into kk_import (category, name, price, available, description, sort) values ('Coffee & tea', 'Hot caramel macchiato latte', 0, false, 'A warm blend of bold espresso and steamed milk, finished with rich caramel. Smooth, comforting, and made to energize your day.', 18);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Cookie Kreme Shake', 6000, true, 'A delightful blend of our rich ice kreme and crunchy cookies.', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Peanut Kreme Shake', 6000, true, 'A nutty delight with our rich ice kreme and creamy peanut butter swirls.', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Caramel Espresso Frozze', 0, false, 'This frozen delight tantalizes the palate with the robust notes of finely brewed espresso, perfectly harmonizing with the velvety richness of caramel syrup or sauce', 3);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Peanut Butter & Oreo Frozze', 0, false, 'A tantalizing blend that combines the rich, nutty essence of peanut butter with the indulgent, chocolaty crunch of Oreos', 4);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Wildberry Chiller', 0, false, 'Rich and Refreshing Wild berry frozen delight. 16 oz cup', 5);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Caramel Kreme Shake', 0, false, 'A divine blend that captures the essence of indulgent caramel in a creamy, dreamy shake.', 6);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Triple Chocolate Frozze', 0, false, 'Delicious drink made with the finest tea leaves; served over ice.', 7);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Chocolate Kreme Shake', 6000, true, 'This treat features a luscious blend of rich,chocolate and creamy indulgence. 12 oz cup', 8);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Strawberry Chiller', 5900, true, 'Rich and Refreshing Strawberry frozen delight. Comes in a 16 oz cup', 9);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Mango Chiller', 5900, true, 'Rich and Refreshing Mango frozen delight. 16 oz cup', 10);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'McVities'' Strawberry Frozze', 0, false, 'Flavoured with Strawberry and topped with McVities.', 11);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Mocha Frozze', 0, false, 'Mocha Frozze is an indulgent and invigorating beverage, marrying the rich, bold flavors of coffee with the delightful sweetness of chocolate, all blended together with creamy, frosty perfection.', 12);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Coffee Frappe Chiller', 0, false, 'Coffee espresso shots in ice.', 13);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Ice Kreme with OG', 0, false, 'Signature, creamy soft serve ice kreme with Original glazed doughnut. 8 oz cup', 14);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Ice Kreme with Bites', 2100, true, 'Signature, creamy soft serve ice kreme with bites. 8 oz cup', 15);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Strawberry Kreme Shake', 6000, true, 'The Strawberry Kreme Shake promises a perfect harmony between fruity delight and creamy goodness in every sip, making it an irresistible choice for strawberry lovers. 12 oz cup', 16);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Espresso Shake', 0, false, 'Rich, smooth, and packed with bold espresso flavour, this shake is your perfect energizing treat.', 17);
insert into kk_import (category, name, price, available, description, sort) values ('Shakes & chillers', 'Lotus Kreme Shake', 0, false, 'Smooth ice kreme mixed with the caramelized, sprinkle goodness of Lotus cookies.', 18);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', 'Sprite', 800, true, 'Sprite', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', '5 Alive Original', 1000, true, '5 Alive Original', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', 'Fanta', 800, true, 'Fanta', 3);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', 'Eva Water', 700, true, 'Eva Water', 4);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', '5 Alive Tropical', 1000, true, '5 Alive Tropical', 5);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', 'Coke', 800, true, 'Coca cola', 6);
insert into kk_import (category, name, price, available, description, sort) values ('Soft drinks', 'Zero Coke', 0, false, 'Zero Coke', 7);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Delight box (chowdeck xlusive)', 21100, true, '1 Box of 6 Doughnuts & 2 Kreme Shakes for 15,300', 1);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Milky chocolate combo', 6500, true, 'A cup of Hot Chocolate + Milky Delight Doughnut', 2);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Half Time Treat', 0, false, 'Keep the match-day excitement going with 3 Original Glazed doughnuts, 3 Assorted doughnuts and 2 Kreme shakes.', 3);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', '5 dozen combo', 0, false, 'Make your office celebrations sweeter this season with our 5-dozen doughnut combo, featuring a delicious mix of OG glazed and Assorted doughnuts.', 4);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', '10 Dozen Mega Festive Combo', 0, false, 'Make your office celebrations sweeter this season with our 10-dozen doughnut combo, featuring a delicious mix of OG glazed and Assorted doughnuts.', 5);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Delight box', 0, false, 'A box of 6 doughnuts (3 Original Glazed + 3 assortedflavours) + 2 rich, creamy Kreme Shakes', 6);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Full Time Treat', 0, false, 'End the game on a sweet high with 6 Original Glazed, 6 Assorted Doughnuts and 2 Kreme Shakes.', 7);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Feast box', 0, false, 'A box of 12 doughnuts (6 crowd-favorite Original Glazed +6 assorted indulgent picks) + 2 Kreme Shakes', 8);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', '5 dozen combo (Ramadan)', 0, false, 'Celebrate Ramadan with 5 dozen doughnuts at a special price! A mix of Original Glazed and Assorted doughnuts. Ideal for offices, meetings, and group events.', 9);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Make my morning', 7100, true, 'Enjoy a 12ozCoffee (Americano, Latte, or Cappuccino) + any Doughnut oftheir choice (Original Glazed or Assorted)', 10);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'World chocolate day combo', 0, false, 'Enjoy this delicious pairing of 1 Hot Chocolate and 1 Triple Chocolate Doughnut.', 11);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Bbn deal', 11500, true, '1 Joy Box Assorted and 1 Kreme Shake', 12);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Frozen bliss with dozen surprises', 0, false, 'Buy a Dozen Assorted Treats and Get a 12oz FREE Frozee or Chiller Beverage', 13);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Original tuesday', 0, false, 'Get 35% off every dozen Original Glazed Doughnuts', 14);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Friday fiesta', 0, false, 'This combo contains 3 OG Donuts + 3 Assorted Donuts + 2Chillers/Frozee Drinks', 15);
insert into kk_import (category, name, price, available, description, sort) values ('Deals & combos', 'Super thursday', 15800, true, 'Get a DozenAssorted Doughnuts at a delightful discounted price everyThursday ONLY.​', 16);

insert into kk_sizes (item, label, delta, sort) values ('Assorted doughnuts', 'Single', 0, 1);
insert into kk_sizes (item, label, delta, sort) values ('Assorted doughnuts', 'Three', 3400, 2);
insert into kk_sizes (item, label, delta, sort) values ('Assorted doughnuts', 'Half dozen (6)', 8400, 3);
insert into kk_sizes (item, label, delta, sort) values ('Assorted doughnuts', 'Dozen (12)', 16800, 4);
insert into kk_sizes (item, label, delta, sort) values ('Assorted doughnuts', 'Double dozen (24)', 33600, 5);
insert into kk_sizes (item, label, delta, sort) values ('Original Glazed doughnuts', 'Single', 0, 1);
insert into kk_sizes (item, label, delta, sort) values ('Original Glazed doughnuts', 'Three', 0, 2);
insert into kk_sizes (item, label, delta, sort) values ('Original Glazed doughnuts', 'Half dozen (6)', 0, 3);
insert into kk_sizes (item, label, delta, sort) values ('Original Glazed doughnuts', 'Dozen (12)', 0, 4);
insert into kk_sizes (item, label, delta, sort) values ('Original Glazed doughnuts', 'Double dozen (24)', 0, 5);

do $krispykreme$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%krispy%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Krispy Kreme Novare', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Doughnut boxes', 1),
    ('Doughnuts', 2),
    ('Pull aparts', 3),
    ('Coffee & tea', 4),
    ('Shakes & chillers', 5),
    ('Soft drinks', 6),
    ('Deals & combos', 7)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Doughnut boxes', 1),
    ('Doughnuts', 2),
    ('Pull aparts', 3),
    ('Coffee & tea', 4),
    ('Shakes & chillers', 5),
    ('Soft drinks', 6),
    ('Deals & combos', 7)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from kk_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from kk_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where not exists (
    select 1 from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  );
  get diagnostics added = row_count;

  raise notice '% products corrected, % added.', moved, added;

  -- Box size, rebuilt from the list. Deleting a choice cannot disturb an
  -- order: order lines carry their own copy of the wording and the money.
  delete from item_option_groups g
  using menu_items m
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and g.name = 'Box';

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select distinct m.id, 'Box', true, 1, 1
  from menu_items m join kk_sizes s on s.item = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, s.label, s.delta, s.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join kk_sizes s on s.item = m.name
  where m.restaurant_id = r and g.name = 'Box';

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $krispykreme$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%krispy%'
  and not exists (
    select 1 from kk_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%krispy%'
order by c.sort_order, m.sort_order;

drop table if exists kk_import;
drop table if exists kk_sizes;
