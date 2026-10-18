-- Let 'pharmacy' be a kind of shop, and a kind of car.
--
-- Both tables checked their kind against a list written before the pharmacy
-- counter existed, so the import refused to make the shop row at all. The
-- batches one had not bitten yet only because nothing had got far enough to
-- order: the first pharmacy basket would have failed on the car instead,
-- which is a worse place to find out.
alter table restaurants drop constraint if exists restaurants_kind_check;
alter table restaurants add constraint restaurants_kind_check
  check (kind = any (array['food'::text, 'skincare'::text, 'pharmacy'::text, 'own'::text]));

alter table batches drop constraint if exists batches_kind_check;
alter table batches add constraint batches_kind_check
  check (kind = any (array['run'::text, 'same_day'::text, 'skincare'::text, 'pharmacy'::text, 'parcel'::text, 'box'::text]));
