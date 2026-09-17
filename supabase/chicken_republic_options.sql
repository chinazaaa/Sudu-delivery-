-- Chicken Republic: the choices a meal leaves open.
--
-- Built from the export with the options column. 42 questions across
-- 19 products, 183 answers in all.
--
-- IT TOUCHES NOTHING BUT THE QUESTIONS. No product is added, renamed, priced
-- or switched on or off, and no photograph is gone near. The only rows it
-- writes are the questions listed here and their answers, and the only rows it
-- removes are the same questions from a previous run, so running it again
-- never doubles a drinks list. Anything you set up by hand under a different
-- name survives.
--
-- ONE ROW OF THE EXPORT WAS MALFORMED. Shawarma Combo ran its Side question
-- into its Size question, carrying the words Chowdeck uses to say how many may
-- be picked. It is split back into two, the second taking up to two answers.
--
-- 9 QUESTIONS ARE LEFT OUT, each having one answer that costs nothing.
-- A required question with a single free answer is a tap that tells nobody
-- anything. Where the single answer costs money it is kept, because that is a
-- surcharge and dropping it would lose it:
--   Citizens Spicy Yam Meal: Packaging, whose only answer is Take-away pack (1,000ml with lid)
--   Double ChickWhizz Meal: Size, whose only answer is Double ChickWhizz
--   Chief Burger Combo: Size (Burger), whose only answer is Single Chief Burger Combo
--   5Alive Pulpy (30cl): Flavour, whose only answer is 5Alive - Pulpy Orange (30cl)
--   Chief Burger: Size, whose only answer is Chief Burger
--   Express Combo: Packaging, whose only answer is Take-away pack (1,000ml with lid)
--   Spicy Yam Meal: Packaging, whose only answer is Take-away pack (1,000ml with lid)
--   MEGA Pot Lovers Meal: Side 2, whose only answer is Dodo Cubes (Regular)
--   MAXI POT Lovers Meal: Side 2, whose only answer is Dodo Cubes (Regular)
--
-- Safe to run twice.

drop table if exists cr_opt;
create table cr_opt (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  max_select    int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz', 'Size', 1, 1, 'Double ChickWhizz', 500, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz', 'Spice', 2, 1, 'No Spice ChickWhizz', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz', 'Spice', 2, 1, 'Spicy ChickWhizz', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Style', 1, 1, 'Spicy', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Style', 1, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Size', 2, 1, 'Yam Chips (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Size', 2, 1, 'Yam Chips (Large)', 700, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Sprite (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Mineral Water (75cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Coca Cola (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Fanta Orange (35cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Fanta Orange (50cl)', 350, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Sprite (50cl)', 350, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Coca Cola (50cl)', 350, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Predator - Gold', 500, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Monster Energy - Mango Loco', 1000, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Monster Energy - Ultra', 1000, 14);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Citizens Spicy Yam Meal', 'Drinks', 4, 1, 'Monster Energy - Regular', 1000, 15);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, '3 IN 1 Nescafe', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Mineral Water (75cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Sprite (35cl)', 100, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Coca Cola (35cl)', 100, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Fanta Orange (35cl)', 100, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Coca Cola (50cl)', 450, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Fanta Orange (50cl)', 450, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Sprite (50cl)', 450, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Predator - Gold', 500, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, '5Alive - Pulpy Orange (30cl)', 500, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Monster Energy - Ultra', 1000, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Monster Energy - Regular', 1000, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Drinks', 1, 1, 'Monster Energy - Mango Loco', 1000, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Pie', 2, 1, 'Chicken Pie', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Pastry Breakfast Combo', 'Pie', 2, 1, 'Meat Pie', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Size', 1, 1, 'Double Chief Burger Combo (Large)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Size', 1, 1, 'Double Chief Burger Combo (Jumbo)', 1000, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Sprite (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Coca Cola (35cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Fanta Orange (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Coca Cola (50cl)', 350, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Fanta Orange (50cl)', 350, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Sprite (50cl)', 350, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Predator - Gold', 500, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Drinks', 2, 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double Chief Burger Combo', 'Packaging', 3, 1, 'Take-away pack (1,000ml with lid)', 400, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Mineral Water (75cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Fanta Orange (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Sprite (35cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Sprite (50cl)', 350, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Coca Cola (50cl)', 350, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Fanta Orange (50cl)', 350, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Monster Energy - Mango Loco', 1000, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Predator - Gold', 1200, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, '5Alive - Pulpy Orange (30cl)', 1300, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Monster Energy - Ultra', 1800, 14);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Drinks', 1, 1, 'Monster Energy - Regular', 1800, 15);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Size (Chips)', 2, 1, 'Chips (Large)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Size (Chips)', 2, 1, 'Chips (Jumbo)', 1000, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Spice', 4, 1, 'No Spice', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double ChickWhizz Meal', 'Spice', 4, 1, 'Spicy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma', 'Side', 1, 1, 'No Sausage', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma', 'Side', 1, 1, '1 Sausage', 600, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Sprite (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Schweppes Chapman (40cl)', 200, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Schweppes Mojito (40cl)', 200, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Schweppes Pineapple (40cl)', 200, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Coca Cola (50cl)', 350, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Fanta Orange (50cl)', 350, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Sprite (50cl)', 350, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Predator - Gold', 500, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Drinks', 1, 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Size', 2, 1, 'Chips (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Size', 2, 1, 'Chips (Large)', 1200, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Size', 2, 1, 'Chips (Jumbo)', 2200, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Side', 102, 2, 'No Sausage', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Shawarma Combo', 'Side', 102, 2, '1 Sausage', 600, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Size (Chips)', 1, 1, 'Chips (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Size (Chips)', 1, 1, 'Chips (Large)', 1200, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Size (Chips)', 1, 1, 'Chips (Jumbo)', 2200, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Mineral Water (75cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Fanta Orange (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Sprite (35cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Schweppes Chapman (40cl)', 200, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Schweppes Mojito (40cl)', 200, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Schweppes Pineapple (40cl)', 200, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Sprite (50cl)', 350, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Coca Cola (50cl)', 350, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Fanta Orange (50cl)', 350, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Predator - Gold', 500, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chief Burger Combo', 'Drinks', 3, 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Size', 1, 1, 'Double ChickWhizz', 500, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, '3 IN 1 Nescafe', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, 'Coca Cola (35cl)', 100, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, 'Fanta Orange (35cl)', 100, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, 'Sprite (35cl)', 100, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, 'Coca Cola (50cl)', 450, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, 'Fanta Orange (50cl)', 450, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, 'Sprite (50cl)', 450, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Drinks', 2, 1, '5 Alive', 500, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Spice', 3, 1, 'No Spice', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Original ChickWhizz Breakfast Combo', 'Spice', 3, 1, 'Spicy ChickWhizz', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Schweppes (40cl)', 'Flavour', 1, 1, 'Schweppes Mojito (40cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Schweppes (40cl)', 'Flavour', 1, 1, 'Schweppes Pineapple (40cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Schweppes (40cl)', 'Flavour', 1, 1, 'Schweppes Chapman (40cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Monster Energy', 'Flavour', 1, 1, 'Monster Energy - Ultra', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Monster Energy', 'Flavour', 1, 1, 'Monster Energy - Regular', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Monster Energy', 'Flavour', 1, 1, 'Monster Energy - Mango Loco', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Size', 1, 1, 'Chips (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Size', 1, 1, 'Chips (Large)', 1200, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Size', 1, 1, 'Chips (Jumbo)', 2200, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Mineral Water (75cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Fanta Orange (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Sprite (35cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Schweppes Mojito (40cl)', 200, 5);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Schweppes Pineapple (40cl)', 200, 6);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Schweppes Chapman (40cl)', 200, 7);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Sprite (50cl)', 350, 8);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Coca Cola (50cl)', 350, 9);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Fanta Orange (50cl)', 350, 10);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Predator - Gold', 500, 11);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, '5Alive - Pulpy Orange (30cl)', 500, 12);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Monster Energy - Ultra', 1000, 13);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Monster Energy - Regular', 1000, 14);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Drinks', 3, 1, 'Monster Energy - Mango Loco', 1000, 15);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Style', 4, 1, 'Spicy', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Express Combo', 'Style', 4, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Spicy Yam Meal', 'Style', 1, 1, 'Spicy', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Spicy Yam Meal', 'Style', 1, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Spicy Yam Meal', 'Size', 2, 1, 'Spicy Yam (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Spicy Yam Meal', 'Size', 2, 1, 'Yam Chips (Large)', 700, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 1', 2, 1, 'Chips (Regular)', 800, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drinks', 3, 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drinks', 3, 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drinks', 3, 1, 'Sprite (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drinks', 3, 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Packaging', 4, 1, 'Take-away pack (1,000ml with lid)', 400, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Style', 5, 1, 'Spicy Fried', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Style', 5, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('POT Chicken (8 Pieces)', 'Style', 1, 1, 'Spicy', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('POT Chicken (8 Pieces)', 'Style', 1, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Soulfully Spiced Fried Chicken', 'Pieces', 1, 1, '1 piece', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Soulfully Spiced Fried Chicken', 'Pieces', 1, 1, '2 pieces', 2400, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Soulfully Spiced Fried Chicken', 'Pieces', 1, 1, '4 pieces', 7300, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Soulfully Spiced Fried Chicken', 'Style', 2, 1, 'Spicy Fried', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Soulfully Spiced Fried Chicken', 'Style', 2, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drinks', 2, 1, 'Coca Cola (35cl)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drinks', 2, 1, 'Fanta Orange (35cl)', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drinks', 2, 1, 'Sprite (35cl)', 0, 3);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drinks', 2, 1, 'Mineral Water (75cl)', 0, 4);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Packaging', 3, 1, 'Take-away pack (1,000ml with lid)', 400, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 1', 4, 1, 'Chips (Regular)', 800, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Style', 5, 1, 'Spicy Fried', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Style', 5, 1, 'Crunchy', 0, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Dodo Cubes', 'Size', 1, 1, 'Dodo Cubes (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Dodo Cubes', 'Size', 1, 1, 'Dodo Cubes (Jumbo)', 700, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chips', 'Size', 1, 1, 'Chips (Regular)', 0, 1);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chips', 'Size', 1, 1, 'Chips (Large)', 1200, 2);
insert into cr_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Chips', 'Size', 1, 1, 'Chips (Jumbo)', 2200, 3);

do $chickenrepublicoptions$
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
    raise exception 'No Chicken Republic found. Run chicken_republic_full.sql first.';
  end if;

  -- Only the questions this file is about to write, and only on this
  -- restaurant. Everything else is left where it is.
  delete from item_option_groups g
  using menu_items m, cr_opt k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and g.name = k.question;

  for spec in
    select distinct item, question, question_sort, max_select
    from cr_opt order by item, question_sort
  loop
    select m.id into item_id from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(spec.item, '[^a-zA-Z0-9]', '', 'g'))
    limit 1;

    if item_id is null then
      raise notice 'No product called %, so its questions were skipped.', spec.item;
      absent := absent + 1;
      continue;
    end if;

    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (item_id, spec.question, true, spec.max_select, spec.question_sort)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, k.answer, k.delta, k.answer_sort
    from cr_opt k
    where k.item = spec.item and k.question = spec.question;

    written := written + 1;
  end loop;

  raise notice 'Wrote % questions. % could not be placed.', written, absent;
end $chickenrepublicoptions$;

-- Every question a customer will now be asked.
select m.name as product, g.name as question, g.max_select as pick,
       count(o.id) as answers
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join item_option_groups g on g.menu_item_id = m.id
     join item_options o on o.group_id = g.id
where r.name ilike '%chicken republic%'
group by m.name, g.name, g.max_select, m.sort_order, g.sort_order
order by m.sort_order, g.sort_order;

drop table if exists cr_opt;
