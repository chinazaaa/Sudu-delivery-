-- Halloween, as a dated occasion pinned to the car that can serve it.
--
-- Eighteen occasions exist and one of them has a date. The rest are
-- evergreen themes, which is why none of them is ever urgent: a movie
-- night that is always on is nothing to forward to a group chat. The one
-- that ever worked like an event was Liverpool v Man City, which had a
-- kick-off, ran, and took itself down afterwards.
--
-- This has the two things that one had and the others do not. A date, so
-- the front page strip pointing at it disappears by itself on the first of
-- November rather than advertising a Halloween that has been. And a run,
-- so "order by half eleven on Saturday" is a real deadline attached to a
-- real car: 31 October 2026 is a Saturday, and that run was already on the
-- books, going to Lekki, Ikoyi and Ajah and dropping between half three
-- and half five.
insert into occasions (slug, name, blurb, kind, when_word, happens_at, closes_at, batch_id, active, sort_order)
select 'halloween',
       'Halloween',
       'One car on Saturday afternoon. Order by half eleven and it lands between 3:30 and 5:30.',
       'occasion',
       'Halloween',
       '2026-10-31 17:00:00+00',
       b.cut_off_at,
       b.id,
       true,
       0
from batches b
where b.run_date = '2026-10-31' and b.kind = 'run'
on conflict (slug) do update
set happens_at = excluded.happens_at,
    closes_at = excluded.closes_at,
    batch_id = excluded.batch_id,
    active = true;
