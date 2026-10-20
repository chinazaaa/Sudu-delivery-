-- Uncle Stan's is in Lekki. The address said "Lekki/Ikoyi" from back when
-- those were one area with one fare, and they are not any more.
update restaurants set address = 'Lekki, Lagos' where name = 'Uncle Stan''s';

-- The container is not a choice.
--
-- It was a line of its own on the grill's shelf, which made it something
-- somebody has to remember, and the one thing you cannot carry food back
-- from a roadside grill without is the thing to carry it in. A shopper in
-- a hurry forgets the plates and the food goes in nothing.
--
-- So it goes into every price instead: 200 at the grill, 250 with the
-- markup every other price here carries. Nothing to tick, nothing to
-- forget, and the figure on the menu is the figure that gets handed over.
update menu_items
set price_food = price_food + 250
where restaurant_id = (select id from restaurants where slug = 'pitakwa-boleandgrill')
  -- Not these two. "Pack and sauce" is the grill's own line for a sauce at
  -- 800 in a container at 200, so it is already carrying one, and "Extra
  -- sauce" is the board's name for the sauce without a container: adding
  -- one would make it the same thing as the line above at the same price.
  and name not in ('Pack and sauce', 'Extra sauce', 'Plate');

-- And the shelf line goes, because it is in every price now and a second
-- way to buy it is a way to pay for it twice.
update menu_items
set available = false, description = 'In every price now, so it is not ordered separately'
where restaurant_id = (select id from restaurants where slug = 'pitakwa-boleandgrill')
  and name = 'Plate';
