-- Skincare: the same shop, a different delivery day.
--
-- Everything about a product is already what a menu item is: a name, a price,
-- a picture, a section of a menu it sits under. So skincare is a restaurant
-- row like any other, marked as such, and every part of the machine that
-- knows how to price a line, take a payment and show somebody their order
-- goes on working without being told about it.
--
-- What is different is when it arrives. There is one car a week, on a
-- Saturday, and a cut off on the Saturday morning. Order after it and the
-- next one is a week later: you can still order, it is only the arriving that
-- waits.
alter table restaurants add column if not exists kind text not null default 'food';

do $$
begin
  alter table restaurants drop constraint if exists restaurants_kind_check;
  alter table restaurants add constraint restaurants_kind_check
    check (kind in ('food', 'skincare'));
end $$;

-- A skincare drop is a batch, because the stages, the run sheet and the order
-- page all already understand batches. `kind` is what keeps it out of the run
-- list customers pick a car from.
do $$
begin
  alter table batches drop constraint if exists batches_kind_check;
  alter table batches add constraint batches_kind_check
    check (kind in ('run', 'same_day', 'skincare'));
end $$;

-- One run per slot per day, which is what that rule was always for. It was
-- written when every batch was a run, so a car going out for one person, or a
-- Saturday skincare drop, collided with the run already on that day and was
-- refused: the insert failed and the customer was told the batch no longer
-- existed, which was not what had happened.
alter table batches drop constraint if exists batches_run_date_slot_key;
create unique index if not exists batches_one_run_per_slot
  on batches (run_date, slot) where kind = 'run';

alter table settings add column if not exists skincare_on text not null default '';
-- One flat fee for a skincare order, whatever is in it. A Saturday drop with
-- everybody's parcels in one car is not priced like a Domino's run, and it is
-- not worth a ladder of its own.
alter table settings add column if not exists skincare_fee int not null default 0;
-- Which day the car goes, as a weekday: 0 Sunday through 6 Saturday.
alter table settings add column if not exists skincare_day int not null default 6;
-- The cut off on that morning, and the window the car delivers in. Both in
-- the shop's own words, both editable without a deploy.
alter table settings add column if not exists skincare_cut_off text not null default '08:00';
alter table settings add column if not exists skincare_window text not null default '';
alter table settings add column if not exists skincare_blurb text not null default '';

-- Whose product it is, and the picture it came with.
--
-- Skincare is broad in a way a restaurant menu is not: CeraVe and Bioderma
-- are not two sections of one shelf, they are the first thing somebody
-- narrows by. The brand is a column rather than a category because a product
-- has both, a section and a maker, and folding one into the other loses a
-- filter people actually use.
alter table menu_items add column if not exists brand text not null default '';
-- The file its picture is expected to arrive as, slugified from the title.
-- Matching a photograph to a product by the look of its name is guesswork on
-- two thousand of them; matching it to the filename the export named is not.
alter table menu_items add column if not exists image_file text not null default '';
create index if not exists menu_items_image_file_idx on menu_items (image_file)
  where image_file <> '';

-- Every shelf a product sits on, not just one.
--
-- A shop's own sections overlap on purpose: a cleanser is under Cleansers and
-- under Korean Skin Care, and a shelf that has to pick one loses whichever it
-- did not pick. Kept as "|Cleansers|Korean Skin Care|" so a filter is a
-- substring match on the name with its bars, which cannot half-match
-- "Skin Care" against "Korean Skin Care".
alter table menu_items add column if not exists shelves text not null default '';
