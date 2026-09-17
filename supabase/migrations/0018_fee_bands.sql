-- The delivery price list, so it can be changed without a deploy. Blank means
-- the bands the code ships with.
alter table settings add column if not exists fee_bands text not null default '';

notify pgrst, 'reload schema';
