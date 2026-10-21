-- Our own shelf, described.
--
-- Harder than a menu, because the name already says most of it: "Bucket,
-- 25 litre" needs no help understanding. A description that repeats the
-- name is worse than none, so each of these earns its place by saying
-- what the thing is for in a hostel room, what you actually get, or the
-- one detail the name leaves out.
--
-- Nothing here promises a brand. These are bought at the market on the
-- day, and a description that names a brand is a promise the shopper
-- cannot keep.
update menu_items i
set description = v.said
from (values
  ('Oats, 500g', 'Breakfast that needs only hot water'),
  ('Milo refill, 400g', 'The refill pack, no tin'),
  ('Powdered milk refill, 380g', 'The refill sachet, no tin'),
  ('Cornflakes, 350g', 'A box of cornflakes'),
  ('Tea bags, 50', 'Fifty bags in a box'),
  ('Rice, 5kg bag', 'Enough for a few weeks of cooking for one'),
  ('Rice, 10kg bag', 'A term of cooking for one, or a few weeks shared'),
  ('Rice, 25kg bag', 'The full bag, for a room that cooks together'),
  ('Indomie, full carton', 'A whole carton, cheaper than buying them one at a time'),
  ('Sanitary pads, pack', 'One pack'),
  ('Bar soap', 'For washing and for laundry by hand'),
  ('Shower gel, 500ml', 'A 500ml bottle'),
  ('Toothpaste, 140g', 'A 140g tube'),
  ('Toothbrush', 'One brush'),
  ('Detergent, 1kg', 'Washing powder, a kilo'),
  ('Insecticide spray', 'For mosquitoes in the room'),
  ('Hand sanitiser', 'A bottle for the desk or the bag'),
  ('Paracetamol, pack', 'The ordinary painkiller, one pack'),
  ('Bucket, 25 litre', 'The usual size for a hostel bathroom'),
  ('Washing bowl', 'For laundry by hand, or for dishes'),
  ('Bedsheet and pillowcase, single', 'One sheet and one pillowcase, single bed'),
  ('Mattress protector', 'Goes under the sheet and keeps the mattress clean'),
  ('Towel', 'One bath towel'),
  ('Hangers, 6', 'Six hangers'),
  ('Plates, set of 4', 'Four plates'),
  ('Electric kettle', 'For noodles, tea and hot water without a cooker'),
  ('Flask, 1 litre, vacuum', 'Keeps a litre hot overnight'),
  ('Extension socket, 4 way', 'Four sockets off one wall plug'),
  ('LED bulb', 'One bulb'),
  ('Padlock', 'For a door, a locker or a box'),
  ('Mop', 'For the room floor'),
  ('Rechargeable lamp', 'Charges up and stays on when the power goes'),
  ('Rechargeable standing fan, 16 inch', 'Stands on the floor and keeps running when the power goes'),
  ('Power bank, 20000mAh', 'Enough to charge a phone several times over'),
  ('Mug', 'One mug'),
  ('Food flask', 'Keeps food warm between the kitchen and the room'),
  ('Laundry basket', 'Somewhere for the washing to live'),
  ('Pegs, dozen', 'Twelve pegs'),
  ('Iron', 'A dry iron for the room'),
  ('Greeting card', 'A card, written in your words and handed over with the order'),
  ('Celebration cake, 6 inch', 'A six inch cake, enough for a few people'),
  ('Celebration cake, 8 inch', 'An eight inch cake, enough for a room'),
  ('Bouquet of roses', 'A bunch of roses, wrapped'),
  ('Ferrero Rocher, 16 pieces', 'A box of sixteen'),
  ('Pringles', 'One tube'),
  ('Scented candle', 'One candle'),
  ('Balloons, set', 'A set of balloons for a birthday'),
  ('Teddy bear, medium', 'A medium sized bear'),
  ('Fruit juice, 1 litre', 'A litre carton'),
  ('Fantasy icecream', 'Ice cream')
) as v(item, said)
where i.restaurant_id = (select id from restaurants where slug = 'sudu-shop')
  and i.name = v.item
  and btrim(coalesce(i.description, '')) = '';
