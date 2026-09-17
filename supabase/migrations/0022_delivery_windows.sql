-- What customers are told about when a run lands, per slot. It was fixed in
-- code, so moving the afternoon run half an hour meant a deploy.
alter table settings add column if not exists window_afternoon text not null default '';
alter table settings add column if not exists window_night     text not null default '';

notify pgrst, 'reload schema';
