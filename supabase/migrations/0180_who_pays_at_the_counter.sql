-- Whether the person standing at the counter has anything to pay.
--
-- The run sheet assumed every stop ended at a card machine, because that
-- is what a stop used to be. It is not: some counters take a transfer from
-- the shop before the car arrives, and at those the driver collects and
-- leaves. Telling her "the card should be 26,500" at a counter that has
-- already been paid is worse than saying nothing, because she will stand
-- there trying to pay it.
--
-- Empty means nobody has said, and empty behaves as card. That is the way
-- it has always worked and it is the safe way to be wrong: a driver who
-- expected to pay and did not is mildly surprised, while a driver who
-- expected the shop to have paid and finds it has not is stuck at a
-- counter with a bag she cannot take.
alter table restaurants
  add column if not exists pay_by text not null default '';

comment on column restaurants.pay_by is
  'Who settles this counter: card for the driver paying there, transfer for the shop paying ahead, empty for nobody has said, which behaves as card.';

-- The four counters the shop has actually sorted out. All four take the
-- order sent ahead and confirm the price back, which is what makes sending
-- it worth doing; two of them are then paid by transfer and two at the
-- till.
update restaurants set phone = '+2349152890617' where name = 'Dodo Pizza';

update restaurants set orders_ahead = 'whatsapp'
  where name in ('Panarottis', 'DO Bowls', 'Pitakwa Boleandgrill', 'Dodo Pizza');

update restaurants set pay_by = 'card'
  where name in ('Panarottis', 'Dodo Pizza');

update restaurants set pay_by = 'transfer'
  where name in ('DO Bowls', 'Pitakwa Boleandgrill');
