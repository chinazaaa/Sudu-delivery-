-- The first three counters with a number on them.
--
-- Typed in by hand off the shop's own records, which is the only way these
-- arrive: a kitchen's number is on a banner or in somebody's phone, not in
-- any feed. Stored in international form because that is how they were
-- given and because it is unambiguous for both a call and a WhatsApp link,
-- which strips everything but the digits anyway.
--
-- orders_ahead is deliberately left empty on all three. Nobody has said
-- yet whether these are watched on WhatsApp or want a call, and empty is
-- the honest answer: the run sheet offers both until somebody knows which
-- one works, rather than guessing and sending tonight's list into an inbox
-- nobody reads.
update restaurants set phone = '+2349026015055' where name = 'Panarottis';
update restaurants set phone = '+2347074334453' where name = 'DO Bowls';
update restaurants set phone = '+2347042323173' where name = 'Pitakwa Boleandgrill';
