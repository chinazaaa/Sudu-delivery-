-- Twelve ways in, over a hundred ways the kitchens file things.
--
-- Every menu was imported the way its own kitchen keeps it, which is right
-- for showing one restaurant's menu and wrong for showing all of them at
-- once: a filter row of twenty-five where "Burgers" sat beside "Burgers &
-- sandwiches", and where half the words were a kitchen's internal filing
-- rather than anything a student would look for.
--
-- Each of a kitchen's own sections is now also filed under one aisle, and
-- the aisle is what the whole shop is browsed by. The kitchen's own words
-- are untouched and still what its own menu says.
alter table menu_categories add column if not exists aisle text not null default '';

-- The aisles this shop uses, one per line, in the order they are shown.
-- Empty means the twelve in lib/aisles.ts.
alter table settings add column if not exists menu_aisles text not null default '';

-- The backlog, filed. Matched on the section's own name and only where
-- nothing has been filed yet, so running it twice changes nothing and an
-- aisle corrected in admin is never overwritten.
--
-- The guesses come from guessAisle in lib/aisles.ts, which is the same
-- guesser a newly imported section goes through, so this is the backlog
-- rather than a rule written twice.
update menu_categories c set aisle = t.aisle
from (values
  ('add-ons', 'Extras & add-ons'),
  ('alacarte', 'Chicken'),
  ('baking condiments', 'Groceries'),
  ('bk jollof rice', 'Rice, pasta & bowls'),
  ('bread', 'Sides & snacks'),
  ('burgers', 'Burgers & wraps'),
  ('burgers & sandwiches', 'Burgers & wraps'),
  ('burrito bowls', 'Rice, pasta & bowls'),
  ('burrito wraps', 'Burgers & wraps'),
  ('cakes', 'Sweet things'),
  ('cards', 'For the room'),
  ('cards and stickers', 'For the room'),
  ('chicken & rice', 'Chicken'),
  ('citizens meals', 'Meals & combos'),
  ('coffee & tea', 'Drinks'),
  ('combo meals', 'Meals & combos'),
  ('condiments & utensils', 'Groceries'),
  ('deal', 'Meals & combos'),
  ('deals & combos', 'Meals & combos'),
  ('deals & exclusives', 'Meals & combos'),
  ('dessert', 'Sweet things'),
  ('desserts', 'Sweet things'),
  ('desserts & drinks', 'Sweet things'),
  ('dips & sides', 'Extras & add-ons'),
  ('dodsters & pockets', 'Pizza'),
  ('double deal', 'Meals & combos'),
  ('doughnut boxes', 'Sweet things'),
  ('doughnuts', 'Sweet things'),
  ('drinks', 'Drinks'),
  ('everyday affordable value meals', 'Meals & combos'),
  ('express sides', 'Sides & snacks'),
  ('extra toppings', 'Extras & add-ons'),
  ('extras', 'Sides & snacks'),
  ('for the room', 'For the room'),
  ('gifting', 'For the room'),
  ('gourmet', 'Burgers & wraps'),
  ('hotdogs', 'Burgers & wraps'),
  ('ice cream by the scoop', 'Sweet things'),
  ('kids', 'Meals & combos'),
  ('kids meals', 'Meals & combos'),
  ('lite meal', 'Meals & combos'),
  ('local market combos', 'Meals & combos'),
  ('lunch time meal', 'Meals & combos'),
  ('meals', 'Meals & combos'),
  ('meat & fish', 'Groceries'),
  ('meat options (beef chicken & pork)', 'Extras & add-ons'),
  ('milkshake & drinks', 'Drinks'),
  ('mix-ins & toppings', 'Extras & add-ons'),
  ('pantry', 'For the room'),
  ('pasta', 'Rice, pasta & bowls'),
  ('pastas', 'Rice, pasta & bowls'),
  ('pastries & snacks', 'Sides & snacks'),
  ('pepper, vegetable & fruits', 'Groceries'),
  ('pizzas', 'Pizza'),
  ('pot meals', 'Meals & combos'),
  ('protein', 'Groceries'),
  ('pull aparts', 'Sweet things'),
  ('ready to love flavours', 'Sweet things'),
  ('rice', 'Rice, pasta & bowls'),
  ('rice & mains', 'Rice, pasta & bowls'),
  ('rice & noodles', 'Rice, pasta & bowls'),
  ('rice grains & pasta', 'Groceries'),
  ('rotisserie chicken', 'Chicken'),
  ('salad', 'Sides & snacks'),
  ('sauce dips', 'Extras & add-ons'),
  ('sauces', 'Extras & add-ons'),
  ('seafood options', 'Extras & add-ons'),
  ('shakes', 'Drinks'),
  ('shakes & chillers', 'Drinks'),
  ('sides', 'Sides & snacks'),
  ('sides & salads', 'Sides & snacks'),
  ('signature creations', 'Sweet things'),
  ('small chops', 'Sides & snacks'),
  ('soft drinks', 'Drinks'),
  ('soups & swallow', 'Soups & swallow'),
  ('specials', 'Meals & combos'),
  ('square pizzas', 'Pizza'),
  ('starters', 'Sides & snacks'),
  ('tasty sides', 'Sides & snacks'),
  ('toiletries and household', 'For the room'),
  ('tuber', 'Groceries'),
  ('vegan', 'Rice, pasta & bowls'),
  ('waffles', 'Sweet things'),
  ('wings', 'Chicken'),
  ('wings & chicken', 'Chicken')
) as t(section, aisle)
where lower(trim(c.name)) = t.section and coalesce(c.aisle, '') = '';

-- Two the guesser cannot get right from the word alone, because the same
-- word means different things at different counters. Bread at the
-- supermarket is a shop, bread at Domino's is a side; protein at the market
-- is meat to cook, protein at a bowl counter is a choice inside the bowl.
update menu_categories c set aisle = 'Groceries'
from restaurants r
where r.id = c.restaurant_id and r.name = 'Market Square' and lower(trim(c.name)) = 'bread';

update menu_categories c set aisle = 'Extras & add-ons'
from restaurants r
where r.id = c.restaurant_id and r.name = 'DO Bowls' and lower(trim(c.name)) = 'protein';
