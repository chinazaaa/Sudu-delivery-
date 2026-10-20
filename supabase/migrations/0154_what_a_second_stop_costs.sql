-- What a second stop costs, by which two places it is between.
--
-- It was a flat thousand in the code, which made every stop worth the same
-- and none of it anybody's to change. Lekki and Ikoyi are minutes apart, so
-- a car already on the island adds one to the other cheaply, and Sangotedo
-- and Ajah are the same the other way. Crossing between the two halves is
-- the dear hop whichever direction it is taken in.
--
-- Sangotedo is in here like anywhere else. A run passes it on the way back,
-- which is why it adds nothing to the distance, but somebody still has to
-- stop the car and go into the shop.
--
-- A cart reaching three areas pays the cheapest way of joining all three
-- rather than every pair added together, because that is the route a driver
-- actually takes.
alter table settings add column if not exists area_pairs text not null default '';

update settings set area_pairs = '[{"a":"","b":"ajah","extra":500},{"a":"","b":"l","extra":1000},{"a":"","b":"ikoyi","extra":1000},{"a":"ajah","b":"l","extra":1000},{"a":"ajah","b":"ikoyi","extra":1000},{"a":"ikoyi","b":"l","extra":500}]';
