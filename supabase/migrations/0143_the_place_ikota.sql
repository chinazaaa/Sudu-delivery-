-- The Place, Ikota: a counter of its own.
--
-- It arrived as a custom order, which is the shelf for things nobody sells.
-- Somebody does sell it, so it becomes a counter, and the orders that come
-- off it count towards the brand they actually came from.
--
-- Ajah, which is ten minutes past Sangotedo and now an area of its own.
-- Prices are the counter's with fifteen per cent on, the same as every
-- other kitchen here, to the nearest fifty.
insert into restaurants (name, address, closes_at, active, sort_order, slug, kind, area)
values ('The Place', 'Ikota Shopping Complex, Ajah, Lagos', time '21:00', true, 18, 'the-place', 'food', 'ajah');

insert into menu_categories (restaurant_id, name, sort_order, aisle)
select r.id, v.name, v.sort, v.aisle
from restaurants r, (values
  ('Value Munch', 0, 'Meals & combos'),
  ('Main menu', 1, 'Rice, pasta & bowls'),
  ('Protein', 2, 'Chicken'),
  ('Soups', 3, 'Soups & swallow'),
  ('Swallows', 4, 'Soups & swallow'),
  ('Side', 5, 'Sides & snacks'),
  ('Snacks', 6, 'Sides & snacks'),
  ('Nigerian Breweries Combo', 7, 'Meals & combos'),
  ('Drinks', 8, 'Drinks')
) as v(name, sort, aisle)
where r.slug = 'the-place';

-- The counter charges for the pack the food goes in. Where that is one
-- forced tick with nothing to choose between, it is in the price instead:
-- a salad that costs ₦1,600 should say ₦1,600 rather than ₦1,300 and a
-- box nobody can decline. Where the pack is an actual choice of two
-- sizes, it stays a choice.
insert into menu_items (restaurant_id, category_id, name, price_food, available, sort_order, image_url, description)
select c.restaurant_id, c.id, v.name, v.price, true, v.sort, v.img, v.descr
from menu_categories c
join restaurants r on r.id = c.restaurant_id and r.slug = 'the-place'
join (values
  ('Jollof rice & pepper chicken - extra large value munch', 4050, 0, 'https://files.chowdeck.com/images/2026/2026-06-08/bJ53oTgXCPcbrGkYRxVwU.webp', 'Jollof rice & hot pepper chicken - extra large value munch', 'Value Munch'),
  ('Smokey jollof rice & pepper chicken - extra large value munch', 4050, 1, 'https://files.chowdeck.com/images/2026/2026-06-08/OIBmWDe6mr1dE6IB96Kof.webp', 'Smokey Jollof rice & hot pepper chicken - extra large value munch', 'Value Munch'),
  ('Fried rice & pepper chicken - extra large value munch', 4050, 2, 'https://files.chowdeck.com/images/2026/2026-06-08/OsF1NSOT4w4rzSmvpiwB8.webp', 'Fried rice & hot pepper chicken - extra large value munch', 'Value Munch'),
  ('Extra large value munch - fried rice & chicken in stew', 4000, 3, 'https://files.chowdeck.com/images/2025/2025-08-13/gzz2Tl1YV3FpUmqVFCn2g.webp', '', 'Value Munch'),
  ('Extra large value munch - fried rice & curry chicken', 4000, 4, 'https://files.chowdeck.com/images/2025/2025-08-13/jSAxezi11ZGH12BAZASDZ.webp', '', 'Value Munch'),
  ('Extra-large value munch - jollof rice & chicken in stew', 4000, 5, 'https://files.chowdeck.com/images/2025/2025-08-13/qfgWwxrelVL0SCa4chtQc.webp', '', 'Value Munch'),
  ('Extra-large value munch - jollof rice & curry chicken', 4000, 6, 'https://files.chowdeck.com/images/2025/2025-08-13/byXvHqv7cGVMRDMHnipS0.webp', '', 'Value Munch'),
  ('Regular value munch - fried rice & chicken in stew', 3700, 7, 'https://files.chowdeck.com/images/2025/2025-08-13/rz3sWU35rjQseNXFdIS54.webp', '', 'Value Munch'),
  ('Regular value munch - fried rice & curry chicken', 3700, 8, 'https://files.chowdeck.com/images/2025/2025-08-13/TAJoNlJ6ZEQCEzfpqzvVJ.webp', '', 'Value Munch'),
  ('Regular value munch - jollof rice & chicken in stew', 3700, 9, 'https://files.chowdeck.com/images/2025/2025-08-13/11cmyQkieTXSYxP4dkjq9.webp', '', 'Value Munch'),
  ('Regular value munch - jollof rice & curry chicken', 3700, 10, 'https://files.chowdeck.com/images/2025/2025-08-13/X8ksP9WLVeK4ykj1gmGBZ.webp', '', 'Value Munch'),
  ('Extra large value munch - mix & chicken in stew', 4000, 11, 'https://files.chowdeck.com/images/2025/2025-09-30/qGuQujpZWBSWzqw3aXWw6.jpg', '', 'Value Munch'),
  ('Extra large value munch - mix & curry chicken', 4000, 12, 'https://files.chowdeck.com/images/2025/2025-09-30/XiuN9W0NiJ4U0IPYMfGga.jpg', '', 'Value Munch'),
  ('Fried rice & pepper chicken - small value munch', 3300, 13, 'https://files.chowdeck.com/images/2026/2026-08-01/lM3TTuU1b7RxTeaHjXilP.webp', 'One spoonful short grain fried rice with one piece of Hot spicy chicken.', 'Value Munch'),
  ('Regular value munch - jollof rice & pepper chicken', 3700, 14, 'https://files.chowdeck.com/images/2026/2026-08-01/lM3TTuU1b7RxTeaHjXilP.webp', '', 'Value Munch'),
  ('Jollof rice & pepper chicken - small value munch', 3300, 15, 'https://files.chowdeck.com/images/2026/2026-08-01/pZfppfL3FvZOYUlBJ5Isq.webp', 'One spoonful short grain jollof rice with one piece of Hot spicy chicken.', 'Value Munch'),
  ('Rice & beans', 1950, 16, 'https://files.chowdeck.com/images/kdq06ois2dj0u6ohnez1/1689789757.jpg', 'Rice and beans cooked together', 'Main menu'),
  ('Jollof rice', 1850, 17, 'https://files.chowdeck.com/images/mcfpjydqy6roe7ndtldu/1689787292.jpg', 'Short grain rice in tomatoes and pepper mix', 'Main menu'),
  ('Prawn rice', 3900, 18, 'https://files.chowdeck.com/images/uytm8jwvaioriytpexaf/1666944719.jpg', 'Delicious basmati seafood rice with some prawns and veggies', 'Main menu'),
  ('Fiesta fried rice', 3750, 19, 'https://files.chowdeck.com/images/p5tffhdnt1laubebpxec/1689786263.jpg', 'Basmati fried rice with veggies', 'Main menu'),
  ('Asun pepper rice', 4950, 20, 'https://files.chowdeck.com/images/lumjbcmigeuex8cyrwxf/1664905302.jpg', 'Basmati Rice garnished with veggies with some diced meat.', 'Main menu'),
  ('Fried rice', 1550, 21, 'https://files.chowdeck.com/images/rezljmjvaofvdrfebnva/1666949299.png', '', 'Main menu'),
  ('Special fried rice', 4150, 22, 'https://files.chowdeck.com/images/qftetk6w218invvwlfkx/1666978457.png', 'Basmati rice with veggies, egg and shredded beef', 'Main menu'),
  ('Stir fry spaghetti', 3900, 23, 'https://files.chowdeck.com/images/cxsekrol4q2kqeupscx4/1682757298.png', '', 'Main menu'),
  ('Jollof spaghetti', 1550, 24, 'https://files.chowdeck.com/images/tacxqzxgdyeezodmobms/1682151749.png', 'Spaghetti in pepper sauce and vegetables', 'Main menu'),
  ('Rich jollof rice', 4150, 25, 'https://files.chowdeck.com/images/pvsyuuj7canhjmk27mfm/1656338622.jpg', 'Basmati jollof rice with shredded beef and vegetable', 'Main menu'),
  ('Turkey pepper rice', 6750, 26, 'https://files.chowdeck.com/images/2024/2024-03-24/1H9a3L8JNkOhYrtJ1uIDB.png', 'Basmati rice, veggies with bite size fried turkey', 'Main menu'),
  ('Caribbean rice', 3000, 27, 'https://files.chowdeck.com/images/2024/2024-07-25/rtMfh4G2EPKLk9sliDkum.PNG', 'Delicious basmati carribean rice with some diced smokey beef, plantain and veggies', 'Main menu'),
  ('Asun fried rice & fried curry chicken combo', 6750, 28, 'https://files.chowdeck.com/images/2026/2026-02-12/MaYX9NTU1KwnKiCoKLxsh.jpeg', '', 'Main menu'),
  ('Asun fried rice', 4450, 29, 'https://files.chowdeck.com/images/2026/2026-01-28/yQIoQ0PpMp0p5lXcRlt3Z.png', 'Basmati rice garnished with smokey peppered meats and vegetables', 'Main menu'),
  ('Smokey Jollof Rice', 1550, 30, 'https://files.chowdeck.com/images/2025/2025-11-13/RDiZHWIQWUodSFnlmi5Bj.jpg', '', 'Main menu'),
  ('Panla fish - big', 3400, 31, 'https://files.chowdeck.com/images/swchle8rsc9vrahhpivy/1689789570.png', 'Fried panla fish in stew', 'Protein'),
  ('Croaker fish in stew - big', 5450, 32, 'https://files.chowdeck.com/images/mp5uqvvgtnd0dkuupp8i/1666978587.png', '', 'Protein'),
  ('Boiled egg', 500, 33, 'https://files.chowdeck.com/images/dcpfmj6qrjmfgavdz3gi/1666947158.jpg', '', 'Protein'),
  ('Honey BBQ Chicken', 2750, 34, 'https://files.chowdeck.com/images/i0guormyzaypenjbsf1t/1666947090.jpg', '', 'Protein'),
  ('Beef asun', 4050, 35, 'https://files.chowdeck.com/images/tqit14e0lezjxrybodnn/1666946286.jpg', 'Peppered cow meat', 'Protein'),
  ('Barbeque Chicken', 2600, 36, 'https://files.chowdeck.com/images/lwujkcwdkg2o3odpsnno/1666945551.png', 'Fried Chicken Barbeque Sauce', 'Protein'),
  ('Fried curry chicken', 2600, 37, 'https://files.chowdeck.com/images/yvlkzvp1d1fmm5nmlx8p/1666945471.png', '', 'Protein'),
  ('Grilled chicken - 1/4', 6200, 38, 'https://files.chowdeck.com/images/kvn6z9p9wt9r8aib7yyj/1666945217.png', 'Grilled Chicken coated with rough pepper sauce', 'Protein'),
  ('Grilled turkey wings-big', 8150, 39, 'https://files.chowdeck.com/images/aoejegudeo53axd0hpwh/1666945113.png', '', 'Protein'),
  ('Mini beef', 700, 40, 'https://files.chowdeck.com/images/gluod6ukfcuuu1mvh32t/1666947381.jpg', 'Beef in stew', 'Protein'),
  ('Shaki', 1300, 41, 'https://files.chowdeck.com/images/jllamf4ckk8n29vs3voh/1656336688.jpg', '', 'Protein'),
  ('Ponmo', 1300, 42, 'https://files.chowdeck.com/images/bn9n6ljqp9da4ociy9uo/1656336567.jpg', '', 'Protein'),
  ('Fried titus fish - big', 4950, 43, 'https://files.chowdeck.com/images/pfp3a3j9d5stm3xef5kk/1684217252.png', 'Fried Titus fried fish in stew', 'Protein'),
  ('Asun', 5250, 44, 'https://files.chowdeck.com/images/kdmzhb7hzfipvle4mbyx/1680087852.png', 'Peppered Diced goat meat', 'Protein'),
  ('Chicken in stew - small', 2600, 45, 'https://files.chowdeck.com/images/rjucm5bgkmp7sqzccraf/1697407617.png', 'Fried Chicken in stew', 'Protein'),
  ('Pepper chicken', 2600, 46, 'https://files.chowdeck.com/images/2026/2026-06-08/7enAqqt1tqUwBZhmBo42X.webp', '', 'Protein'),
  ('Goat meat', 2350, 47, 'https://files.chowdeck.com/images/2026/2026-07-21/6pClWGjmFjMMKGPAlmLF3.jpeg', '', 'Protein'),
  ('Egusi soup', 1300, 48, 'https://files.chowdeck.com/images/vrl7k2smydaciimich1q/1689012880.jpg', 'Delicious melon soup with some diced dried fish and vegetable', 'Soups'),
  ('Eforiro', 2600, 49, 'https://files.chowdeck.com/images/ynqnj3yb3oboaiclzwmc/1689012651.jpg', 'Delicious vegetable soup', 'Soups'),
  ('Edikaikong', 4150, 50, 'https://files.chowdeck.com/images/caargb281mvp8rce82sx/1689786488.jpg', 'Delicious vegetable soup', 'Soups'),
  ('Seafood Okro', 4550, 51, 'https://files.chowdeck.com/images/2024/2024-07-11/P5fYaeQDulGZiOriHvH7W.PNG', 'Delicious seafood soup with some shrimps and vegetable', 'Soups'),
  ('Eba', 700, 52, 'https://files.chowdeck.com/images/jqc4vuyo29snkffhiyo2/1663769711.jpg', 'Cooked garri', 'Swallows'),
  ('Pounded yam', 900, 53, 'https://files.chowdeck.com/images/2024/2024-06-26/HolZ51zUktz5rUEL9ZcDX.PNG', 'Pounded cooked yam', 'Swallows'),
  ('Coleslaw salad', 1600, 54, 'https://files.chowdeck.com/images/jnqgfdfipoap5ls6jqby/1689791805.png', 'Coleslaw - cabbage salad', 'Side'),
  ('Pasta vegetable salad', 1600, 55, 'https://files.chowdeck.com/images/kiukb5eslhslrlelevkf/1667729687.png', '', 'Side'),
  ('Fried Plantain', 1750, 56, 'https://files.chowdeck.com/images/pt1hu0twc9edwuppdoqu/1667729622.png', '', 'Side'),
  ('Jam Doughnut', 1050, 57, 'https://files.chowdeck.com/images/bshz9htf7hkkiikdarmd/1682929363.png', '', 'Snacks'),
  ('Beef roll', 900, 58, 'https://files.chowdeck.com/images/inui25dcyoo5kkz1bkp4/1682929207.png', '', 'Snacks'),
  ('Chicken pie', 1300, 59, 'https://files.chowdeck.com/images/xbw2y0duikmc03mljkuu/1682929620.png', '', 'Snacks'),
  ('Meat pie', 1300, 60, 'https://files.chowdeck.com/images/jjp42nxufqxeqlg58rnc/1663769875.jpg', '', 'Snacks'),
  ('Guiness Combo - Value Munch + Malta Guiness', 5650, 61, 'https://files.chowdeck.com/images/2026/2026-10-20/IkN5vdh5BRRWWPe8dS2Rr.webp', '', 'Nigerian Breweries Combo'),
  ('Pulpy Drink (85cl)', 3200, 62, 'https://files.chowdeck.com/images/vttubvjm8ymnv2rw36sq/1689838981.png', '', 'Drinks'),
  ('Chivita Juice', 4450, 63, 'https://files.chowdeck.com/images/cas08v9njq8hgovjjy9o/1663769809.jpg', '', 'Drinks'),
  ('Can Malta Guiness', 1550, 64, 'https://files.chowdeck.com/images/lp1otfnwa3oaawaywdb3/1663769606.jpg', '', 'Drinks'),
  ('Utterly yum juice', 3900, 65, 'https://files.chowdeck.com/images/oryyjh2bmlee8omakvsz/1688202458.png', 'Utterly Yum natural fruit juice', 'Drinks'),
  ('Coke (50cl)', 1050, 66, 'https://files.chowdeck.com/images/q0dstjy8olc2bvvrnpwu/1663769509.jpg', '', 'Drinks'),
  ('Sprite (50cl)', 1050, 67, 'https://files.chowdeck.com/images/tgqjui7jubnqb7uwyttx/1663769470.jpg', '', 'Drinks'),
  ('Fanta (50cl)', 1050, 68, 'https://files.chowdeck.com/images/rtthypetsdtfspi5xxne/1663769429.jpg', '', 'Drinks'),
  ('Lucozade Boost', 2600, 69, 'https://files.chowdeck.com/images/ouczppvswecfvwpsnjaq/1663769393.jpg', '', 'Drinks'),
  ('Manny fruit juice', 4950, 70, 'https://files.chowdeck.com/images/emjed1z3jkbf9jpo0crq/1688202477.png', '', 'Drinks'),
  ('Aquafina Water(75cl)', 500, 71, 'https://files.chowdeck.com/images/yuybwvbiqmgh0f7aakng/1663769281.jpg', '', 'Drinks'),
  ('Eva Water (75cl)', 500, 72, 'https://files.chowdeck.com/images/mhllv2sqr7zpjf4z2hkh/1663769242.jpg', '', 'Drinks'),
  ('Boomsky smoothie - 500ml (other flavors)', 5050, 73, 'https://files.chowdeck.com/images/z1w0jbdy6dk8pefqzqg9/1666948843.jpg', 'One boomsky smoothie', 'Drinks'),
  ('Pet Coca-Cola 35CL', 700, 74, 'https://files.chowdeck.com/images/2025/2025-03-13/3JpOEnxyc3rbjYwlrLyJn.jpg', '', 'Drinks'),
  ('Boomsky Smoothie-500ml (Banana &Coconut)', 5050, 75, 'https://files.chowdeck.com/images/2025/2025-08-25/wZtrHei7HJN2Br873bayK.PNG', 'Natural smoothie drink', 'Drinks'),
  ('Can maltina', 1550, 76, 'https://files.chowdeck.com/images/2025/2025-09-17/CNSOjBOfFq2f9sUvCV5Z7.jpg', '', 'Drinks'),
  ('Amstel Malta', 1700, 77, 'https://files.chowdeck.com/images/2025/2025-09-17/UaAfTZ3mSDRqL2aJep2Kn.jpg', '', 'Drinks')
) as v(name, price, sort, img, descr, cat) on c.name = v.cat;

-- The choices each plate carries. Every one of them adds its own price:
-- a protein added to a plate costs what that protein costs on its own,
-- which the counter's own list confirms line for line, so none of these is
-- the difference between two prices the way a pizza half is.
insert into item_option_groups (menu_item_id, name, required, max_select, sort_order, pricing)
select i.id, v.gname, v.required, v.maxsel, v.sort, 'add'
from menu_items i
join restaurants r on r.id = i.restaurant_id and r.slug = 'the-place'
join (values
  ('Rice & beans', 'Pack options', true, 1, 0),
  ('Rice & beans', 'Protein option', false, 2, 1),
  ('Jollof rice', 'Extra Rice options', false, 1, 0),
  ('Jollof rice', 'Pack options', true, 1, 1),
  ('Jollof rice', 'Protein option', false, 2, 2),
  ('Prawn rice', 'Pack options', true, 1, 0),
  ('Prawn rice', 'Protein option', false, 2, 1),
  ('Fiesta fried rice', 'Pack options', true, 1, 0),
  ('Asun pepper rice', 'Protein option', false, 2, 0),
  ('Asun pepper rice', 'Pack options', true, 1, 1),
  ('Fried rice', 'Pack options', true, 1, 0),
  ('Fried rice', 'Protein option', false, 2, 1),
  ('Fried rice', 'Extra Rice options', false, 1, 2),
  ('Special fried rice', 'Pack options', true, 1, 0),
  ('Special fried rice', 'Protein option', false, 2, 1),
  ('Special fried rice', 'Extra Rice options', false, 1, 2),
  ('Stir fry spaghetti', 'Protein option', false, 2, 0),
  ('Stir fry spaghetti', 'Pack options', true, 1, 1),
  ('Stir fry spaghetti', 'Extra Rice options', false, 1, 2),
  ('Jollof spaghetti', 'Protein option', false, 2, 0),
  ('Jollof spaghetti', 'Pack options', true, 1, 1),
  ('Jollof spaghetti', 'Extra Rice options', false, 1, 2),
  ('Rich jollof rice', 'Extra Rice options', false, 1, 0),
  ('Rich jollof rice', 'Pack options', true, 1, 1),
  ('Rich jollof rice', 'Protein option', false, 2, 2),
  ('Turkey pepper rice', 'Extra Rice options', false, 1, 0),
  ('Turkey pepper rice', 'Pack options', true, 1, 1),
  ('Caribbean rice', 'Pack options', true, 1, 0),
  ('Caribbean rice', 'Extra Rice options', false, 1, 1),
  ('Caribbean rice', 'Protein option', false, 2, 2),
  ('Asun fried rice & fried curry chicken combo', 'Pack options', true, 1, 0),
  ('Asun fried rice', 'Pack options', true, 1, 0),
  ('Smokey Jollof Rice', 'Pack options', true, 1, 0),
  ('Egusi soup', 'Pack options', true, 1, 0),
  ('Egusi soup', 'Protein option', false, 2, 1),
  ('Eforiro', 'Protein option', false, 2, 0),
  ('Eforiro', 'Pack options', true, 1, 1),
  ('Edikaikong', 'Pack options', true, 1, 0),
  ('Edikaikong', 'Protein option', false, 2, 1),
  ('Seafood Okro', 'Pack options', true, 1, 0),
  ('Seafood Okro', 'Protein option', false, 2, 1)
) as v(item, gname, required, maxsel, sort) on i.name = v.item;

-- The counter keeps one list per kind of choice, not one per plate: the
-- proteins you can add to a soup are the proteins you can add to a plate of
-- rice, at the same prices. So the options are written once and hung on
-- every group of that name, which is also what keeps them in step the day
-- a protein's price moves.
insert into item_options (group_id, name, price_delta, available, sort_order)
select g.id, v.oname, v.delta, v.av, v.sort
from item_option_groups g
join menu_items i on i.id = g.menu_item_id
join restaurants r on r.id = i.restaurant_id and r.slug = 'the-place'
join (values
  ('Pack options', 'Big Pack', 500, true, 0),
  ('Pack options', 'Big black pack', 800, true, 1),
  ('Protein option', 'Boiled egg', 500, true, 0),
  ('Protein option', 'Mini beef', 700, true, 1),
  ('Protein option', 'Shaki', 1300, true, 2),
  ('Protein option', 'Ponmo', 1300, true, 3),
  ('Protein option', 'Fried curry chicken', 2600, true, 4),
  ('Protein option', 'Barbeque Chicken', 2600, true, 5),
  ('Protein option', 'Honey BBQ Chicken', 2750, true, 6),
  ('Protein option', 'Beef asun', 3750, true, 7),
  ('Protein option', 'Fried titus fish - big', 4950, true, 8),
  ('Protein option', 'Asun', 4950, true, 9),
  ('Protein option', 'Croaker fish in stew - big', 5450, true, 10),
  ('Protein option', 'Grilled chicken - 1/4', 6200, true, 11),
  ('Protein option', 'Grilled turkey wings-big', 8150, true, 12),
  ('Extra Rice options', 'Jollof spaghetti', 1550, true, 0),
  ('Extra Rice options', 'Fried rice', 1550, true, 1),
  ('Extra Rice options', 'Fiesta fried rice', 3750, true, 2),
  ('Extra Rice options', 'Stir fry spaghetti', 3900, true, 3),
  ('Extra Rice options', 'Edikaikong', 4150, true, 4),
  ('Extra Rice options', 'Prawn rice', 3900, true, 5),
  ('Extra Rice options', 'Special fried rice', 4150, true, 6),
  ('Extra Rice options', 'Asun pepper rice', 4950, true, 7)
) as v(gname, oname, delta, av, sort) on g.name = v.gname;
