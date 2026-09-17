-- Chicken Republic: the choices the descriptions name.
--
-- Where a description says what it offers, the question is now asked. Refuel
-- Meal says Fried Rice, Naija Jollof, Rice and Beans, White Rice with Sauce or
-- Spaghetti, so that is the list. The pies say Chicken or Beef. Anything that
-- says a PET drink or a drink of your choice gets the same fifteen drinks the
-- export uses on the other meals, at the same prices.
--
-- 4 PRODUCTS ARE LEFT WAITING. Their descriptions say a side of your
-- choice without saying which sides, and the export does not say either, so
-- there is nothing to build a list from without guessing:
--   Citizens Meal
--   Citizens Meal without drink
--   Citizens Meal BOGOF
--   Quarter Rotisserie Combo
-- Tell me what those sides are and they can be done.
--
-- Touches nothing but these questions. No product, price, photograph or stock
-- flag is gone near. Safe to run twice.

drop table if exists cr_more;
create table cr_more (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Chicken Pie', 'Filling', 1, 'Chicken', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Chicken Pie', 'Filling', 1, 'Beef', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Meat Pie', 'Filling', 1, 'Chicken', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Meat Pie', 'Filling', 1, 'Beef', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Meal', 'Portion', 1, 'Fried Rice', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Meal', 'Portion', 1, 'Naija Jollof', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Meal', 'Portion', 1, 'Rice & Beans', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Meal', 'Portion', 1, 'White Rice with Sauce', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Meal', 'Portion', 1, 'Spaghetti', 0, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Portion', 1, 'Fried Rice', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Portion', 1, 'Naija Jollof', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Portion', 1, 'Rice & Beans', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Portion', 1, 'White Rice with Sauce', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Portion', 1, 'Spaghetti', 0, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Side', 2, 'Coleslaw', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Side', 2, 'Moin Moin', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel Max Combo', 'Drink', 3, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Portion', 1, 'Spaghetti', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Portion', 1, 'Fried Rice', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Portion', 1, 'Naija Jollof', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Portion', 1, 'Rice & Beans', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Boyz Combo', 'Drink', 2, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Portion', 1, 'Fried Rice', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Portion', 1, 'Naija Jollof', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Bigwhizz Reloaded', 'Drink', 2, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Portion', 1, 'Fried Rice', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Portion', 1, 'Naija Jollof', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Big Whizz Meal', 'Drink', 2, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Side', 1, 'Moin Moin', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Side', 1, 'Coleslaw', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Spicy Yam Combo', 'Drink', 2, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Citizens Rice & Beans Combo', 'Drink', 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Carribean Meal Combo', 'Drink', 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Stir-Fried Meal Combo', 'Drink', 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Sprite (35cl)', 0, 3);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Coca Cola (50cl)', 350, 8);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Fanta Orange (50cl)', 350, 9);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Sprite (50cl)', 350, 10);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Predator - Gold', 500, 11);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_more (item, question, question_sort, answer, delta, answer_sort) values ('Refuel More', 'Drink', 1, 'Monster Energy - Mango Loco', 1000, 15);

do $chickenrepublicmore$
declare
  r uuid;
  spec record;
  item_id uuid;
  g uuid;
  written int := 0;
  absent int := 0;
begin
  select id into r from restaurants where name ilike '%chicken republic%' limit 1;
  if r is null then
    raise exception 'No Chicken Republic found.';
  end if;

  delete from item_option_groups g
  using menu_items m, cr_more k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and lower(g.name) = lower(k.question);

  for spec in
    select distinct item, question, question_sort from cr_more
    order by item, question_sort
  loop
    select m.id into item_id from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(spec.item, '[^a-zA-Z0-9]', '', 'g'))
    limit 1;

    if item_id is null then
      raise notice 'No product called %, skipped.', spec.item;
      absent := absent + 1;
      continue;
    end if;

    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (item_id, spec.question, true, 1, spec.question_sort)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, k.answer, k.delta, k.answer_sort
    from cr_more k where k.item = spec.item and k.question = spec.question;

    written := written + 1;
  end loop;

  raise notice 'Wrote % questions. % products not found.', written, absent;
end $chickenrepublicmore$;

-- Anything left whose description offers a choice and which still asks
-- nothing. These are the ones to send me.
select m.name, left(m.description, 70) as description
from menu_items m
     join restaurants r on r.id = m.restaurant_id
where r.name ilike '%chicken republic%'
  and m.description ~* '(your choice|of your|choice of|or a )'
  and not exists (select 1 from item_option_groups g where g.menu_item_id = m.id)
order by m.sort_order;

drop table if exists cr_more;
