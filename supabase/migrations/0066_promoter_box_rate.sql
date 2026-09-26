-- A box is worth more to bring in than a plate of food.
--
-- One flat commission made a ₦500 wrap and a ₦80,000 care package the same
-- sale, which is not what either of them is. A promoter who talks somebody's
-- mother into a monthly care package has done a different job, and the rate
-- says so.
alter table promoters
  add column if not exists box_rate integer not null default 1000;
