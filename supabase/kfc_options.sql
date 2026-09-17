-- KFC: the choices a meal leaves open.
--
-- Built from the export with the options column. 54 questions across
-- 15 products, 139 answers in all.
--
-- IT TOUCHES NOTHING BUT THE QUESTIONS. Nothing is added, renamed, priced,
-- photographed or switched on. Anything out of stock on the site stays out of
-- stock: this file never writes to a product row at all. The only rows it
-- removes are the same questions from an earlier run.
--
-- KFC writes its questions in till shorthand, so COB is Chicken, BEVERAGE2 is
-- Drink 2, RICE1 is Rice 1, and the answers come down from capitals: KFC
-- SPICY RICE - LRG reads as KFC spicy rice, large. Two drinks stay two
-- questions, so somebody can take a Pepsi and a water. The dips are one
-- question taking four answers.
--
-- 6 QUESTIONS ARE LEFT OUT, each with a single answer that costs nothing,
-- which is a tap that tells nobody anything:
--   Streetwise chowdeck: Wings, whose only answer is KFC hot wings 2 PCS
--   Streetwise chowdeck: Rice, whose only answer is KFC spicy rice
--   Streetwise 2: Drink 1, whose only answer is Water 50cl
--   Streetwise 1: Drink, whose only answer is Water 50cl
--   5 in 1 meal box: Drink 1, whose only answer is Water 50cl
--   Double zinger burger meal: Burger, whose only answer is Double zinger burger
--
-- Safe to run twice.

drop table if exists kfc_opt;
create table kfc_opt (
  item          text not null,
  question      text not null,
  question_sort int  not null,
  max_select    int  not null,
  answer        text not null,
  delta         int  not null,
  answer_sort   int  not null
);

insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise chowdeck', 'Pack', 3, 1, 'Streetwise pack', 300, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 2', 'Chicken', 2, 1, 'COB-OR 2 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 2', 'Chicken', 2, 1, 'COB-HC 2 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 2', 'Chicken', 2, 1, 'COB-HC suya 2pcs', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 2', 'Side', 3, 1, 'KFC spicy rice, large', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 2', 'Side', 3, 1, 'Yam fries, regular', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 2', 'Side', 3, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Burger', 1, 1, 'Zinger burger', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Burger', 1, 1, 'Zinger pepe burger', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Burger', 1, 1, 'Zinger suya burger', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Drink 1', 2, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Drink 1', 2, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Side', 3, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Side', 3, 1, 'Yam fries, large', 200, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger burger meal(d)', 'Side', 3, 1, 'Yam fries, extra large', 800, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Chicken', 1, 1, 'COB-HC 12 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Chicken', 1, 1, 'COB-HC suya 12pcs', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Drink 2', 2, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Drink 2', 2, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Drink 1', 3, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Drink 1', 3, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('12 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Chicken', 1, 1, 'COB-HC 21 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Chicken', 1, 1, 'COB-HC suya 21pcs', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Drink 1', 2, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Drink 1', 2, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Drink 2', 3, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Drink 2', 3, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('21 pcs kfc bucket (d)', 'Dip sauces, pick four', 4, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Chicken', 1, 1, 'COB-HC 1 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Chicken', 1, 1, 'COB-HC suya 1 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Burger', 2, 1, 'Zinger burger', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Burger', 2, 1, 'Zinger pepe burger', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Burger', 2, 1, 'Zinger suya burger', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Burger', 2, 1, 'Double zinger burger', 3100, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Side', 3, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Side', 3, 1, 'Yam fries, large', 200, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Side', 3, 1, 'Yam fries, extra large', 800, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Drink 1', 4, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Zinger box meal (d)', 'Drink 1', 4, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 1', 'Chicken', 2, 1, 'COB-HC 1 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 1', 'Chicken', 2, 1, 'COB-HC suya 1 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 1', 'Side', 3, 1, 'KFC spicy rice, large', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 1', 'Side', 3, 1, 'Yam fries, regular', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Streetwise 1', 'Side', 3, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Chicken', 2, 1, 'COB-OR 1 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Chicken', 2, 1, 'COB-HC 1 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Burger', 3, 1, 'Zinger burger', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Burger', 3, 1, 'Zinger suya burger', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Burger', 3, 1, 'Double zinger burger', 3100, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Side', 4, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Side', 4, 1, 'Yam fries, large', 200, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Side', 4, 1, 'Yam fries, extra large', 800, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Side', 5, 1, 'KFC hot wings 2 PCS', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('5 in 1 meal box', 'Side', 5, 1, 'Crspy chkn strip 2 pc', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double zinger burger meal', 'Drink 1', 1, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double zinger burger meal', 'Drink 1', 1, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double zinger burger meal', 'Side', 3, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double zinger burger meal', 'Side', 3, 1, 'Yam fries, large', 200, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Double zinger burger meal', 'Side', 3, 1, 'Yam fries, extra large', 800, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Chicken', 1, 1, 'COB-HC suya 3pcs', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Chicken', 1, 1, 'COB-HC 3 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Chicken 2', 2, 1, 'COB-HC suya 3pcs', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Chicken 2', 2, 1, 'COB-HC 3 pieces', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Rice 1', 3, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Rice 1', 3, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Rice 2', 4, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Rice 2', 4, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Fries 2', 5, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Fries 2', 5, 1, 'Yam fries, extra large', 200, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Drink 1', 6, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Drink 1', 6, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Drink 2', 7, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Drink 2', 7, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Fries 1', 8, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Fries 1', 8, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Fries 1', 8, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Dip sauces, pick four', 9, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Dip sauces, pick four', 9, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Dip sauces, pick four', 9, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 1', 'Dip sauces, pick four', 9, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Chicken', 1, 1, 'COB-HC 12 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Chicken', 1, 1, 'COB-HC suya 12pcs', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Fries 1', 2, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Fries 1', 2, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Fries 1', 2, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Rice 2', 3, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Rice 2', 3, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Rice 1', 4, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Rice 1', 4, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Drink 1', 5, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Drink 1', 5, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Drink 2', 6, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Drink 2', 6, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Fries 2', 7, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Fries 2', 7, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Fries 2', 7, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Dip sauces, pick four', 8, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Dip sauces, pick four', 8, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Dip sauces, pick four', 8, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 3', 'Dip sauces, pick four', 8, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 1', 1, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 1', 1, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Chicken', 2, 1, 'COB-HC 8 pieces', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Chicken', 2, 1, 'COB-HC suya 8pcs', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 1', 3, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 1', 3, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 2', 4, 1, 'Pepsi 500ml', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Drink 2', 4, 1, 'Water 50cl', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 2', 5, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 2', 5, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 2', 5, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 2', 6, 1, 'KFC spicy rice', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Rice 2', 6, 1, 'KFC spicy rice, large', 700, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 1', 7, 1, 'Yam fries, regular', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 1', 7, 1, 'Yam fries, large', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Fries 1', 7, 1, 'Yam fries, extra large', 200, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Family meal 2', 'Dip sauces, pick four', 8, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 12 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 12 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 12 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 12 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 21 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 21 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 21 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 21 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Mayonnaise', 0, 4);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 8 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Pepe sauce', 0, 1);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 8 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'BBQ sauce', 0, 2);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 8 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Suyannaise', 0, 3);
insert into kfc_opt (item, question, question_sort, max_select, answer, delta, answer_sort) values ('Bogo 8 pc bucket chicken', 'Dip sauces, pick four', 1, 4, 'Mayonnaise', 0, 4);

do $kfcoptions$
declare
  r uuid;
  spec record;
  item_id uuid;
  g uuid;
  written int := 0;
  absent int := 0;
begin
  select id into r from restaurants where name ilike '%kfc%' limit 1;
  if r is null then
    raise exception 'No KFC found. Run kfc_full.sql first.';
  end if;

  delete from item_option_groups g
  using menu_items m, kfc_opt k
  where g.menu_item_id = m.id
    and m.restaurant_id = r
    and upper(regexp_replace(m.name, '[^a-zA-Z0-9]', '', 'g'))
      = upper(regexp_replace(k.item, '[^a-zA-Z0-9]', '', 'g'))
    and g.name = k.question;

  for spec in
    select distinct item, question, question_sort, max_select
    from kfc_opt order by item, question_sort
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
    from kfc_opt k where k.item = spec.item and k.question = spec.question;

    written := written + 1;
  end loop;

  raise notice 'Wrote % questions. % products not found.', written, absent;
end $kfcoptions$;

select m.name as product, g.name as question, g.max_select as pick,
       count(o.id) as answers
from menu_items m
     join restaurants r on r.id = m.restaurant_id
     join item_option_groups g on g.menu_item_id = m.id
     join item_options o on o.group_id = g.id
where r.name ilike '%kfc%'
group by m.name, g.name, g.max_select, m.sort_order, g.sort_order
order by m.sort_order, g.sort_order;

drop table if exists kfc_opt;
