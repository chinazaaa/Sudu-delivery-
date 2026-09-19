-- Short links for an order and for a group.
--
-- A link gets pasted into a chat, and a thirty-six character identifier in
-- the middle of one looks like something has gone wrong. This is seven
-- characters instead, from an alphabet with no o, l, i, 0 or 1 in it, so a
-- link read off a screen and typed by hand cannot land on somebody else's
-- order.
--
-- It is not a secret in the cryptographic sense, but nor was the identifier
-- it replaces: both are unguessable enough that nobody is going to find a
-- stranger's order by trying, and there are thirty billion of them.
create or replace function short_code() returns text
language sql volatile as $$
  select string_agg(
    substr('23456789abcdefghjkmnpqrstuvwxyz', (floor(random() * 31)::int) + 1, 1),
    ''
  )
  from generate_series(1, 7);
$$;

-- Added empty, filled row by row, and only then made unique: a default on a
-- table this size is one statement that either works or locks, and this way
-- each step is small enough to see.
alter table orders        add column if not exists short text;
alter table order_groups  add column if not exists short text;

update orders       set short = short_code() where short is null;
update order_groups set short = short_code() where short is null;

create unique index if not exists orders_short_idx       on orders (short);
create unique index if not exists order_groups_short_idx on order_groups (short);

alter table orders       alter column short set default short_code();
alter table order_groups alter column short set default short_code();

notify pgrst, 'reload schema';
