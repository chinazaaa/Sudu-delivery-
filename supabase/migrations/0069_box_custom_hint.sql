-- What to put in the "want it changed?" box, for one box rather than a shelf.
--
-- One example cannot serve a cake and a bucket, and a shelf holding both had
-- to pick one and be wrong about the other.
alter table boxes add column if not exists custom_hint text not null default '';

comment on column boxes.custom_hint is
  'The example shown in the changes box for this box. Empty falls back to the shelf''s own hint.';
