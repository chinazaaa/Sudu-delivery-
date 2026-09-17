-- What a run actually costs to make: fuel, whoever drove, and anything else
-- bought on the night. Without these the sheet could only say what was left
-- before those, which is not profit.
alter table batches add column if not exists fuel_cost   int not null default 0;
alter table batches add column if not exists driver_cost int not null default 0;
alter table batches add column if not exists other_cost  int not null default 0;
alter table batches add column if not exists cost_note   text not null default '';

notify pgrst, 'reload schema';
