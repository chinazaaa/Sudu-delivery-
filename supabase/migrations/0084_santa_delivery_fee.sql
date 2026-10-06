-- What carrying one Secret Santa gift costs.
--
-- The delivery ladder prices a car by how full it is, which is the right
-- way to price an order and the wrong way to price this: every gift in a
-- room goes out on the same day in the same car, so charging each giver a
-- whole trip would be charging ten people for one journey.
--
-- So it is one flat number per gift, set here. Zero means nothing is added,
-- which is what it was doing before anybody set it.
alter table settings add column if not exists santa_delivery integer not null default 0;
