-- Discount codes, which have nothing to do with the promoter. They are a thing
-- to put in a WhatsApp group on a slow Wednesday: "use FREEDEL and delivery is
-- on us tonight".
create table if not exists coupons (
  code             text primary key,
  /** "delivery" comes off the fee and never more than it; "order" off the total. */
  applies_to       text not null default 'delivery'
                     check (applies_to in ('delivery', 'order')),
  amount           int not null check (amount > 0),
  /** A note to yourself about why it exists. */
  note             text not null default '',
  active           boolean not null default true,
  /** Optional limits: after this date, or after this many uses, it stops. */
  expires_at       timestamptz,
  max_uses         int,
  used             int not null default 0,
  first_order_only boolean not null default false,
  created_at       timestamptz not null default now()
);
alter table coupons enable row level security;

-- What a coupon actually took off an order, for the books.
alter table orders add column if not exists coupon_code text;

notify pgrst, 'reload schema';
