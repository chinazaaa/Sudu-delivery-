-- Burger King Novare, the whole menu.
--
-- Built from the price list you exported: 88 products across eight
-- sections, from 135 rows. Nothing of
-- this menu existed before, so everything here is new.
--
-- MEALS AND PORTIONS CARRY A SIZE CHOICE. The export lists Whopper
-- Meal-Regular, Whopper Meal-Medium and Whopper Meal-Large as three products.
-- Each is one product here with the size as a choice, priced from the list,
-- the way the pizzas work. Fries, Yam fries, Sweet potato and Plantain do the
-- same, and Nuggets and Chicken Wings carry a piece count.
--
-- Two products the export spells twice are treated as one: The King Chicken
-- Fillet meal - Large belongs with King Chicken Fillet meal, and Sweet Potato
-- Large with Sweet potato regular.
--
-- SUYA WHOPPER IS LEFT ALONE ON PURPOSE. The export lists Suya Whopper
-- Regular, Medium and Large, and separately a SUYA WHOPPER at a different
-- price again, plus a Chowdeck exclusive at that same price. Rather than guess
-- at which belongs with which, all of them go in as they are named. Tidy them
-- in admin once you know what the shop actually sells.
--
-- 2 products the export marks out of stock go in switched off.
--
-- Safe to run twice.

drop table if exists bk_import;
create table bk_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

drop table if exists bk_sizes;
create table bk_sizes (
  item      text not null,
  groupname text not null,
  label     text not null,
  delta     int  not null,
  sort      int  not null
);

insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Egg Burger', 2088, true, 'New Egg Burger!! Poached Eggs, Special BK Mayo on a toasted bun.', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Cheeseburger', 4060, true, 'Classic ingredients flavored just right. You can’t go wrong with our Cheeseburger, a signature flame-grilled beef patty topped with a simple layer of melted cheese, pickles and ketchup on a toasted sesame seed bun.', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Chicken Burger', 3480, true, 'The chicken burger is a mighty tasty chicken patty on a toasted sesame bun, topped with fresh lettuce and creamy mayonnaise', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'BBQ Egg Burger', 3480, true, 'New BBQ Egg Burger! Poached Egg, Smoky BBQ Sauce & 2 Fried Onion Rings on a toasted bun.', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Egg and Beef Burger', 6728, true, 'Breakfast just got better. Enjoy the Egg & Beef Burger made with creamy mayonnaise, BBQ sauce, sliced onions, beef bacon and poached egg all nestled between a 4inch bun.', 5);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Whopper', 7888, true, 'Our Whopper Sandwich is a ¼ lb* of savory flame-grilled beef topped with juicy tomatoes, fresh lettuce, creamy mayonnaise, ketchup, crunchy pickles, and sliced white onions on a soft sesame seed bun.', 6);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Big King', 7308, true, 'The BIG KING is one of the biggest in our family. With two freshly flame-grilled 100% pure beef patties, cheese, onions, pickles, lettuce and the unique BIG KING™ sauce, it just tastes amazing.', 7);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Chicken Royale', 6496, true, 'Tasty chicken wrapped in a special crisp coating, topped with iceberg lettuce, creamy mayo and crowned with a long toasted sesame seed bun', 8);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Double Cheeseburger', 6496, true, 'Classic ingredients flavored just right. You can’t go wrong with our Double Cheeseburger, a signature flame-grilled beef patty topped with a simple layer of melted cheese, pickles, and ketchup on a toasted sesame seed bun.', 9);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Hamburger', 3480, true, 'Our Hamburger is a signature flame-grilled beef patty topped with a simple layer of crinkle cut pickles, yellow mustard, and ketchup on a toasted sesame seed bun.', 10);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Crispy Chicken', 5916, true, 'Crispy on the outside, soft on the inside. The crispy chicken has everything you would expect from an excellent chicken burger: the finest chicken in a seasoned crispy coating, garnished with crunchy lettuce and freshly sliced tomatoes.', 11);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Steakhouse', 9860, true, 'Warm & toasted corn-dusted bun crowns a variety ingredients such as mayonnaise, crispy onions, lettuce, tomato, BBQ sauce, Swiss cheese, bacon, Whopper®patty, and warm & toasted corn-dusted bun at the bottom.', 12);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Suya Whopper Large', 12760, true, 'Suya Whopper Large', 13);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Suya Whopper Jr.', 5800, true, 'Suya Whopper Jr.', 14);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Big King Chicken', 7308, true, 'Enjoy the great taste of our Big king in double chicken patties and double cheese toppings for that mouth watering feeling.', 15);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Whopper Junior', 4640, true, 'Our Whopper Jr. Sandwich features one savory flame-grilled beef patty topped with juicy tomatoes, fresh lettuce, creamy mayonnaise, ketchup, crunchy pickles, and sliced white onions on a soft sesame seed bun.', 16);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Suya Whopper Regular', 10440, true, 'Suya Whopper Regular', 17);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Suya Whopper Medium', 11600, true, 'Suya Whopper Medium', 18);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Suya whopper', 8700, true, 'Suya whopper', 19);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Double Steakhouse', 12760, true, 'The Double Steakhouse consists of juicy flame-grilled 100% beef pattie, cheese, onions, lettuce, mayo and a deep smoky BBQ sauce in a brioche bun.', 20);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Double Whopper', 11252, true, 'Our Double Whopper Sandwich is a pairing of two ¼ lb* savory flame-grilled beef patties topped with juicy tomatoes, fresh lettuce, creamy mayonnaise, ketchup, crunchy pickles, and sliced white onions on a soft sesame seed bun.', 21);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'Big King XXL', 12760, true, 'Fresh flame-grilled beef, the original BIG KING sauce, and two delicious cheddar cheese slices, fresh lettuce, sliced white onions and crunchy pickles. The BIG KING® XXL is a real ultimate hunger beater.', 22);
insert into bk_import (category, name, price, available, description, sort) values ('Burgers', 'King Chicken Fillet', 7900, true, 'Crispy, golden chicken fillet with fresh lettuce and creamy mayo on a toasted bun. Simple, tasty, satisfying!', 23);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Chicken Burger Meal', 4640, true, 'Get more satisfaction with our regular meals featuring a regular pack of fries and a 33cl can drink.', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Egg Burger Meal', 4060, true, 'Egg Burger (Poached Eggs, Special BK Mayo on a toasted bun) + Regular French Fries + 35cl Drink', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'BBQ Egg Burger Meal', 5220, true, 'BBQ Egg Burger (Poached Egg, Smoky BBQ Sauce & 2 Fried Onion Rings on a toasted bun) + Regular French Fries + 35cl Drink', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Egg and Beef Burger Meal', 8120, true, 'Egg and Beef Burger Regular-Meal', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Hamburger Meal', 4640, true, 'Craving a bit more? Upgrade to our meal in medium size, for a medium pack of fries and a 35cl drink.', 5);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Cheeseburger Meal', 5220, true, 'Enjoy the Cheeseburger meal in regular size. It pairs perfectly with the Cheeseburger sandwich, pack of regular fries and a 33cl can drink.', 6);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Whopper Meal', 9048, true, 'The Whopper Meal is a pairing of our Whopper sandwich, a pack of regular fries and a 33cl can drink.', 7);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Chicken Royale Meal', 7656, true, 'Tasty chicken wrapped in a special crisp coating, topped with iceberg lettuce, creamy mayo and crowned with a long toasted sesame seed bun. Medium meals are served with medium-sized sides and a 35cl drink.', 8);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Big King Meal', 8468, true, 'The Big King meal is a pairing of our Big King sandwich, a pack of regular fries and a 33cl can drink.', 9);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Crispy Chicken Meal', 7076, true, 'Enjoy the Crispy Chicken meal in regular size. It pairs perfectly with the Crispy Chicken sandwich, pack of regular fries and a 33cl can drink.', 10);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Big King Chicken Meal', 8468, true, 'Enjoy the great taste of our Big king in double chicken patties and double cheese toppings for that mouth watering feeling. Regular meals come with regular-sized sides and a 33cl drink.', 11);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Suya Whopper Jr. Meal', 7540, true, 'Suya Whopper Jr. Regular Meal', 12);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Whopper Junior Meal', 6380, true, 'Enjoy the Whopper Junior meal in regular size. It pairs perfectly with the Whopper Junior sandwich, pack of regular fries and a 33cl can drink.', 13);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Double Cheeseburger Meal', 7656, true, 'A perfect meal, the Double cheeseburger features our Classic ingredients flavored just right. Grab a quick meal now paired with regular pack of fries and a 33cl can drink.', 14);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Double Steakhouse Meal', 14500, true, 'The Steakhouse meal is a pairing of our Steakhouse sandwich, a pack of regular fries and a 33cl can drink.', 15);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Double Whopper Meal', 13340, true, 'The Double Whopper Meal is a pairing of our Double Whopper sandwich, a pack of regular fries and a 33cl can drink.', 16);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Steakhouse Meal', 12180, true, 'The Steakhouse meal is a pairing of our Steakhouse sandwich, a pack of regular fries and a 33cl can drink.', 17);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'King Chicken Fillet Meal', 11020, true, 'Crispy, golden chicken fillet with fresh lettuce and creamy mayo on a toasted bun. Simple, tasty, satisfying! Paired with a regular pack side and a refreshing 33cl can drink', 18);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Big King XXL Meal', 14500, true, 'The Big King XXL meal is a pairing of our Big King XXL sandwich, a pack of regular fries and a 33cl can drink.', 19);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Mandalorian Chicken Royale Meal', 17400, true, 'Enjoy the great taste of our Mandalorian Chicken Royale Meal paired with fries and a bottle of coke', 20);
insert into bk_import (category, name, price, available, description, sort) values ('Meals', 'Mandalorian Whopper Meal', 17400, true, 'Enjoy the great taste of our Mandalorian Whopper meal paired with fries and a bottle of coke', 21);
insert into bk_import (category, name, price, available, description, sort) values ('Gourmet', 'The Beef Gourmet', 18560, true, 'Double beef patties with crispy onions, smoky bacon, melted cheese, fresh tomatoes, rocket leaves, creamy mayo, and a rich BBQ sauce—all served in a toasted brioche bun. A bold and satisfying gourmet experience.', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Gourmet', 'The Chicken Gourmet', 18560, true, 'Double chicken patties layered with beef bacon strips, crispy onions, fresh tomatoes, rocket leaves, melted cheese, and creamy mayonnaise—all tucked into a soft brioche bun. Rich, hearty, and full of flavor.', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Gourmet', 'The Beef Gourmet Meal', 23200, true, 'The Beef Gourmet paired with Gourmet fries and a drink.', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Gourmet', 'The Chicken Gourmet Meal', 23200, true, 'The Chicken Gourmet - a bold fusion of flavor and crunch, paired with Gourmet fries and a drink.', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Gourmet', 'The Meat Lover Gourmet', 19720, true, 'A hearty stack of a flame-grilled Whopper patty and tender chicken patty, layered with crispy bacon, melted cheese, rocket leaves, crispy onions, and our signature Big King sauce. Built for true meat lovers.', 5);
insert into bk_import (category, name, price, available, description, sort) values ('Gourmet', 'The Meat Lover Gourmet Meal', 24360, true, 'Savory flamed grilled fusion, paired with gourmet fries and a drink', 6);
insert into bk_import (category, name, price, available, description, sort) values ('Kids meals', 'Kids Meal Cheeseburger', 7540, true, 'Kids Meal Cheeseburger', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Kids meals', 'Kids Meal Hamburger', 6960, true, 'Every Burger King Kids Meal now comes with an exclusive Star Wars collectible. Collect them all—only at Burger King!', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Kids meals', 'Kids Meal Chicken Burger', 6960, true, 'Every Burger King Kids Meal now comes with an exclusive Star Wars collectible. Collect them all—only at Burger King!', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Kids meals', 'Kids Meal Nuggets', 6960, true, 'Every Burger King Kids Meal now comes with an exclusive Star Wars collectible. Collect them all—only at Burger King!', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'Egg & Beef Burger with Bacon - Chowdeck Xclusive', 6728, true, 'Egg & Beef Burger with Bacon', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'Suya Whopper Jr. - Chowdeck Xclusive', 5800, true, 'Suya Whopper Jr.', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'Suya Chopz - Chowdeck Xclusive', 8468, true, 'Suya Whopper + Small Chops Lite (15pcs) + 35cl Drink', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'Suya Whopper - Chowdeck Xclusive', 8700, true, 'Suya Whopper', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', '2 Egg Burgers - Chowdeck Xclusive', 4176, true, '2 Egg Burgers', 5);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'Coke 75th Anniversary Combo', 0, false, 'Big King Chicken Burger + Sweet Potato Regular + 60cl Drink', 6);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'King Savers Deal - Reload', 11020, true, 'Chicken Burger + 2pcs Chicken Wings + Regular Sweet Potato', 7);
insert into bk_import (category, name, price, available, description, sort) values ('Deals & exclusives', 'King Savers Deal - Chop Beta', 9860, true, 'Chicken Burger + Cheeseburger + Sweet Potato Regular', 8);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Yam fries', 2320, true, 'Upgrade your burger experience with our crispy yam fries. Sweet, savory, and perfectly seasoned, they''re the ideal sidekick to elevate your meal', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Sweet potato', 2320, true, 'Crispy, golden bites of sweet potato perfection. Lightly seasoned and irresistibly tasty, they''re a delightful side to any meal', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Nuggets', 3480, true, 'Our bite-sized Chicken Nuggets are tender and juicy on the inside and crispy on the outside. Perfect for dipping in any of our delicious dipping sauces.', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Plantain', 2320, true, 'Bite-sized delights, lightly fried to perfection, offering a delightful crunch with each savory bite. Perfectly seasoned for a burst of flavor in every cube', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Chicken Wings', 5220, true, 'Our perfectly spiced chicken wings are great for sharing. Elevate your burger experience with our succulent chicken wings. Crispy, juicy, and bursting with flavor, these wings are the perfect addition to any burger meal', 5);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Fries', 2320, true, 'Crispy, golden perfection. Upgrade your burger with our irresistible French fries, the ultimate sidekick for your meal. Satisfy your cravings with each delicious bite.', 6);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Small Chops Lite Meal', 2320, true, '1 Chicken Nugget, 6 Puff Puff, 7 Plantain Cubes & 1 Chicken Samosa + 35cl Drink', 7);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Small Chops Lite (15pcs)', 1740, true, '1 Chicken Nugget, 6 Puff Puff, 7 Plantain Cubes & 1 Chicken Samosa', 8);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Small Chops Regular (17pcs)', 3480, true, '1 Chicken Wing, 6 Puff Puff, 7 Plantain Cubes, 1 Chicken Samosa, 1 Chicken Spring Roll & 1 Onion Ring', 9);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Gourmet Fries', 5800, true, 'Golden French fries loaded with rich Chilli cheese sauce, crispy beef bacon, and crunchy fried onions. A bold, savory treat made for serious flavor lovers.', 10);
insert into bk_import (category, name, price, available, description, sort) values ('Sides', 'Small Chops Regular Meal', 4060, true, '1 Chicken Wing, 6 Puff Puff, 7 Plantain Cubes, 1 Chicken Samosa, 1 Chicken Spring Roll & 1 Onion Ring + 35cl Drink', 11);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Monster Chicken Combo', 0, false, '2 Chicken Burgers + Sweet Potato Regular + 1 Monster Drink', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Schweppes Mojito 40cl', 1100, true, 'Schweppes Mojito 40cl', 2);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Eva Water 75cl PET', 812, true, '', 3);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Five Alive Pulpy Juice 30cl PET', 1160, true, '', 4);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Monster Original 440ml', 2200, true, 'Monster Original 440ml', 5);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Schweppes Chapman 40cl', 1100, true, 'Schweppes Chapman 40cl', 6);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Sprite Lemon 35cl PET', 928, true, '', 7);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Schweppes Pineapple 40cl', 1100, true, 'Schweppes Pineapple 40cl', 8);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Fanta Orange 35cl PET', 928, true, 'Fanta Orange 35cl PET', 9);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Monster Zero Ultra 440ml', 2200, true, 'Monster Zero Ultra 440ml', 10);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Sprite Lemon 50cl PET', 1160, true, '', 11);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Coca-Cola 35cl PET', 928, true, '', 12);
insert into bk_import (category, name, price, available, description, sort) values ('Drinks', 'Coca-Cola 50cl PET', 1160, true, '', 13);
insert into bk_import (category, name, price, available, description, sort) values ('Add-ons', 'Cheese - Add-on ONLY', 700, true, 'Add Cheese to your burgers. Available as an add-on only. Cannot be ordered as a single item only.', 1);
insert into bk_import (category, name, price, available, description, sort) values ('Add-ons', 'Beef Bacon- Add-on ONLY', 1100, true, 'Add Beef Bacon to your burgers. Available as an add-on only. Cannot be ordered as a single item only.', 2);

insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Burger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Burger Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Burger Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Egg Burger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Egg Burger Meal', 'Size', 'Medium', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Egg Burger Meal', 'Size', 'Large', 1160, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('BBQ Egg Burger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('BBQ Egg Burger Meal', 'Size', 'Medium', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('BBQ Egg Burger Meal', 'Size', 'Large', 1160, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Egg and Beef Burger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Egg and Beef Burger Meal', 'Size', 'Medium', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Egg and Beef Burger Meal', 'Size', 'Large', 1160, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Hamburger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Hamburger Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Hamburger Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Cheeseburger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Cheeseburger Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Cheeseburger Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Whopper Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Whopper Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Whopper Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Royale Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Royale Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Royale Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Crispy Chicken Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Crispy Chicken Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Crispy Chicken Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King Chicken Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King Chicken Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King Chicken Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Suya Whopper Jr. Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Suya Whopper Jr. Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Suya Whopper Jr. Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Whopper Junior Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Whopper Junior Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Whopper Junior Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Cheeseburger Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Cheeseburger Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Cheeseburger Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Steakhouse Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Steakhouse Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Steakhouse Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Whopper Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Whopper Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Double Whopper Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Steakhouse Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Steakhouse Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Steakhouse Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('King Chicken Fillet Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('King Chicken Fillet Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('King Chicken Fillet Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Yam fries', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Yam fries', 'Size', 'Large', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Sweet potato', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Sweet potato', 'Size', 'Large', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King XXL Meal', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King XXL Meal', 'Size', 'Medium', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Big King XXL Meal', 'Size', 'Large', 2320, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Nuggets', 'Pieces', '4 pieces', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Nuggets', 'Pieces', '6 pieces', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Nuggets', 'Pieces', '9 pieces', 3480, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Plantain', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Plantain', 'Size', 'Large', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Wings', 'Pieces', '3 pieces', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Wings', 'Pieces', '4 pieces', 1160, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Chicken Wings', 'Pieces', '6 pieces', 3480, 3);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Fries', 'Size', 'Regular', 0, 1);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Fries', 'Size', 'Medium', 580, 2);
insert into bk_sizes (item, groupname, label, delta, sort) values ('Fries', 'Size', 'Large', 1160, 3);

do $burgerking$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%burger king%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Burger King Novare', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Burgers', 1),
    ('Meals', 2),
    ('Gourmet', 3),
    ('Kids meals', 4),
    ('Deals & exclusives', 5),
    ('Sides', 6),
    ('Drinks', 7),
    ('Add-ons', 8)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Burgers', 1),
    ('Meals', 2),
    ('Gourmet', 3),
    ('Kids meals', 4),
    ('Deals & exclusives', 5),
    ('Sides', 6),
    ('Drinks', 7),
    ('Add-ons', 8)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from bk_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from bk_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where not exists (
    select 1 from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  );
  get diagnostics added = row_count;

  raise notice '% products corrected, % added.', moved, added;

  -- Size and piece count, rebuilt from the list. Deleting a choice cannot
  -- disturb an order: order lines carry their own copy of the wording and the
  -- money.
  delete from item_option_groups g
  using menu_items m
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and g.name in ('Size', 'Pieces');

  insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
  select distinct m.id, s.groupname, true, 1, 1
  from menu_items m join bk_sizes s on s.item = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, s.label, s.delta, s.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join bk_sizes s on s.item = m.name and s.groupname = g.name
  where m.restaurant_id = r;

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $burgerking$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%burger king%'
  and not exists (
    select 1 from bk_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%burger king%'
order by c.sort_order, m.sort_order;

drop table if exists bk_import;
drop table if exists bk_sizes;
