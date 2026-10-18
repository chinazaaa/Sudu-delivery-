-- The pharmacy counter: a shop of its own, on its own car.
--
-- The same eight settings the skincare shelf has, because it is the same
-- arrangement with a different shelf in it: one car on a chosen day, a cut
-- off that morning, a delivery ladder of its own, and a line saying where
-- the stock was bought. Its own columns rather than a share of skincare's,
-- so turning one off cannot close the other.
alter table settings add column if not exists pharmacy_on text not null default '';
alter table settings add column if not exists pharmacy_fee integer not null default 0;
alter table settings add column if not exists pharmacy_day integer not null default 6;
alter table settings add column if not exists pharmacy_cut_off text not null default '08:00';
alter table settings add column if not exists pharmacy_window text not null default '';
alter table settings add column if not exists pharmacy_blurb text not null default '';
alter table settings add column if not exists pharmacy_bands text not null default '';
alter table settings add column if not exists pharmacy_promise text not null default '';
