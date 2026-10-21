-- Three boxes behind the Halloween shelf, so the date has something to sell.
--
-- An occasion with a deadline and no boxes is a countdown to an empty
-- page. These are the three the night actually divides into: a big sweet
-- one for a floor, a hot one for a floor, and a small one for two people
-- who are staying in.
--
-- Priced against the Movie Box, which feeds the same four to five for
-- ₦31,350 of food. Nothing in here is new stock: it is the doughnuts, the
-- ice cream and the pizza already on the menu, picked in the combinations
-- somebody would otherwise have to assemble by hand on a Friday night.
--
-- The options are pinned rather than left to the shelf, because three of
-- these counters refuse a line without one: ice cream needs a cup size,
-- pizza needs a size and a crust, and doughnuts need a box. A box that
-- lands in the cart unanswered is a box nobody can check out.
insert into boxes (occasion_id, name, blurb, serves, run_fee, car_fee, is_extra, active, sort_order, lines)
select o.id, v.name, v.blurb, v.serves, 4000, 6500, false, true, v.sort_order, v.lines::jsonb
from occasions o
cross join (values
  (
    'The Trick or Treat Box',
    'Six doughnuts and two tubs of ice cream, one chocolate and one cotton candy.',
    '4 to 5 people',
    0,
    '[{"id": "doughnuts", "qty": 1, "swaps": [], "option_ids": ["0027088d-fc3b-4843-b410-38e031cdb223"], "menu_item_id": "bb1c3232-85c3-4d50-a67a-868f552c1b62"},
      {"id": "chocolate", "qty": 1, "swaps": [], "option_ids": ["d064cc25-5803-4d79-88ab-2f44a93e00c3"], "menu_item_id": "4df21728-761f-4ed2-9df8-f9a6d5b6f5b8"},
      {"id": "cottoncandy", "qty": 1, "swaps": [], "option_ids": ["26a973cf-a4e2-40ba-bd36-287f48a65c11"], "menu_item_id": "1b4c88f2-07e4-4a17-aaa7-68c69ecf6b2e"}]'
  ),
  (
    'The Monster Box',
    'Two pizzas, cheesy bread and a tub of chocolate ice cream.',
    '4 to 5 people',
    1,
    '[{"id": "pizza", "qty": 2, "swaps": [], "option_ids": ["1050a41d-be76-407a-b542-820b98d42057", "75fa8841-52f0-4bb7-998c-b608667571d5"], "menu_item_id": "745d133d-4607-4413-bb69-219ab0ea565b"},
      {"id": "bread", "qty": 1, "swaps": [], "option_ids": [], "menu_item_id": "e3ec9525-78c9-425e-bef6-d1e60935bca0"},
      {"id": "icecream", "qty": 1, "swaps": [], "option_ids": ["d064cc25-5803-4d79-88ab-2f44a93e00c3"], "menu_item_id": "4df21728-761f-4ed2-9df8-f9a6d5b6f5b8"}]'
  ),
  (
    'Two of Us, After Dark',
    'Three doughnuts and a tub of ice cream.',
    '2 people',
    2,
    '[{"id": "doughnuts", "qty": 1, "swaps": [], "option_ids": ["7c58f5fb-d334-4114-8cc3-59788ea0a697"], "menu_item_id": "bb1c3232-85c3-4d50-a67a-868f552c1b62"},
      {"id": "icecream", "qty": 1, "swaps": [], "option_ids": ["d064cc25-5803-4d79-88ab-2f44a93e00c3"], "menu_item_id": "4df21728-761f-4ed2-9df8-f9a6d5b6f5b8"}]'
  )
) as v(name, blurb, serves, sort_order, lines)
where o.slug = 'halloween'
  and not exists (
    select 1 from boxes b where b.occasion_id = o.id and b.name = v.name
  );
