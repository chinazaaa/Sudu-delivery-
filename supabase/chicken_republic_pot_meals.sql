-- Chicken Republic pot meals: every choice the meal actually offers.
--
-- These meals come with several portions, several sides and several drinks,
-- and the export asked for none of them properly. MEGA says six portions of
-- Spaghetti, Fried Rice, Naija Jollof or Rice and Beans, four of Dodo Cubes,
-- Moin Moin or Coleslaw, and six drinks. What it offered was one Side of
-- Chips, one Side of Dodo Cubes, and a single Drinks question.
--
-- Each is now its own question, taken from what the meal itself promises:
--   MINI Pot Lovers Meal: 2 portions, 1 sides, 2 drinks
--   MAXI POT Lovers Meal: 4 portions, 2 sides, 4 drinks
--   MEGA Pot Lovers Meal: 6 portions, 4 sides, 6 drinks
--   Big Crew Meal: 4 portions, 2 sides, 4 drinks
--
-- Chips stays. The export priced a chips portion at 800 on these meals, so it
-- sits in each portion question as a paid swap rather than vanishing with the
-- rest of their side list.
--
-- Everything else is included in the price and adds nothing.
--
-- Touches nothing but these questions. No product, price, photograph or stock
-- flag is gone near. Safe to run twice.

drop table if exists pot_opt;
create table pot_opt (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 1', 11, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 1', 11, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 1', 11, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 1', 11, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 1', 11, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 2', 12, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 2', 12, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 2', 12, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 2', 12, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Portion 2', 12, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Side 1', 31, 'Moin Moin', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Side 1', 31, 'Coleslaw', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 51, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 51, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 51, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 1', 51, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 52, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 52, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 52, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MINI Pot Lovers Meal', 'Drink 2', 52, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 1', 11, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 1', 11, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 1', 11, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 1', 11, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 1', 11, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 2', 12, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 2', 12, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 2', 12, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 2', 12, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 2', 12, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 3', 13, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 3', 13, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 3', 13, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 3', 13, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 3', 13, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 4', 14, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 4', 14, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 4', 14, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 4', 14, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Portion 4', 14, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 1', 31, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 1', 31, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 1', 31, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 2', 32, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 2', 32, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Side 2', 32, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 51, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 51, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 51, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 1', 51, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 52, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 52, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 52, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 2', 52, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 53, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 53, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 53, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 3', 53, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 54, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 54, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 54, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MAXI POT Lovers Meal', 'Drink 4', 54, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 1', 11, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 1', 11, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 1', 11, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 1', 11, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 1', 11, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 2', 12, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 2', 12, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 2', 12, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 2', 12, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 2', 12, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 3', 13, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 3', 13, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 3', 13, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 3', 13, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 3', 13, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 4', 14, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 4', 14, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 4', 14, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 4', 14, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 4', 14, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 5', 15, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 5', 15, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 5', 15, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 5', 15, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 5', 15, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 6', 16, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 6', 16, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 6', 16, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 6', 16, 'Rice & Beans', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Portion 6', 16, 'Chips (Regular)', 800, 5);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 1', 31, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 1', 31, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 1', 31, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 2', 32, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 2', 32, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 2', 32, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 3', 33, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 3', 33, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 3', 33, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 4', 34, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 4', 34, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Side 4', 34, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 51, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 51, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 51, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 1', 51, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 52, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 52, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 52, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 2', 52, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 53, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 53, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 53, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 3', 53, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 54, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 54, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 54, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 4', 54, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 55, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 55, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 55, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 5', 55, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 56, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 56, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 56, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('MEGA Pot Lovers Meal', 'Drink 6', 56, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 1', 11, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 1', 11, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 1', 11, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 1', 11, 'Chips (Regular)', 800, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 2', 12, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 2', 12, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 2', 12, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 2', 12, 'Chips (Regular)', 800, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 3', 13, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 3', 13, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 3', 13, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 3', 13, 'Chips (Regular)', 800, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 4', 14, 'Spaghetti', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 4', 14, 'Fried Rice', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 4', 14, 'Naija Jollof', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Portion 4', 14, 'Chips (Regular)', 800, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Side 1', 31, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Side 1', 31, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Side 1', 31, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Side 2', 32, 'Dodo Cubes', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Side 2', 32, 'Moin Moin', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Side 2', 32, 'Coleslaw', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 51, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 51, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 51, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 1', 51, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 52, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 52, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 52, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 2', 52, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 53, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 53, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 53, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 3', 53, 'Mineral Water (75cl)', 0, 4);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 54, 'Coca Cola (35cl)', 0, 1);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 54, 'Fanta Orange (35cl)', 0, 2);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 54, 'Sprite (35cl)', 0, 3);
insert into pot_opt (item, question, question_sort, answer, delta, answer_sort) values ('Big Crew Meal', 'Drink 4', 54, 'Mineral Water (75cl)', 0, 4);

do $potmeals$
declare
  r uuid;
  spec record;
  item_id uuid;
  g uuid;
  written int := 0;
begin
  select id into r from restaurants where name ilike '%chicken republic%' limit 1;
  if r is null then
    raise exception 'No Chicken Republic found.';
  end if;

  -- What these meals carried before: the single Drinks question, the two
  -- Sides from the export, and anything this file wrote last time.
  delete from item_option_groups g
  using menu_items m, (select distinct item from pot_opt) k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and (g.name = 'Drinks' or g.name like 'Drink %'
         or g.name like 'Side %' or g.name like 'Portion %');

  for spec in
    select distinct item, question, question_sort from pot_opt
    order by item, question_sort
  loop
    select m.id into item_id from menu_items m
    where m.restaurant_id = r
      and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
        = upper(regexp_replace(spec.item, '[^a-zA-Z0-9]', '', 'g'))
    limit 1;

    if item_id is null then
      raise notice 'No product called %, skipped.', spec.item;
      continue;
    end if;

    insert into item_option_groups (menu_item_id, name, required, max_select, sort_order)
    values (item_id, spec.question, true, 1, spec.question_sort)
    returning id into g;

    insert into item_options (group_id, name, price_delta, sort_order)
    select g, k.answer, k.delta, k.answer_sort
    from pot_opt k
    where k.item = spec.item and k.question = spec.question;

    written := written + 1;
  end loop;

  raise notice 'Wrote % questions across the pot meals.', written;
end $potmeals$;

select m.name as product,
       count(*) filter (where g.name like 'Portion %') as portions,
       count(*) filter (where g.name like 'Side %')    as sides,
       count(*) filter (where g.name like 'Drink %')   as drinks
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     left join item_option_groups g on g.menu_item_id = m.id
where r.name ilike '%chicken republic%'
  and (m.name ilike '%pot lovers%' or m.name ilike '%big crew%')
group by m.name
order by m.name;

drop table if exists pot_opt;
