-- Jay's Diner is in Ikoyi, which until now was priced as Lekki.
update restaurants set area = 'ikoyi' where name = 'Jay''s Diner';

-- A run made while "Lekki/Ikoyi" was one area was a car going down the
-- whole corridor, so it carries all three now rather than losing Ikoyi and
-- Ajah the moment they became areas of their own: a run only goes where it
-- was told to go when it was made, and nobody told these ones about areas
-- that did not exist yet.
--
-- Open runs only. A closed one is the record of a car that has already
-- gone, and widening its route after the fact would be a lie about where
-- it went.
update batches
set areas = '|l|ikoyi|ajah|'
where status = 'open' and areas = '|l|';

update run_schedule
set areas = '|l|ikoyi|ajah|'
where areas = '|l|';
