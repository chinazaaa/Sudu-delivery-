-- The collections, and the products they are packed out of.
--
-- Run once against the live shop on 26 September 2026. Kept here so what is
-- on the site can be read in the repository, and so a fresh database can be
-- given the same shelves.
--
-- Prices are a starting point, not gospel: everything on our own shelf
-- carries a source saying where to go and that it wants confirming. The
-- boxes price themselves off these, so correcting a price in admin corrects
-- every box holding it.
with shelf as (select id from restaurants where kind = 'own' limit 1)
insert into menu_categories (id, restaurant_id, name, sort_order)
select v.id::uuid, shelf.id, v.name, v.sort from shelf, (values
  ('b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Pantry',10),
  ('8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Toiletries and household',20),
  ('7c21332d-76d4-4644-931e-b7b0ec02582f','For the room',30),
  ('173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Gifting',40)
) v(id,name,sort) on conflict (id) do nothing;
with shelf as (select id from restaurants where kind = 'own' limit 1)
insert into menu_items (id, restaurant_id, category_id, name, price_food, description, source, available, sort_order)
select v.id::uuid, shelf.id, v.cat::uuid, v.name, v.price, '', v.src, true, v.sort from shelf, (values
  ('480c08fa-c3e9-41af-913b-a56c8a613d82','b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Oats, 500g',4500,'Market Square or Local Market · estimate, confirm',10),
  ('eacbd0e6-ce85-407a-aa27-19b1ea0d2288','b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Milo refill, 400g',5500,'Market Square · estimate, confirm',20),
  ('9006354d-e94e-4a13-89ba-1949609da7e2','b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Powdered milk refill, 380g',5000,'Market Square · estimate, confirm',30),
  ('7d85bb14-89d2-4171-8793-b2805340411c','b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Cornflakes, 350g',4500,'Market Square · estimate, confirm',40),
  ('83b2a8d0-d14e-4dbe-926c-4af0d7490f81','b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Tea bags, 50',3500,'Market Square · estimate, confirm',50),
  ('c8f5b076-4c8a-400a-8bd6-7f7484454cee','b2e66e23-5bf5-4da8-ba63-d11e53556ce0','Rice, 5kg bag',7500,'Local Market · estimate, confirm (50kg was ₦50-58k)',60),
  ('b5b607e3-9aaa-4ab7-869c-46eb8eb5d98c','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Toilet roll, 4 pack',2500,'Market Square · estimate, confirm',10),
  ('1ebc630f-6a3f-4f57-a396-03d3ef7594b8','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Toilet roll, single',700,'Market Square · estimate, confirm',20),
  ('4a3a6b90-990a-4682-beff-b3281fa06728','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Sanitary pads, pack',2500,'Market Square or a pharmacy · estimate, confirm',30),
  ('b9b8ed6f-ac89-43c6-bac6-2be1c7df495b','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Bar soap',1200,'Market Square · estimate, confirm',40),
  ('ffce871f-1ec6-441d-a291-5d353fa3ceea','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Shower gel, 500ml',4500,'Market Square · estimate, confirm',50),
  ('304db6b6-8cd7-4851-851b-5b2f04466301','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Bath sponge',800,'Market Square · estimate, confirm',60),
  ('866a06cb-d2ab-4ec6-904d-cad2369ee568','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Toothpaste, 140g',2500,'Market Square · estimate, confirm',70),
  ('64f59e85-9be7-4227-b436-0546411ca384','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Toothbrush',1200,'Market Square · estimate, confirm',80),
  ('d79422e6-1947-4e20-b4fb-b7efc3d4c590','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Detergent, 1kg',4000,'Market Square · estimate, confirm',90),
  ('d68acf24-59b9-4f72-898a-f6df93744cd0','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Dishwashing sponge',500,'Local Market · estimate, confirm',100),
  ('d76fd20c-dace-4a76-b85c-6e02ce369fa5','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Bin bags, roll of 20',2000,'Market Square · estimate, confirm',110),
  ('7b0de566-2477-4a4a-94f6-2d05e330dc7a','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Insecticide spray',5000,'Market Square · estimate, confirm',120),
  ('77f861c0-fb25-4b1b-86df-d32210ee50ce','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Hand sanitiser',2000,'A pharmacy · estimate, confirm',130),
  ('b8d30340-89ea-4afd-a954-7d18d3127d37','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Paracetamol, pack',800,'A pharmacy · estimate, confirm',140),
  ('5ca618e9-491e-4468-957c-2e4a2c27d80b','8f4f0a31-d002-4c3d-913e-37de1b23dc0e','Plasters, pack',1500,'A pharmacy · estimate, confirm',150),
  ('a3d08f5f-8671-4eb2-b31d-f2d4b7d15006','7c21332d-76d4-4644-931e-b7b0ec02582f','Bucket, 25 litre',4500,'Sangotedo market · estimate, confirm',10),
  ('a0576c7e-a465-4ae5-836b-f8f4e00cfb38','7c21332d-76d4-4644-931e-b7b0ec02582f','Washing bowl',2500,'Sangotedo market · estimate, confirm',20),
  ('ed694054-9a9e-44e5-a911-9029c3926016','7c21332d-76d4-4644-931e-b7b0ec02582f','Bedsheet and pillowcase, single',12000,'Sangotedo market · estimate, confirm',30),
  ('e2c930fd-1d1d-4d0f-9aa1-4eb3c7b777bb','7c21332d-76d4-4644-931e-b7b0ec02582f','Mattress protector',8000,'Sangotedo market · estimate, confirm',40),
  ('87d0ce83-aae9-41e8-94a0-4aeb48ea5933','7c21332d-76d4-4644-931e-b7b0ec02582f','Towel',5000,'Sangotedo market · estimate, confirm',50),
  ('563ea499-c63b-4cec-94ad-5d0d57b8aea0','7c21332d-76d4-4644-931e-b7b0ec02582f','Hangers, 6',2500,'Sangotedo market · estimate, confirm',60),
  ('b0722a52-96b4-4240-8a6b-582ec197e8db','7c21332d-76d4-4644-931e-b7b0ec02582f','Cooking pot, medium',9000,'Sangotedo market · estimate, confirm',70),
  ('44bc520d-208d-4ceb-ac9c-c142045e9719','7c21332d-76d4-4644-931e-b7b0ec02582f','Frying pan',7500,'Sangotedo market · estimate, confirm',80),
  ('aa581a4e-6696-4268-aac3-f93847b1d57f','7c21332d-76d4-4644-931e-b7b0ec02582f','Plates, set of 4',6000,'Sangotedo market · estimate, confirm',90),
  ('e744faf3-be16-4e54-8b61-acd779a43a67','7c21332d-76d4-4644-931e-b7b0ec02582f','Cutlery, set of 4',3500,'Sangotedo market · estimate, confirm',100),
  ('b034f015-8e30-41ef-802e-2bbb10837ff9','7c21332d-76d4-4644-931e-b7b0ec02582f','Electric kettle',14000,'Novare Mall or Sangotedo market · estimate, confirm',110),
  ('451e0395-4cbf-4975-84f4-e83b996302d1','7c21332d-76d4-4644-931e-b7b0ec02582f','Flask, 1 litre',9000,'Sangotedo market · estimate, confirm',120),
  ('6f5ea83d-f371-40e1-965c-a4df98b1e638','7c21332d-76d4-4644-931e-b7b0ec02582f','Extension socket, 4 way',7000,'Novare Mall · estimate, confirm',130),
  ('5114610d-6411-4108-9708-66c0500a3d95','7c21332d-76d4-4644-931e-b7b0ec02582f','LED bulb',2000,'Sangotedo market · estimate, confirm',140),
  ('4015e74c-76cd-482f-a8a3-d96ecbe05f4c','7c21332d-76d4-4644-931e-b7b0ec02582f','Padlock',3000,'Sangotedo market · estimate, confirm',150),
  ('34333933-62b2-41a5-9cf5-8a3bc728b1a5','7c21332d-76d4-4644-931e-b7b0ec02582f','Broom and dustpan',3000,'Sangotedo market · estimate, confirm',160),
  ('6a473438-406a-47f7-8a88-c8fdb150a9c1','7c21332d-76d4-4644-931e-b7b0ec02582f','Mop',6000,'Sangotedo market · estimate, confirm',170),
  ('f694b89e-bca6-4ff9-8d33-5c62727643b2','7c21332d-76d4-4644-931e-b7b0ec02582f','Student mattress, 3x6',43000,'Vitafoam or Winco, Sangotedo · found ₦43,600-56,200 for 3x6',180),
  ('8d406241-de82-42db-85d8-a0595f61afe4','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Birthday cake, 6 inch',15000,'A bakery in Sangotedo or Ajah · estimate, confirm. Market Square also bakes',10),
  ('211f36e7-83cc-468a-a699-77394892041b','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Birthday cake, 8 inch',25000,'A bakery in Sangotedo or Ajah · estimate, confirm',20),
  ('225c610f-6514-4f50-9caa-1eeba982e1fb','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Cupcakes, 6',6000,'Market Square sells a 6 pack at ₦1,950 · estimate for iced ones, confirm',30),
  ('f6be6e51-d9a9-4ee7-9f19-38df1046f1a3','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Bouquet of roses',25000,'A florist in Lekki or Ajah · estimate, confirm',40),
  ('40f2a7b5-f385-4116-ad38-20b3aedae905','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Single rose',4000,'A florist in Lekki or Ajah · estimate, confirm',50),
  ('e1b73749-95ce-4a38-ba68-ad431d70f64b','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Greeting card',2500,'Novare Mall · estimate, confirm',60),
  ('36ba800a-4acd-4f28-995e-a9dbae607131','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Box of assorted chocolate',12000,'Novare Mall · estimate, confirm',70),
  ('153ceb25-2bb2-43a9-bca2-c3404c068962','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Pringles',3500,'Market Square · estimate, confirm',80),
  ('14dc0850-dc74-4452-ad1b-c50f6673e26e','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Tray of sweets',5000,'Market Square · estimate, confirm',90),
  ('bac88127-fb38-41dd-8c85-688f346b73d0','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Scented candle',7000,'Novare Mall or a Lekki gift shop · estimate, confirm',100),
  ('b68f4be2-ccf3-433a-8d6f-36ef11a6b614','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Balloons, set',5000,'Sangotedo market · estimate, confirm',110),
  ('1a256940-9671-49b1-a103-cf89d51c1aa3','173fdcb9-a9c3-44bd-b8e4-6a341d7b89e4','Teddy bear, medium',12000,'Novare Mall · estimate, confirm',120)
) v(id,cat,name,price,src,sort) on conflict (id) do nothing;
insert into occasions (id, slug, name, blurb, kind, active, sort_order, when_word)
values
  ('28a8bb77-1efc-4c35-affe-2069e42a205e','care-packages','Care packages','Food from home, packed here and carried to their block. One price, delivery in it.','collection',true,10,'it starts'),
  ('2bdf00d8-ca23-41cd-9d53-700ea89691d1','monthly-foodstuff','Monthly foodstuff','A carton of noodles, soup for the month, and everything that goes in the pot. Straight off the Local Market run.','collection',true,20,'it starts'),
  ('68e51c13-884a-463e-a98c-59d194d7b71a','hostel-packs','Hostel packs','Everything a room needs, in one delivery, on the day they move in.','collection',true,30,'it starts'),
  ('e727d304-90da-4e88-ab69-a455b3aa958a','restocks','Restocks','The month''s basics, again, without the market trip.','collection',true,40,'it starts'),
  ('5a84c11e-0115-436e-9249-d48274feb41b','keeping-clean','Keeping clean','Toilet roll, soap, pads, detergent. The things you only notice the day they run out.','collection',true,50,'it starts'),
  ('da462b7e-612e-4956-9d71-848711d59053','study-and-exam','Study and exam','Enough to get through a night in the library without leaving it.','collection',true,60,'it starts'),
  ('c7b8b305-9e4a-4f75-80bf-e8821fb53edc','gifts','Gifts','A cake, flowers, something to open. To their block, on the day.','collection',true,70,'it starts')
on conflict (id) do nothing;
insert into boxes (id, occasion_id, name, blurb, serves, run_fee, car_fee, lines, is_extra, active, sort_order)
select b.id::uuid, b.occ::uuid, b.name, b.blurb, b.serves, 4000, 6500,
 (select jsonb_agg(jsonb_build_object('id','l'||t.i,'menu_item_id',t.x,'option_ids',jsonb_build_array(),'qty',t.q,'swaps',jsonb_build_array()) order by t.i)
  from unnest(b.items, b.qtys) with ordinality as t(x,q,i)),
 false, true, 100
from (values
  ('8d1b45ee-f11b-4fa4-87a1-1891476d5914','28a8bb77-1efc-4c35-affe-2069e42a205e','Starter','Two weeks of quick food, for somebody who is only just running out.','One person, a fortnight',array['d59e46ff-7bcc-45df-be1f-aa5b9baa514b','c67b5db1-4d14-4edb-b9ad-73f3de5d783c','eacbd0e6-ce85-407a-aa27-19b1ea0d2288','7f020ef6-1318-40a6-9454-dccd35aa5ace','01608b60-e0ac-490d-a512-c80475afc0b7','dc2a8334-a753-4ad0-8e49-1f31335c2f8f','51ac664d-97e1-406d-8370-1e362f99754d'],array[10,1,1,1,2,4,1]),
  ('ff0bcf89-9757-446c-9182-0128fafd5fae','28a8bb77-1efc-4c35-affe-2069e42a205e','Month of basics','The one most people send. Rice, noodles, milk, Milo, oats and tomatoes.','One person, a month',array['c8f5b076-4c8a-400a-8bd6-7f7484454cee','d59e46ff-7bcc-45df-be1f-aa5b9baa514b','480c08fa-c3e9-41af-913b-a56c8a613d82','eacbd0e6-ce85-407a-aa27-19b1ea0d2288','9006354d-e94e-4a13-89ba-1949609da7e2','b67172c7-c399-428a-874e-490bbfa83582','7f020ef6-1318-40a6-9454-dccd35aa5ace','01608b60-e0ac-490d-a512-c80475afc0b7'],array[1,22,1,1,1,4,1,2]),
  ('a2b5b354-baac-45d6-9415-fc535b7eabf7','28a8bb77-1efc-4c35-affe-2069e42a205e','Full month','Everything in the month box, and the cooking round it: oil, seasoning, eggs, pasta, garri, water.','One person, a full month',array['c8f5b076-4c8a-400a-8bd6-7f7484454cee','d59e46ff-7bcc-45df-be1f-aa5b9baa514b','bbc6e587-f52f-433b-ad85-a67ec6de21ca','c67b5db1-4d14-4edb-b9ad-73f3de5d783c','eacbd0e6-ce85-407a-aa27-19b1ea0d2288','480c08fa-c3e9-41af-913b-a56c8a613d82','9006354d-e94e-4a13-89ba-1949609da7e2','7f020ef6-1318-40a6-9454-dccd35aa5ace','01608b60-e0ac-490d-a512-c80475afc0b7','b67172c7-c399-428a-874e-490bbfa83582','0b3ed7d7-26a1-456c-81d7-37e7114a5be0','718d2162-782c-4611-ad12-7113dfd3992b','ee7f1f05-908c-4498-97a3-736e50e3512d','e79a3cf5-3911-4bd5-9bb4-42e054de17a6','95e0caaf-0a23-4325-b192-9a6f4924d82f','88e592c9-2890-4ee9-9642-3574b894dc43','277910c2-9584-4e78-abc1-07a87315ecd6'],array[1,20,2,1,1,1,1,1,3,4,1,1,1,1,1,1,1]),
  ('a01cb1ec-374e-4ed2-9fc7-efdef2ee5c47','28a8bb77-1efc-4c35-affe-2069e42a205e','The works','Food, and everything that runs out beside it: soap, toilet roll, detergent, pads.','One person, a full month',array['c8f5b076-4c8a-400a-8bd6-7f7484454cee','d59e46ff-7bcc-45df-be1f-aa5b9baa514b','bbc6e587-f52f-433b-ad85-a67ec6de21ca','c67b5db1-4d14-4edb-b9ad-73f3de5d783c','eacbd0e6-ce85-407a-aa27-19b1ea0d2288','480c08fa-c3e9-41af-913b-a56c8a613d82','9006354d-e94e-4a13-89ba-1949609da7e2','7f020ef6-1318-40a6-9454-dccd35aa5ace','01608b60-e0ac-490d-a512-c80475afc0b7','b67172c7-c399-428a-874e-490bbfa83582','0b3ed7d7-26a1-456c-81d7-37e7114a5be0','718d2162-782c-4611-ad12-7113dfd3992b','95e0caaf-0a23-4325-b192-9a6f4924d82f','88e592c9-2890-4ee9-9642-3574b894dc43','277910c2-9584-4e78-abc1-07a87315ecd6','b5b607e3-9aaa-4ab7-869c-46eb8eb5d98c','b9b8ed6f-ac89-43c6-bac6-2be1c7df495b','ffce871f-1ec6-441d-a291-5d353fa3ceea','866a06cb-d2ab-4ec6-904d-cad2369ee568','d79422e6-1947-4e20-b4fb-b7efc3d4c590','4a3a6b90-990a-4682-beff-b3281fa06728','77f861c0-fb25-4b1b-86df-d32210ee50ce'],array[1,20,2,1,1,1,1,1,3,4,1,1,1,1,1,1,2,1,1,1,1,1]),
  ('0260e614-cf84-462b-b473-9faff0ddc115','2bdf00d8-ca23-41cd-9d53-700ea89691d1','Soup for the month','Egusi and ogbono, the meat, the fish, the crayfish and the palm oil. Enough for a pot that lasts.','A room, a month',array['2d1b18d3-b71a-4568-afb1-e1b0868ee25c','5a1d0fb1-8b77-44c6-a7c6-fe01aa142333','d5ed67ae-e580-4f33-80b3-e1d930b4cc90','2740f8b2-43ef-4222-acac-fc9538f41767','b91c551c-8b31-4520-abab-aee575a907a1','e6497dcc-41be-435e-ae4e-843e2d8b557d','9513af71-f8f5-4de4-883a-1f272e9052b3','718d2162-782c-4611-ad12-7113dfd3992b','5840d121-1a86-429c-aac6-ccb418095e6d','d12dd36b-9a46-4cd0-aa27-400d05b335b8'],array[3,1,1,1,1,1,1,1,1,1]),
  ('1a7f14c7-427c-4de5-bf0b-a6ad56cd77c4','2bdf00d8-ca23-41cd-9d53-700ea89691d1','The pot and the carton','A full carton of Indomie, rice, semovita, garri and the seasoning to cook any of it.','A room, a month',array['afc10953-8792-49c6-be3e-f9a511256747','c8f5b076-4c8a-400a-8bd6-7f7484454cee','8f564adb-35fc-4e7e-a0ad-8b1ad9feea50','88e592c9-2890-4ee9-9642-3574b894dc43','b67172c7-c399-428a-874e-490bbfa83582','0b3ed7d7-26a1-456c-81d7-37e7114a5be0','718d2162-782c-4611-ad12-7113dfd3992b','ee7f1f05-908c-4498-97a3-736e50e3512d','e79a3cf5-3911-4bd5-9bb4-42e054de17a6','d12dd36b-9a46-4cd0-aa27-400d05b335b8'],array[1,1,1,1,4,1,1,1,1,1]),
  ('053a21b0-5945-406c-9a85-f3f098bd19bd','2bdf00d8-ca23-41cd-9d53-700ea89691d1','Everything for the month','Both of the above, and beans, yam and eggs on top. The whole market trip, delivered.','A room, a full month',array['afc10953-8792-49c6-be3e-f9a511256747','c8f5b076-4c8a-400a-8bd6-7f7484454cee','8f564adb-35fc-4e7e-a0ad-8b1ad9feea50','88e592c9-2890-4ee9-9642-3574b894dc43','2d1b18d3-b71a-4568-afb1-e1b0868ee25c','5a1d0fb1-8b77-44c6-a7c6-fe01aa142333','d5ed67ae-e580-4f33-80b3-e1d930b4cc90','2740f8b2-43ef-4222-acac-fc9538f41767','b91c551c-8b31-4520-abab-aee575a907a1','e6497dcc-41be-435e-ae4e-843e2d8b557d','9513af71-f8f5-4de4-883a-1f272e9052b3','0b3ed7d7-26a1-456c-81d7-37e7114a5be0','b67172c7-c399-428a-874e-490bbfa83582','718d2162-782c-4611-ad12-7113dfd3992b','ee7f1f05-908c-4498-97a3-736e50e3512d','e79a3cf5-3911-4bd5-9bb4-42e054de17a6','d12dd36b-9a46-4cd0-aa27-400d05b335b8','5840d121-1a86-429c-aac6-ccb418095e6d','5159d15b-1a6e-4369-bae4-5a1eb6f92461','748b9679-b0e0-46c7-bf3a-b8d60d958a32','95e0caaf-0a23-4325-b192-9a6f4924d82f'],array[1,1,1,1,3,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1]),
  ('56dc4eef-657e-40e6-a777-b9cd572e6ec2','68e51c13-884a-463e-a98c-59d194d7b71a','Room basics','What a room needs on day one, short of bedding.','One room',array['a3d08f5f-8671-4eb2-b31d-f2d4b7d15006','a0576c7e-a465-4ae5-836b-f8f4e00cfb38','563ea499-c63b-4cec-94ad-5d0d57b8aea0','34333933-62b2-41a5-9cf5-8a3bc728b1a5','d76fd20c-dace-4a76-b85c-6e02ce369fa5','d79422e6-1947-4e20-b4fb-b7efc3d4c590','d68acf24-59b9-4f72-898a-f6df93744cd0','700dc8e3-9bd7-4ecf-aba5-2f0aefe5b1aa','4015e74c-76cd-482f-a8a3-d96ecbe05f4c','5114610d-6411-4108-9708-66c0500a3d95','6f5ea83d-f371-40e1-965c-a4df98b1e638'],array[1,1,1,1,1,1,2,1,1,1,1]),
  ('2d949a62-422e-4408-9b30-57023f46bf1e','68e51c13-884a-463e-a98c-59d194d7b71a','Kitchen corner','Enough to cook in a room: a pot, a pan, plates, cutlery, a kettle and a flask.','One room',array['b0722a52-96b4-4240-8a6b-582ec197e8db','44bc520d-208d-4ceb-ac9c-c142045e9719','aa581a4e-6696-4268-aac3-f93847b1d57f','e744faf3-be16-4e54-8b61-acd779a43a67','b034f015-8e30-41ef-802e-2bbb10837ff9','451e0395-4cbf-4975-84f4-e83b996302d1','d68acf24-59b9-4f72-898a-f6df93744cd0','700dc8e3-9bd7-4ecf-aba5-2f0aefe5b1aa'],array[1,1,1,1,1,1,2,1]),
  ('b0460166-b2e7-409a-bd20-2bf931670cb3','68e51c13-884a-463e-a98c-59d194d7b71a','Everything for a first year','The mattress, the bedding, the room and the kitchen. One delivery, one price.','A whole room, first term',array['f694b89e-bca6-4ff9-8d33-5c62727643b2','ed694054-9a9e-44e5-a911-9029c3926016','e2c930fd-1d1d-4d0f-9aa1-4eb3c7b777bb','87d0ce83-aae9-41e8-94a0-4aeb48ea5933','a3d08f5f-8671-4eb2-b31d-f2d4b7d15006','a0576c7e-a465-4ae5-836b-f8f4e00cfb38','563ea499-c63b-4cec-94ad-5d0d57b8aea0','34333933-62b2-41a5-9cf5-8a3bc728b1a5','d76fd20c-dace-4a76-b85c-6e02ce369fa5','d79422e6-1947-4e20-b4fb-b7efc3d4c590','4015e74c-76cd-482f-a8a3-d96ecbe05f4c','5114610d-6411-4108-9708-66c0500a3d95','6f5ea83d-f371-40e1-965c-a4df98b1e638','b0722a52-96b4-4240-8a6b-582ec197e8db','aa581a4e-6696-4268-aac3-f93847b1d57f','e744faf3-be16-4e54-8b61-acd779a43a67','b034f015-8e30-41ef-802e-2bbb10837ff9'],array[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]),
  ('bebc29db-39e5-41af-907b-7c40918bbcd1','e727d304-90da-4e88-ab69-a455b3aa958a','Small restock','The three things that always go first.','One person, a fortnight',array['d59e46ff-7bcc-45df-be1f-aa5b9baa514b','bc1ad893-b55c-428a-9211-c753514862e6','b67172c7-c399-428a-874e-490bbfa83582','0b3ed7d7-26a1-456c-81d7-37e7114a5be0','01608b60-e0ac-490d-a512-c80475afc0b7','b5b607e3-9aaa-4ab7-869c-46eb8eb5d98c','b9b8ed6f-ac89-43c6-bac6-2be1c7df495b'],array[10,1,3,1,2,1,1]),
  ('b9b934d7-e33e-4eaa-9504-6735a51b179c','e727d304-90da-4e88-ab69-a455b3aa958a','Monthly restock','Food and the cleaning things, back to where they were at the start of the month.','One person, a month',array['c8f5b076-4c8a-400a-8bd6-7f7484454cee','d59e46ff-7bcc-45df-be1f-aa5b9baa514b','c67b5db1-4d14-4edb-b9ad-73f3de5d783c','7f020ef6-1318-40a6-9454-dccd35aa5ace','01608b60-e0ac-490d-a512-c80475afc0b7','b67172c7-c399-428a-874e-490bbfa83582','0b3ed7d7-26a1-456c-81d7-37e7114a5be0','718d2162-782c-4611-ad12-7113dfd3992b','51ac664d-97e1-406d-8370-1e362f99754d','b5b607e3-9aaa-4ab7-869c-46eb8eb5d98c','b9b8ed6f-ac89-43c6-bac6-2be1c7df495b','d79422e6-1947-4e20-b4fb-b7efc3d4c590','700dc8e3-9bd7-4ecf-aba5-2f0aefe5b1aa','d76fd20c-dace-4a76-b85c-6e02ce369fa5'],array[1,15,1,1,2,4,1,1,1,1,2,1,1,1]),
  ('19453016-5ed2-41eb-a1af-7f46647cbb10','5a84c11e-0115-436e-9249-d48274feb41b','The monthly basics','Toilet roll, soap, toothpaste, detergent, sponges.','One person, a month',array['b5b607e3-9aaa-4ab7-869c-46eb8eb5d98c','b9b8ed6f-ac89-43c6-bac6-2be1c7df495b','ffce871f-1ec6-441d-a291-5d353fa3ceea','304db6b6-8cd7-4851-851b-5b2f04466301','866a06cb-d2ab-4ec6-904d-cad2369ee568','64f59e85-9be7-4227-b436-0546411ca384','d79422e6-1947-4e20-b4fb-b7efc3d4c590','d68acf24-59b9-4f72-898a-f6df93744cd0','d76fd20c-dace-4a76-b85c-6e02ce369fa5'],array[1,2,1,1,1,1,1,2,1]),
  ('84c2a98c-f130-47ec-8bdb-a4f0cb2752cc','5a84c11e-0115-436e-9249-d48274feb41b','Her month','The same, with pads and hand sanitiser in it.','One person, a month',array['b5b607e3-9aaa-4ab7-869c-46eb8eb5d98c','4a3a6b90-990a-4682-beff-b3281fa06728','b9b8ed6f-ac89-43c6-bac6-2be1c7df495b','ffce871f-1ec6-441d-a291-5d353fa3ceea','304db6b6-8cd7-4851-851b-5b2f04466301','866a06cb-d2ab-4ec6-904d-cad2369ee568','64f59e85-9be7-4227-b436-0546411ca384','d79422e6-1947-4e20-b4fb-b7efc3d4c590','77f861c0-fb25-4b1b-86df-d32210ee50ce','d76fd20c-dace-4a76-b85c-6e02ce369fa5'],array[1,2,2,1,1,1,1,1,1,1]),
  ('f5100e31-40b3-4c33-a204-0f9d8067a397','5a84c11e-0115-436e-9249-d48274feb41b','The room kit','Insecticide, a mop, a broom and a small first-aid tin. For the week nobody has cleaned.','One room',array['7b0de566-2477-4a4a-94f6-2d05e330dc7a','6a473438-406a-47f7-8a88-c8fdb150a9c1','34333933-62b2-41a5-9cf5-8a3bc728b1a5','d76fd20c-dace-4a76-b85c-6e02ce369fa5','d79422e6-1947-4e20-b4fb-b7efc3d4c590','700dc8e3-9bd7-4ecf-aba5-2f0aefe5b1aa','d68acf24-59b9-4f72-898a-f6df93744cd0','b8d30340-89ea-4afd-a954-7d18d3127d37','5ca618e9-491e-4468-957c-2e4a2c27d80b'],array[1,1,1,1,1,1,2,1,1]),
  ('53f5318f-d169-4fd3-b510-05a05459cb92','da462b7e-612e-4956-9d71-848711d59053','All-nighter box','Chin-chin, biscuits, cookies, hot chocolate, crisps and water.','One or two people, one night',array['ff618dae-028b-4297-8326-143001ab7b5c','dc2a8334-a753-4ad0-8e49-1f31335c2f8f','9dd03dae-a743-4aac-ae94-97619e33758c','1a6aa094-92fb-41e9-83a6-ec99c59d8161','277910c2-9584-4e78-abc1-07a87315ecd6','153ceb25-2bb2-43a9-bca2-c3404c068962'],array[1,4,4,1,1,1]),
  ('745862cb-b2d7-4919-869d-67f3f4475ee9','da462b7e-612e-4956-9d71-848711d59053','Exam week feed','Pies, scones and something sweet, for a week where nobody is cooking.','One person, a week',array['d993272c-6f2f-4e6e-93df-f3f234bbf5f2','5d52ace3-1925-4b90-98f6-99032f207a80','7a8f0dce-e984-4a31-b4dd-73727b7858e9','ff618dae-028b-4297-8326-143001ab7b5c','277910c2-9584-4e78-abc1-07a87315ecd6','83b2a8d0-d14e-4dbe-926c-4af0d7490f81','9006354d-e94e-4a13-89ba-1949609da7e2'],array[4,2,1,1,1,1,1]),
  ('1e33b610-e8bd-4429-97e1-13d9bec13576','c7b8b305-9e4a-4f75-80bf-e8821fb53edc','Birthday box','A six inch cake, cupcakes, balloons and a card.','A birthday',array['8d406241-de82-42db-85d8-a0595f61afe4','225c610f-6514-4f50-9caa-1eeba982e1fb','b68f4be2-ccf3-433a-8d6f-36ef11a6b614','e1b73749-95ce-4a38-ba68-ad431d70f64b'],array[1,1,1,1]),
  ('63842031-b839-4506-ae3b-4f8ff4881c9d','c7b8b305-9e4a-4f75-80bf-e8821fb53edc','Thinking of you','A small cake, chocolate, fruit and a card. For the week somebody is having a hard one.','One person',array['d2f6ff6b-5b3d-4bd5-8251-8880d2cf1f7e','36ba800a-4acd-4f28-995e-a9dbae607131','e1b73749-95ce-4a38-ba68-ad431d70f64b','22ebc35e-62df-4027-9876-c5ba34609d25'],array[1,1,1,1]),
  ('1a70a7dc-2fb4-4768-aa38-25ef758eb640','c7b8b305-9e4a-4f75-80bf-e8821fb53edc','Flowers and a note','Roses, a card, and chocolate to go with them.','One person',array['f6be6e51-d9a9-4ee7-9f19-38df1046f1a3','e1b73749-95ce-4a38-ba68-ad431d70f64b','36ba800a-4acd-4f28-995e-a9dbae607131'],array[1,1,1]),
  ('e7620f4c-191a-4d16-a722-2c401654805b','c7b8b305-9e4a-4f75-80bf-e8821fb53edc','The big one','An eight inch cake, roses, chocolate, a candle, a bear and balloons.','A birthday, done properly',array['211f36e7-83cc-468a-a699-77394892041b','f6be6e51-d9a9-4ee7-9f19-38df1046f1a3','36ba800a-4acd-4f28-995e-a9dbae607131','bac88127-fb38-41dd-8c85-688f346b73d0','1a256940-9671-49b1-a103-cf89d51c1aa3','b68f4be2-ccf3-433a-8d6f-36ef11a6b614','e1b73749-95ce-4a38-ba68-ad431d70f64b'],array[1,1,1,1,1,1,1])
) as b(id,occ,name,blurb,serves,items,qtys) on conflict (id) do nothing;

-- Later the same day: the pot and the frying pan came off.
--
-- PAU hostels have pots. Selling somebody a pot they already have is the
-- fastest way to make a box look like it was written by somebody who has
-- never been in the building, and one wrong line is enough to lose the
-- whole box. Both are switched off rather than deleted, because a product
-- that turns out to be wanted after all should come back, not be retyped.
--
-- In their place, eight things a hostel room does want, and two boxes that
-- make sense: somewhere to eat and drink from, and something for the night
-- the power goes.
--
-- Run by hand against the live shop; written down here so it is known.
--   Added: rechargeable lamp, rechargeable fan, power bank, mug, food
--   flask, laundry basket, pegs, iron.
--   Kitchen corner became "Eating and drinking corner": kettle, flask,
--   mugs, plates, cutlery, food flask, sponges, washing-up liquid.
--   New: "Light and power": lamp, fan, power bank, extension, two bulbs.
--   "Everything for a first year" lost the pot and gained the lamp, the
--   laundry basket and the mugs.

-- And the pot went properly, not quietly.
--   delete from menu_items where name in ('Cooking pot, medium','Frying pan');
-- Switching a product off was the wrong answer: a thing nobody can buy
-- should not be on the page saying so. It can be added back any day.

-- Food boxes: the one collection made of nothing new.
--
-- Pizza, wings and ice cream, all of it off menus the shop already carries,
-- and every line swappable. Domino's, Dodo and Panarottis all sell a pizza;
-- KFC and Chicken Republic both sell chicken. So the box names one and
-- offers the others, and nobody has to be told no.
--   Pizza night, for two      ₦23,599 on a run
--   Friday night, for four    ₦43,299
--   Everything at once        ₦67,299

-- Covers.
--   update occasions set image_url = '/covers/' || slug || '.svg'
--   where kind = 'collection';
-- Drawn rather than photographed, and kept in public/covers. A set of stock
-- photos of other people's food is a lie about what is in the box, and eight
-- photos taken by eight people in eight kitchens looks like a car boot sale.
-- A photo of the real thing beats both: upload one in admin and it wins.

-- The Chowdeck exclusive came out of "Everything at once".
--   A box on our own site advertising another delivery company's deal is an
--   advert for them, and the price on it is a price we cannot honour.
--   Swapped for Krispy Kreme's Bbn deal, ₦11,500, which takes the box from
--   ₦67,299 to ₦57,699 on a run.
