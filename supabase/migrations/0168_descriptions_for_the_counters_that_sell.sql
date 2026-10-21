-- The missing descriptions on the counters people actually order from.
--
-- A dish with no words under it is a name and a price, which is the one
-- thing a photograph cannot fix: somebody who does not already know what
-- ugba or shaki is cannot find out without leaving. Written the way the
-- menu already talks, which is plainly and about the food: what it is and
-- what is in it, no adjectives doing work the food should do.
update menu_items i
set description = v.said
from (values
  ('dominos-pizza', 'Brownie', 'Warm chocolate brownie'),
  ('dominos-pizza', 'Caramel Cinnamon Bread', 'Pull apart bread with cinnamon and caramel'),
  ('dominos-pizza', 'Chocolate Fudge Bread', 'Pull apart bread with chocolate fudge'),
  ('dominos-pizza', 'Chocolate Spread Bread', 'Pull apart bread with chocolate spread'),
  ('kfc', 'Zingy Burger', 'Spicy chicken fillet in a bun with lettuce and mayonnaise'),
  ('pitakwa-boleandgrill', 'Potatoes', 'Roasted potato, one piece'),
  ('pitakwa-boleandgrill', 'Centre fish', 'The middle cut of the grilled fish, the meatiest part'),
  ('pitakwa-boleandgrill', 'Tail fish', 'The tail end of the grilled fish'),
  ('pitakwa-boleandgrill', 'Chicken', 'Grilled chicken'),
  ('pitakwa-boleandgrill', 'Turkey, small', 'Grilled turkey, the smaller cut'),
  ('pitakwa-boleandgrill', 'Turkey, large', 'Grilled turkey, the larger cut'),
  ('pitakwa-boleandgrill', 'Beans', 'A plate of beans, to go with the plantain'),
  ('pitakwa-boleandgrill', 'Ugba', 'Shredded oil bean seed, the sharp one that goes with roasted plantain'),
  ('the-place', 'Extra large value munch - fried rice & chicken in stew', 'Fried rice with chicken in stew, the larger plate'),
  ('the-place', 'Extra large value munch - fried rice & curry chicken', 'Fried rice with fried curry chicken, the larger plate'),
  ('the-place', 'Extra-large value munch - jollof rice & chicken in stew', 'Jollof rice with chicken in stew, the larger plate'),
  ('the-place', 'Extra-large value munch - jollof rice & curry chicken', 'Jollof rice with fried curry chicken, the larger plate'),
  ('the-place', 'Regular value munch - fried rice & chicken in stew', 'Fried rice with chicken in stew'),
  ('the-place', 'Regular value munch - fried rice & curry chicken', 'Fried rice with fried curry chicken'),
  ('the-place', 'Regular value munch - jollof rice & chicken in stew', 'Jollof rice with chicken in stew'),
  ('the-place', 'Regular value munch - jollof rice & curry chicken', 'Jollof rice with fried curry chicken'),
  ('the-place', 'Extra large value munch - mix & chicken in stew', 'Jollof and fried rice mixed, with chicken in stew, the larger plate'),
  ('the-place', 'Extra large value munch - mix & curry chicken', 'Jollof and fried rice mixed, with fried curry chicken, the larger plate'),
  ('the-place', 'Regular value munch - jollof rice & pepper chicken', 'Jollof rice with hot pepper chicken'),
  ('the-place', 'Fried rice', 'Short grain fried rice with vegetables'),
  ('the-place', 'Stir fry spaghetti', 'Spaghetti stir fried with vegetables'),
  ('the-place', 'Asun fried rice & fried curry chicken combo', 'Basmati rice with peppered goat meat, and fried curry chicken beside it'),
  ('the-place', 'Smokey Jollof Rice', 'Jollof rice cooked over a flame, for the smoke'),
  ('the-place', 'Croaker fish in stew - big', 'A whole croaker in stew'),
  ('the-place', 'Boiled egg', 'One boiled egg'),
  ('the-place', 'Honey BBQ Chicken', 'Fried chicken in honey barbecue sauce'),
  ('the-place', 'Fried curry chicken', 'Chicken fried in curry'),
  ('the-place', 'Grilled turkey wings-big', 'Grilled turkey wings, the big portion'),
  ('the-place', 'Shaki', 'Cow tripe, cooked soft'),
  ('the-place', 'Ponmo', 'Cow skin, cooked soft'),
  ('the-place', 'Pepper chicken', 'Chicken in hot pepper sauce'),
  ('the-place', 'Goat meat', 'Goat meat in stew'),
  ('the-place', 'Pasta vegetable salad', 'Cold pasta with vegetables and mayonnaise'),
  ('the-place', 'Fried Plantain', 'Fried ripe plantain'),
  ('the-place', 'Jam Doughnut', 'Doughnut filled with jam'),
  ('the-place', 'Beef roll', 'Pastry rolled around seasoned beef'),
  ('the-place', 'Chicken pie', 'Pastry filled with chicken and vegetables'),
  ('the-place', 'Meat pie', 'Pastry filled with minced beef and potato'),
  ('the-place', 'Guiness Combo - Value Munch + Malta Guiness', 'A value munch plate with a can of Malta Guinness'),
  ('the-place', 'Pulpy Drink (85cl)', 'Orange juice with the pulp left in, 85cl'),
  ('the-place', 'Chivita Juice', 'Chivita fruit juice'),
  ('the-place', 'Can Malta Guiness', 'Malta Guinness, the malt drink, in a can'),
  ('the-place', 'Coke (50cl)', 'Coca-Cola, 50cl bottle'),
  ('the-place', 'Sprite (50cl)', 'Sprite, 50cl bottle'),
  ('the-place', 'Fanta (50cl)', 'Fanta, 50cl bottle'),
  ('the-place', 'Lucozade Boost', 'Lucozade Boost energy drink'),
  ('the-place', 'Manny fruit juice', 'Manny fruit juice'),
  ('the-place', 'Aquafina Water(75cl)', 'Aquafina bottled water, 75cl'),
  ('the-place', 'Eva Water (75cl)', 'Eva bottled water, 75cl'),
  ('the-place', 'Pet Coca-Cola 35CL', 'Coca-Cola, 35cl bottle'),
  ('the-place', 'Can maltina', 'Maltina, the malt drink, in a can'),
  ('the-place', 'Amstel Malta', 'Amstel Malta, the malt drink')
) as v(slug, item, said)
join restaurants r on r.slug = v.slug
where i.restaurant_id = r.id
  and i.name = v.item
  and btrim(coalesce(i.description, '')) = '';
