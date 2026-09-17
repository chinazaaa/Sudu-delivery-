-- How far ahead a customer can order. Runs are created three weeks out so the
-- admin can plan, but offering all of them to a customer invites an order that
-- sits unpaid for a fortnight at prices that will have moved.
alter table settings add column if not exists order_horizon_days int not null default 7;

notify pgrst, 'reload schema';
