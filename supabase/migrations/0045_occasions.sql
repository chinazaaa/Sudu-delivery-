-- Occasions and boxes.
--
-- A box is a basket somebody else already filled, at one price with delivery
-- in it. The whole point is that nobody has to choose: "two large pizzas,
-- wings and four drinks, ₦32,900" is an answer, where a menu is a question.
--
-- An occasion is what the box is for. Most have no time of their own and the
-- customer picks a day from what is going. One kind does: a match has a
-- kick-off, everybody has to eat before it, and that fixes the run and the
-- cut-off for everyone at once.
create table if not exists occasions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  blurb text not null default '',
  image_url text not null default '',

  -- Set means the occasion has a time of its own that everybody shares: a
  -- kick-off. Null means they pick a day from the cars that are going.
  happens_at timestamptz,
  -- What that time is called, so the copy reads like a person wrote it:
  -- "kick-off 5:30pm", "it starts at 7pm".
  when_word text not null default 'it starts',
  -- The run a timed occasion rides. One person, one car, so a match day
  -- takes over the day's run rather than adding a second one.
  batch_id uuid references batches(id) on delete set null,
  -- When its boxes stop being orderable on that run. Earlier than the time
  -- itself by however long the shopping takes.
  closes_at timestamptz,

  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists boxes (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references occasions(id) on delete cascade,
  name text not null,
  blurb text not null default '',
  -- "4 to 5 people". Free text, because a box for a couple and a box for a
  -- hostel floor are not points on a scale.
  serves text not null default '',
  image_url text not null default '',

  -- Flat delivery, which is the point. The container ladder would price a
  -- box for five out of existence: eight containers is eight thousand.
  run_fee int not null default 4000,
  car_fee int not null default 6500,

  -- Rides the same car as a box rather than being one: pudding, not dinner.
  is_extra boolean not null default false,

  -- [{ id, menu_item_id, option_ids: [], qty, swaps: [{ menu_item_id,
  --    option_ids: [] }] }]
  -- Swaps live on their line because that is the only place they mean
  -- anything, and each line carries its own id so reordering the list
  -- cannot silently move somebody's alternatives onto another dish.
  lines jsonb not null default '[]'::jsonb,

  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists boxes_occasion_idx on boxes (occasion_id);

-- Same as every other table here: nothing reaches these but the server.
alter table occasions enable row level security;
alter table boxes enable row level security;
