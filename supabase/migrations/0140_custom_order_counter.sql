-- A shelf for things no counter sells.
--
-- Somebody asks for roasted plantain from a roadside grill, or a sauce to
-- go with it. There is no menu item for either, so the only way to record
-- the job was the money ledger, one line per thing, with the trip's cost
-- split across them by hand. Two of those on one journey is arithmetic
-- nobody should be doing: a run already models several orders sharing one
-- trip, and does it without being asked.
--
-- So custom things become ordinary order lines on an ordinary run. What
-- they need is somewhere to hang, which is this: a counter of our own,
-- priced per order rather than from a menu, the same way a box holds "a
-- cake" until somebody agrees which cake.
--
-- Its own kind so it can be kept off the food menu while staying in the
-- picker admin adds lines from. A roadside bole has no business sitting
-- between a burger and a bowl of rice on the shop front.
alter table restaurants drop constraint if exists restaurants_kind_check;
alter table restaurants add constraint restaurants_kind_check
  check (kind = any (array['food', 'skincare', 'pharmacy', 'own', 'custom']));
