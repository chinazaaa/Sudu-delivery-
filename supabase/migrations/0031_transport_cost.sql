-- Getting there and back, apart from the fuel.
--
-- A run is a keke to the junction, a bike with the bags, sometimes a car when
-- there is too much to carry. That is not fuel and it is not the driver, and
-- putting it under Anything else meant the one cost that changes most from
-- run to run was buried in a box with the bags and the gate fee.
alter table batches add column if not exists transport_cost int not null default 0;

notify pgrst, 'reload schema';
