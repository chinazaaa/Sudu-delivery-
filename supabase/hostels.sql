-- Where we deliver: the blocks a customer picks from at checkout.
--
-- With nothing on this list a customer types their own, which is how one
-- hostel ends up spelt four ways on a run sheet.
--
-- Safe to run twice. A block already on the list keeps its place in the order
-- and is switched back on if it had been hidden. Nothing else is touched, and
-- no past order changes: every order keeps the block it was placed with.

insert into hostels (name, sort_order) values ('Cooperative Kings', 10)
  on conflict (name) do update set active = true;
insert into hostels (name, sort_order) values ('Pod Living', 20)
  on conflict (name) do update set active = true;
insert into hostels (name, sort_order) values ('Faith Hostel', 30)
  on conflict (name) do update set active = true;
insert into hostels (name, sort_order) values ('Amethyst Hall', 40)
  on conflict (name) do update set active = true;
insert into hostels (name, sort_order) values ('Emerald', 50)
  on conflict (name) do update set active = true;
insert into hostels (name, sort_order) values ('Enterprise Development Centre', 60)
  on conflict (name) do update set active = true;

select name, sort_order, active from hostels order by sort_order, name;
