-- What a run arrives between, picked on a clock rather than typed as a
-- sentence. The wording customers read is still kept alongside it, because
-- every message, page and card already reads that column, and because a row
-- written before this migration has wording and no times.
alter table run_schedule
  add column if not exists window_from time,
  add column if not exists window_to time;
