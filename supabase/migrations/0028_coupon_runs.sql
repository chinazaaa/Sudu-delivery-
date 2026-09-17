-- Which runs a code works on. A code is usually for one night: the Wednesday
-- that needs filling, not the next fortnight. With no rows here it works on
-- any run, which is the occasional code that runs all term.
create table if not exists coupon_runs (
  coupon_code text not null references coupons(code) on delete cascade,
  batch_id    uuid not null references batches(id) on delete cascade,
  primary key (coupon_code, batch_id)
);
create index if not exists coupon_runs_batch_idx on coupon_runs (batch_id);
alter table coupon_runs enable row level security;

notify pgrst, 'reload schema';
