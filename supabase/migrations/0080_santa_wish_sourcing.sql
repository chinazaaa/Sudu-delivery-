-- What we would pay for a wish, what we would charge, and where it comes from.
--
-- Written against the wish rather than against the order, because the
-- useful moment is before anybody has picked anything. A room of ten people
-- is fifty things on lists, and the ones that take a week to find are
-- knowable in November. Waiting for the draw to start looking is how a
-- December exchange date is missed.
--
-- Three numbers and a place:
--   cost_price  what the shop pays for it
--   sell_price  what the member is charged, which is normally the budget
--               but is not always: something cheap and easy might come in
--               under, and the difference is what goes back to them
--   source      where it is actually bought. The thing that is worth most
--               next year, because "where did we get the last one" is the
--               question that costs an afternoon every single time.
--
-- None of this is ever shown to a member. cost_price is the margin, and a
-- wishlist that prints what the shop paid is a wishlist nobody uses twice.
alter table santa_wishes add column if not exists cost_price int not null default 0
  check (cost_price >= 0);
alter table santa_wishes add column if not exists sell_price int not null default 0
  check (sell_price >= 0);
alter table santa_wishes add column if not exists source text not null default '';

comment on column santa_wishes.cost_price is
  'What the shop pays. Admin only: never select this into a member view.';
