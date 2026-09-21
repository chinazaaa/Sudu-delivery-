-- Restaurants that are not in Sangotedo.
--
-- The whole shop was built around one parade of shops twenty minutes from
-- campus, so one delivery ladder was the truth. A restaurant further out is a
-- longer trip and a dearer one, and charging the Sangotedo price for it is
-- losing money on every order without noticing.
--
-- An area, rather than a price on each restaurant: the cost is the distance,
-- not the kitchen, and four restaurants in the same place should not be four
-- numbers to keep in step.
alter table restaurants add column if not exists area text not null default '';

-- The areas themselves, as JSON, so adding one is a change of mind rather
-- than a deploy. Each carries what it adds to the two ladders, because the
-- ladders themselves are about how much room an order takes and that does not
-- change with the distance: a run to Lekki is the Sangotedo ladder plus the
-- extra petrol, at every band.
--
-- Empty is the state everything is in today: one area, no extra, and every
-- price exactly as it was.
alter table settings add column if not exists delivery_areas text not null default '';

-- Which areas a run actually goes to.
--
-- A run is a car with a route. It always passes Sangotedo, and it goes
-- anywhere else only because somebody said so when it was made: a Thursday
-- run that was never going to Lekki cannot pick up a Lekki order because
-- somebody put one in the basket. Kept as "|lekki|ikeja|" so the check is an
-- exact match on a name with its bars.
alter table batches add column if not exists areas text not null default '';
