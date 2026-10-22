-- What a thing costs at the counter, beside what it sells for.
--
-- The menu held one price, which is what the customer pays. What the
-- counter charges for the same thing was nowhere, so the shop's margin on
-- food could only ever be learned afterwards, by typing a receipt into the
-- run sheet, and until somebody did that every kitchen figure was the menu
-- compared with itself.
--
-- Selling price stays where it is. price_food is what a customer is
-- charged and what every order, every total and every figure already
-- reads; moving it would be a rewrite of the whole shop to gain nothing.
-- The cost sits beside it, and admin works out the selling price from it
-- so the two stay in step when a counter puts its prices up.
alter table menu_items
  add column if not exists price_cost integer;

comment on column menu_items.price_cost is
  'What this costs at the counter, before the shop''s markup. Null means nobody has said.';

-- Whether anybody has actually checked it.
--
-- The backfill below is arithmetic, not knowledge: it assumes every price
-- on the menu is the counter''s with fifteen per cent on, which is written
-- down for The Place and for Pitakwa and is a guess everywhere else.
-- Chicken Republic''s spaghetti at 2,100 works back to 1,826, which is not
-- a number a restaurant charges.
--
-- A wrong cost price is worse than an empty one. It makes every margin
-- confidently wrong and nothing looks broken, so the guess has to be able
-- to say it is a guess, and the shop has to be able to see what it has
-- actually confirmed.
alter table menu_items
  add column if not exists cost_confirmed boolean not null default false;

comment on column menu_items.cost_confirmed is
  'True once somebody has seen this cost on a receipt or a counter''s own menu. False means it was worked back from the selling price and is a guess.';

-- The markup, in one place, editable without a deploy.
alter table settings
  add column if not exists food_markup numeric not null default 15;

comment on column settings.food_markup is
  'Per cent added to a counter price to get the menu price. Fifteen is what the shop has used.';

-- Worked back from what is already on the menu, so there is something to
-- correct rather than four hundred empty boxes. Every one of them lands
-- unconfirmed.
update menu_items
set price_cost = round(price_food / 1.15)
where price_food > 0 and price_cost is null;
