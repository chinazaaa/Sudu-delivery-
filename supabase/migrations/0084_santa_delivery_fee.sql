-- What one Secret Santa gift costs to fetch and deliver.
--
-- Every gift is its own errand. Ten gifts in a room come from ten shops, on
-- ten days, and the one car on the exchange day is the last step of ten
-- journeys rather than the whole of one, so this is charged per gift
-- against that giver's own budget rather than shared across the room.
--
-- Zero means nothing is added, which is what it was doing before anybody
-- set it.
alter table settings add column if not exists santa_delivery integer not null default 0;
