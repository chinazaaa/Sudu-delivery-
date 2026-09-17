-- Dodo Pizza Novare, the whole menu.
--
-- Built from the price list you exported: 76 products across eight
-- sections, from 120 rows. Nothing of this menu existed before, so
-- everything here is new.
--
-- THE PIZZAS CARRY A SIZE CHOICE. The export lists Cheesy Chicken - M,
-- Cheesy Chicken - L and Cheesy Chicken - XL as three products. Each is one
-- product here with Medium, Large and Extra large as a choice, priced from
-- the list, the way the other pizza menus work.
--
-- The export punctuates a size five ways, from Veggie Overload- L to
-- Super Meaty -XL to Shawarma pizza - m, and spells the same pizza with and
-- without a capital P. All of them are read as the same product, so Shawarma
-- Pizza appears once with three sizes rather than twice with one each.
--
-- Strips, wings and rolls carry a piece count in the same way, so Chicken
-- strips is one product offering 4 or 8 pieces.
--
-- 14 products the export marks out of stock go in switched off.
--
-- Safe to run twice.

drop table if exists dodo_import;
create table dodo_import (
  category    text    not null,
  name        text    not null,
  price       int     not null,
  available   boolean not null,
  description text    not null,
  sort        int     not null
);

drop table if exists dodo_sizes;
create table dodo_sizes (
  item      text not null,
  groupname text not null,
  label     text not null,
  delta     int  not null,
  sort      int  not null
);

insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Cheesy Chicken', 9600, true, 'Chicken, tomatoes, cheddar, mozzarella, cheese sauce', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Sweet Chili Chicken', 8800, true, 'Spicy chicken, chili pepper, mozzarella, sweet chili sauce, tomato sauce', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Dodo Supreme', 9600, true, 'Tomato sauce, Spicy chicken, Spicy meatballs, Mozzarella, Onion, Green pepper, Tomato, Fried Plantain, Sweet Chili sauce', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Veggie Overload', 8800, true, 'Mushrooms, bell peppers, corn, olives, red onions, tomatoes, mozzarella, tomato sauce', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Cheeseburger Pizza', 9600, true, 'Beef, tomatoes, onions, cheddar, mozzarella, mayonnaise & ketchup, tomato sauce', 5);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Shawarma Pizza', 8800, true, 'Spicy chicken, red onions, tomatoes, mozzarella, mayonnaise & ketchup', 6);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Chicken Teriyaki Pizza', 9100, true, 'Chicken,Mozzarella, Red onion, Green pepper and Teriyaki sauce', 7);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Meaty BBQ', 8800, true, 'Beef, pepperoni, sausages, mozzarella, BBQ sauce, tomato sauce', 8);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Dodo BBQ', 9100, true, 'Chicken, Green pepper, red pepper, sausage, corn, plantain, tomato sauce, mozzarella, BBQ', 9);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Super Meaty', 9100, true, 'Chicken, pepperoni, sausages, mozzarella, tomato sauce', 10);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Chicken Supreme', 9600, true, 'Chicken, spicy chicken, mushrooms, bell peppers, olives, red onions, mozzarella, tomato sauce', 11);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Meaty Overload', 9600, true, 'Pepperoni, spicy meatballs, chicken, sausages, mozzarella, tomato sauce', 12);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Chicken Suya', 9100, true, 'Spicy chicken, bell peppers, red onions, suya mayonnaise sauce, tomato sauce, mozzarella, suya spices', 13);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Chicken BBQ', 9100, true, 'Chicken, red onions, corn, mozzarella, BBQ sauce, tomato sauce', 14);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Beef Suya', 8800, true, 'Spicy meatballs, bell pepper, red onions, mozzarella, suya mayonnaise sauce, tomato sauce, suya spices', 15);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Naija Chicken', 9600, true, 'Chicken, Red Onions, Green Pepper, Red Pepper, Jollof Mayo and Mozzarella Cheese', 16);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Pepperoni', 8800, true, 'Pepperoni, mozzarella, tomato sauce', 17);
insert into dodo_import (category, name, price, available, description, sort) values ('Pizzas', 'Margherita', 7900, true, 'Mozzarella, tomato sauce', 18);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Teriyaki Twist Dodster', 4900, true, 'Hot baked wrap with Chicken,Sausage, Red onion, Green pepper and Teriyaki sauce', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Choco Plantain Pocket', 0, false, 'Hot baked stuffed roll with fried plantain, Milk Chocolate and spicy Chilli Pepper', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Beef Suya Dodster', 4900, true, 'Hot baked wrap with spicy meatballs, red onions, tomatoes, mozzarella and suya mayonnaise sauce', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Classic Dodster', 4900, true, 'Hot baked wrap with chicken, tomatoes, mozzarella and mayonnaise & ketchup', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Shawarma Dodster', 4900, true, 'Hot baked wrap with chicken strips, sausages, chili pepper, shawarma sauce', 5);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Chicken BBQ Dodster', 4900, true, 'Hot baked wrap with chicken marinated in BBQ sauce, tomatoes, mozzarella and mayonnaise & ketchup', 6);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Chilli Plantain Pocket', 0, false, 'Hot baked stuffed roll with fried plantain and spicy Chilli Pepper', 7);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Beef Suya Pocket', 0, false, 'Beef suya pocket', 8);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Pizzetta Shawarma', 0, false, 'Pizzetta Shawarma', 9);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Mushroom Pocket', 0, false, 'Mushroom Pocket', 10);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Pizzetta Cheezetta', 0, false, 'Pizzetta Cheezetta', 11);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'Pizzetta Sweet Chilli Chicken', 0, false, 'Pizzetta Chilli', 12);
insert into dodo_import (category, name, price, available, description, sort) values ('Dodsters & pockets', 'BBQ Chicken Pocket', 0, false, 'BBQ chicken pocket', 13);
insert into dodo_import (category, name, price, available, description, sort) values ('Pasta', 'Chicken Teriyaki Pasta', 5500, true, 'Pasta, Tomato sauce, Mozzarella, Teriyaki sauce, Green pepper and Red onion', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Pasta', 'Chicken Chili Pasta', 6000, true, 'Pasta, Shawarma Sauce, Chicken, Mushrooms, Fresh Tomatoes, Sweet Corn, Mozzarella Cheese & Sweet Chili Sauce', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Pasta', 'Meat Suya Pasta', 6000, true, 'Pasta, Tomato Sauce, Chicken, Meatballs, Onions, Fresh Tomatoes, Suya Mayonnaise & Mozzarella Cheese', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Pasta', 'Sausage BBQ Pasta', 5500, true, 'Pasta, Tomato Sauce, Sausage, Red Chili Pepper, Fresh Tomatoes, Sweet Corn, Mozzarella Cheese & BBQ Sauce', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Sides', 'Chicken strips', 4200, true, 'Baked Chicken Strips', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Sides', 'Chicken Suya Strips', 4200, true, 'Baked Chicken Suya Strips', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Sides', 'Spicy Chicken Wings', 5300, true, 'Baked Chicken Wings marinated in Tomato sauce and Chilli Pepper', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Sides', 'Sausage Roll', 3700, true, 'Specialty. Small rolls of Dodo dough with cheese sauce, mozzarella & sausages', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Sides', 'Suya Wings', 5300, true, '5 pieces of delicious suya-spiced chicken wings', 5);
insert into dodo_import (category, name, price, available, description, sort) values ('Sides', 'Chicken Wings BBQ', 5300, true, '10 pieces - Baked chicken wings marinated in BBQ sauce', 6);
insert into dodo_import (category, name, price, available, description, sort) values ('Desserts', 'Chocolate Rolls', 0, false, 'Specialty. Small rolls of Dodo dough with melted chocolate and chocolate sauce', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Desserts', 'Cinnamon Rolls', 1600, true, 'Specialty. Small rolls of Dodo dough with cinnamon and sugar', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Desserts', 'Ice Cream 0,15L Alpine Chocolate', 0, false, 'Chocolate Flavour', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Mighty Bear Kids Meal', 11500, true, 'Choice of any Bear Pizza with 5pcs of Chicken Nuggets and a Pet Bottle of 5 Alive Orange Juice, 0.3l or Water.', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Cheesy Bear', 7000, true, 'Made with Cheese Sauce & Mozzarella Cheese.', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Kids Family Meal', 22700, true, 'Choice of Two Bear Pizza with 5pcs of Chicken Nuggets, 8pcs of Chocolate Rolls and Two Pet Bottles of 5 Alive Orange Juice 0.3l or Water.', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Sweet Bear Kids Meal', 11200, true, 'Choice of any Bear Pizza with 8pcs of Chocolate Rolls and a Pet Bottle 5 Alive Orange Juice, 0.3l or Water.', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Chicken Cheese Bear', 7000, true, 'Made with Mozzarella, Tomato Sauce, Chicken & Shawarma Sauce.', 5);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Chicken Bear', 7000, true, 'Made with Mozzarella, Tomato Sauce, Tomatoes, Green Pepper, Corn & Chicken.', 6);
insert into dodo_import (category, name, price, available, description, sort) values ('Kids', 'Pepperoni Bear', 7000, true, 'Made with Mozzarella Cheese, Tomato Sauce & Pepperoni.', 7);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Lunch Deal', 0, false, 'Choose any one of our Delicious Pasta with a Pizzetta and a Drink.', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Buy 2 Get 1 Free', 22600, true, 'Buy 2 Get 1 Free', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Pasta Duet', 0, false, 'It''s a pasta duet! Buy 2 pasta and 2 Coca-Cola drinks for N12,000', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Double up Friday', 16000, true, 'Buy 1 XL Pizza, Get 1 XL Pizza Free!', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'The Ultimate Dodo Deal', 26000, true, 'Order 2 Medium Pizzas+ 5 Chicken Wings, + 1 Coke, + Eva Water and make it extra tasty with family and friends!', 5);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'dodo flash deal', 10400, true, '1 medium pizza & 1 35cl coke', 6);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Dodo saver deal', 12300, true, '1 large pizza & 1 35cl coke', 7);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Deluxe Offer', 27900, true, 'Get 25% off on Deluxe Offer! 1 Extra Large Pizza, 10 pcs of Chicken Strips and 2 Coca-Cola drinks.', 8);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Family Deal', 23300, true, 'Get 25% off on Family Deal! 1 large pizza, 10 pieces of Chicken Strips and 2 Coca-Cola drinks!', 9);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Pizza Duet', 20800, true, 'Get 38% off Pizza Duet! 2 Medium Pizzas and 2 Coca-Cola drinks!', 10);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Combo for 4', 34800, true, 'Save 36% on Combo for 4! Two large pizzas, 8 pieces of Chicken strips and 4 Coca-Cola drinks. Amazing combination for four people.', 11);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Combo for 2', 17600, true, 'Save 30% on Combo for 2! One large pizza, 4 pieces of Chicken strips and 2 Coca-Cola drinks. Ideal combination to satisfy two people.', 12);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Combo for 1', 14600, true, 'Save 30% on Combo for 1! One medium pizza, 4 pieces of chicken strips and a Coca-Cola drink. Ideal combination to indulge one person.', 13);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Work & Share Combo', 67800, true, '5 Medium Pizza & 20 Chicken Wings BBQ', 14);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Office Feast', 88700, true, '5 Large Pizza & 30 Chicken Wings BBQ', 15);
insert into dodo_import (category, name, price, available, description, sort) values ('Deals', 'Group Pizza Deal', 119600, true, '5 X Large Pizza & 40 Chicken Wings BBQ', 16);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Fanta 0,35L', 800, true, 'Fanta 0,35L', 1);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Water still Eva 0,75L', 700, true, 'Water still Eva 0,75L', 2);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Schweppes Virigin Mojito 0,33L', 900, true, 'Schweppes Virigin Mojito 0,33L', 3);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Schweppes Pineapple 0,33L', 900, true, 'Schweppes Pineapple 0,33L', 4);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Schweppes Chapman 0,33L', 900, true, 'Schweppes Chapman 0,33L', 5);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Juice 5 Alive Orange 1L', 0, false, 'Juice 5 Alive Orange 1L', 6);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Juice 5 Alive Orange 0,35L', 0, false, 'Juice 5 Alive Orange 0,35L', 7);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Coca Cola 0,35L', 800, true, 'Coca Cola 0,35L', 8);
insert into dodo_import (category, name, price, available, description, sort) values ('Drinks', 'Sprite 0,35L', 800, true, 'Sprite 0,35L', 9);

insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken strips', 'Pieces', '4 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken strips', 'Pieces', '8 pieces', 3600, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Suya Strips', 'Pieces', '4 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Suya Strips', 'Pieces', '8 pieces', 3600, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chocolate Rolls', 'Pieces', '8 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chocolate Rolls', 'Pieces', '16 pieces', 0, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Spicy Chicken Wings', 'Pieces', '5 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Spicy Chicken Wings', 'Pieces', '10 pieces', 4600, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Sausage Roll', 'Pieces', '8 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Sausage Roll', 'Pieces', '16 pieces', 1600, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cinnamon Rolls', 'Pieces', '8 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cinnamon Rolls', 'Pieces', '16 pieces', 800, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Suya Wings', 'Pieces', '5 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Suya Wings', 'Pieces', '10 pieces', 4600, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cheesy Chicken', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cheesy Chicken', 'Size', 'Large', 2200, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cheesy Chicken', 'Size', 'Extra large', 6400, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Wings BBQ', 'Pieces', '5 pieces', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Wings BBQ', 'Pieces', '10 pieces', 4600, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Sweet Chili Chicken', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Sweet Chili Chicken', 'Size', 'Large', 2500, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Sweet Chili Chicken', 'Size', 'Extra large', 6000, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Dodo Supreme', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Dodo Supreme', 'Size', 'Large', 2200, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Dodo Supreme', 'Size', 'Extra large', 6400, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Veggie Overload', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Veggie Overload', 'Size', 'Large', 2500, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Veggie Overload', 'Size', 'Extra large', 6000, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cheeseburger Pizza', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cheeseburger Pizza', 'Size', 'Large', 2200, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Cheeseburger Pizza', 'Size', 'Extra large', 6400, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Shawarma Pizza', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Shawarma Pizza', 'Size', 'Large', 2500, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Shawarma Pizza', 'Size', 'Extra large', 6000, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Teriyaki Pizza', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Teriyaki Pizza', 'Size', 'Large', 2400, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Teriyaki Pizza', 'Size', 'Extra large', 6700, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Meaty BBQ', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Meaty BBQ', 'Size', 'Large', 2500, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Meaty BBQ', 'Size', 'Extra large', 6000, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Dodo BBQ', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Dodo BBQ', 'Size', 'Large', 2400, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Dodo BBQ', 'Size', 'Extra large', 6700, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Super Meaty', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Super Meaty', 'Size', 'Large', 2400, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Super Meaty', 'Size', 'Extra large', 6700, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Supreme', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Supreme', 'Size', 'Large', 2200, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Supreme', 'Size', 'Extra large', 6400, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Meaty Overload', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Meaty Overload', 'Size', 'Large', 2200, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Meaty Overload', 'Size', 'Extra large', 6400, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Suya', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Suya', 'Size', 'Large', 2400, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken Suya', 'Size', 'Extra large', 6700, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken BBQ', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken BBQ', 'Size', 'Large', 2400, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Chicken BBQ', 'Size', 'Extra large', 6700, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Beef Suya', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Beef Suya', 'Size', 'Large', 2500, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Beef Suya', 'Size', 'Extra large', 6000, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Naija Chicken', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Naija Chicken', 'Size', 'Large', 2200, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Naija Chicken', 'Size', 'Extra large', 6400, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Pepperoni', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Pepperoni', 'Size', 'Large', 2500, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Pepperoni', 'Size', 'Extra large', 6000, 3);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Margherita', 'Size', 'Medium', 0, 1);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Margherita', 'Size', 'Large', 2000, 2);
insert into dodo_sizes (item, groupname, label, delta, sort) values ('Margherita', 'Size', 'Extra large', 5000, 3);

do $dodopizza$
declare
  r uuid;
  moved int;
  added int;
begin
  select id into r from restaurants where name ilike '%dodo%' limit 1;
  if r is null then
    insert into restaurants (name, address, closes_at, active)
    values ('Dodo Pizza Novare', 'Novare Mall, Sangotedo', time '22:00', true)
    returning id into r;
  end if;

  insert into menu_categories (restaurant_id, name, sort_order)
  select r, v.name, v.sort
  from (values
    ('Pizzas', 1),
    ('Dodsters & pockets', 2),
    ('Pasta', 3),
    ('Sides', 4),
    ('Desserts', 5),
    ('Kids', 6),
    ('Deals', 7),
    ('Drinks', 8)
  ) as v(name, sort)
  where not exists (
    select 1 from menu_categories where restaurant_id = r and name = v.name
  );

  update menu_categories c set sort_order = v.sort
  from (values
    ('Pizzas', 1),
    ('Dodsters & pockets', 2),
    ('Pasta', 3),
    ('Sides', 4),
    ('Desserts', 5),
    ('Kids', 6),
    ('Deals', 7),
    ('Drinks', 8)
  ) as v(name, sort)
  where c.restaurant_id = r and c.name = v.name;

  update menu_items m
  set name        = i.name,
      price_food  = i.price,
      description = case when i.description <> '' then i.description else m.description end,
      available   = i.available,
      sort_order  = i.sort,
      category_id = c.id
  from dodo_import i
       join menu_categories c on c.restaurant_id = r and c.name = i.category
  where m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'));
  get diagnostics moved = row_count;

  insert into menu_items
    (restaurant_id, category_id, name, price_food, description, available, sort_order)
  select r, c.id, i.name, i.price, i.description, i.available, i.sort
  from dodo_import i
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
  from menu_items m join dodo_sizes s on s.item = m.name
  where m.restaurant_id = r;

  insert into item_options (group_id, name, price_delta, sort_order)
  select g.id, s.label, s.delta, s.sort
  from item_option_groups g
       join menu_items m on m.id = g.menu_item_id
       join dodo_sizes s on s.item = m.name and s.groupname = g.name
  where m.restaurant_id = r;

  delete from menu_categories c
  where c.restaurant_id = r
    and not exists (select 1 from menu_items m where m.category_id = c.id);
end $dodopizza$;

-- Anything of yours the list did not mention: check these by hand.
select c.name as section, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join menu_categories c on c.id = m.category_id
where r.name ilike '%dodo%'
  and not exists (
    select 1 from dodo_import i
    where upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(i.name, '[^a-zA-Z0-9]', '', 'g'))
  )
order by c.sort_order, m.sort_order;

-- The finished menu.
select c.name as section, m.sort_order, m.name, m.price_food, m.available
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join menu_categories c on c.id = m.category_id
where r.name ilike '%dodo%'
order by c.sort_order, m.sort_order;

drop table if exists dodo_import;
drop table if exists dodo_sizes;
