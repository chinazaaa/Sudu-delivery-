-- Addendum: delivery priced by item count, group orders, and flash fee drops.

-- A flash drop rescues a thin batch. It belongs to one batch and carries the
-- reason the customer is shown, because a bare cut reads as an admission that
-- the normal fee was always too high.
alter table batches
  add column flash_fee        int,
  add column flash_fee_reason text not null default '';

-- One cart, several people's food. The group exists so the fee can be banded
-- on the combined load and split across payers.
create type group_mode as enum ('one_payer', 'split');

create table order_groups (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references batches(id) on delete restrict,
  leader_phone text not null,
  leader_name  text not null,
  hostel       text not null default '',
  mode         group_mode not null,
  created_at   timestamptz not null default now()
);
create index order_groups_batch_idx on order_groups (batch_id);

alter table orders
  add column group_id    uuid references order_groups(id) on delete set null,
  -- Whose food this order is, when it is one share of a split group.
  add column for_name    text,
  -- Set when a group shrinks into a cheaper band after unpaid shares are
  -- dropped. Always in the customer's favour; never a top-up demand.
  add column refund_owed int not null default 0 check (refund_owed >= 0);

create index orders_group_idx on orders (group_id);

-- Bags are labelled by name at the drop point, so each line knows who it is for.
alter table order_items add column for_name text;

alter table order_groups enable row level security;
