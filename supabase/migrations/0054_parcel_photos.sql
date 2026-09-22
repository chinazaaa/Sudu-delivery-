-- Photographs of a parcel, at the two moments that matter.
--
-- Five seconds at the counter and five at the door kills the argument about
-- whether it arrived damaged. Its own table rather than columns on the order,
-- because there is rarely one photograph: a bag from two angles and the
-- receipt stapled to it is three.
--
-- Only ever for a parcel. Nobody photographs a bag of jollof.
create table if not exists parcel_photos (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  -- 'collected' when it was picked up, 'handed' when it was given over.
  kind       text not null check (kind in ('collected', 'handed')),
  url        text not null,
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists parcel_photos_order_idx
  on parcel_photos (order_id, created_at);

alter table parcel_photos enable row level security;
