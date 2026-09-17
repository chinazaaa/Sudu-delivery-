-- A short number a person can say out loud. Two orders from the same customer
-- on the same run were impossible to tell apart on the run sheet.
create sequence if not exists order_no_seq start 1001;
alter table orders add column if not exists order_no bigint;
alter table orders alter column order_no set default nextval('order_no_seq');

-- Anything placed before this column existed still needs a number.
update orders set order_no = nextval('order_no_seq') where order_no is null;

create unique index if not exists orders_order_no_idx on orders (order_no);

notify pgrst, 'reload schema';
