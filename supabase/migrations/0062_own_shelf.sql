-- A shelf of our own, for the things no restaurant sells.
--
-- A collection needs products no kitchen has on a menu: a birthday cake that
-- is not any bakery's cake, a bunch of flowers, a bucket, a towel. They are
-- real products with real prices, and they belong in a box.
--
-- Rather than invent a second kind of product, they sit on a shelf that the
-- box builder can see and the shop front cannot: kind 'own' is filtered out
-- of the food list, the restaurant pages, the nav and the sitemap the same
-- way skincare is. Adding items to it is the ordinary menu screen in admin.
alter table restaurants drop constraint if exists restaurants_kind_check;

alter table restaurants
  add constraint restaurants_kind_check check (kind in ('food', 'skincare', 'own'));

insert into restaurants (name, slug, kind, closes_at, active, sort_order, area)
select 'Sudu', 'sudu', 'own', '23:59', true, 900, ''
where not exists (select 1 from restaurants where kind = 'own');
