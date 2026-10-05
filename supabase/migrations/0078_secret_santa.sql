-- Secret Santa: a draw a group runs here, and gifts we source and deliver.
--
-- The draw and the wishlists are the product. The money is made sourcing and
-- carrying what people picked, which is the same work the shop already does,
-- for people who never had to be sold to one at a time.
--
-- Everything here is prefixed santa_ and joins to nothing in the shop except
-- a phone number. That is deliberate: a room is not a run, a member is not an
-- order, and the day somebody tries to make a gift into an order so it shows
-- on a run sheet is the day secrecy leaks into a page the whole hostel reads.

-- A room. One group, one budget, one exchange day.
create table if not exists santa_rooms (
  id            uuid primary key default gen_random_uuid(),
  -- Whoever made it, by phone, the same way a customer is known everywhere
  -- else. Not a foreign key to customers: somebody can start a room before
  -- they have ever ordered anything, and being made to buy a pizza first
  -- would be a strange front door.
  creator_phone text not null,
  name          text not null,
  -- What everyone pays, in naira. The whole of it, at join: see santa_members.
  budget        int  not null check (budget > 0),
  -- The day the gifts are handed out, and the day everything is driven to.
  exchange_date date not null,
  -- When joining and editing stop. The creator can bring this forward.
  close_date    date not null,
  -- open: joins and wishlists. closed: assigned, nobody new.
  -- delivered: the work is done. cancelled: refunded, nothing happened.
  status        text not null default 'open'
                check (status in ('open', 'closed', 'delivered', 'cancelled')),
  -- What is in the share link. Long enough that guessing one is not a way in,
  -- because the link is the only thing standing between a stranger and a
  -- room's wishlists.
  share_token   text not null unique,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz,
  -- A room cannot close before it opens, and gifts cannot be exchanged
  -- before the room shuts: both of those are somebody typing a date wrong,
  -- and both would strand a room nobody can finish.
  check (close_date <= exchange_date)
);

create index if not exists santa_rooms_creator_idx on santa_rooms (creator_phone);
create index if not exists santa_rooms_open_idx on santa_rooms (close_date)
  where status = 'open';

-- Somebody in a room. The row exists only once their money has arrived.
--
-- That is the whole defaulter story: there is no "unpaid member" state to
-- forget to check, because an unpaid person is not a member. Every query
-- that draws, assigns, counts or refunds reads this table and is therefore
-- reading paid people only.
create table if not exists santa_members (
  id        uuid not null primary key default gen_random_uuid(),
  room_id   uuid not null references santa_rooms(id) on delete cascade,
  phone     text not null,
  name      text not null,
  -- What they actually paid, which is the room's budget at the moment they
  -- joined. Stored rather than read off the room, because a creator who
  -- edits the budget afterwards must not silently change what somebody
  -- already handed over.
  paid      int  not null check (paid > 0),
  paid_at   timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  -- Someone who left before close. Kept rather than deleted so the refund
  -- has something to hang off, and left out of every count by the partial
  -- unique index below.
  left_at   timestamptz,
  unique (room_id, phone)
);

create index if not exists santa_members_room_idx on santa_members (room_id)
  where left_at is null;

-- What somebody would like. Three to five of them, so the buyer has choice
-- and we have something to fall back on when the first is nowhere in Lagos.
create table if not exists santa_wishes (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references santa_members(id) on delete cascade,
  title     text not null,
  photo_url text not null default '',
  -- A link, or a sentence saying what they mean. Either will do: half of
  -- what students want is a screenshot and a shop name.
  note      text not null default '',
  -- What they think it costs. A guess, for sorting and for warning somebody
  -- that their list is all over the budget. Never used to buy anything.
  est_price int  not null default 0 check (est_price >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists santa_wishes_member_idx on santa_wishes (member_id, sort_order);

-- Who drew whom. Written once, at close, and never written again.
--
-- Regenerating would hand somebody a second look at a different person's
-- list, and anybody who had already seen the first would know both. So the
-- unique indexes below are not tidiness: one giver gives once, one receiver
-- is drawn once, and the row that enforces it is the row nothing may rewrite.
create table if not exists santa_assignments (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references santa_rooms(id) on delete cascade,
  giver_id    uuid not null references santa_members(id) on delete cascade,
  receiver_id uuid not null references santa_members(id) on delete cascade,
  -- Which of the receiver's wishes the giver picked. Null until they do.
  wish_id     uuid references santa_wishes(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Nobody draws themselves.
  check (giver_id <> receiver_id),
  unique (room_id, giver_id),
  unique (room_id, receiver_id)
);

-- The gift itself: finding it, paying for it, carrying it, giving the change
-- back. One per assignment.
create table if not exists santa_orders (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references santa_assignments(id) on delete cascade,
  -- sourcing: looking for it. asking: it costs more than the budget and we
  -- are waiting on the buyer. buying: agreed, not yet bought. bought: in
  -- hand. delivered: gone. stuck: nothing on the list can be found, and a
  -- person has to decide what happens.
  status        text not null default 'sourcing'
                check (status in ('sourcing','asking','buying','bought','delivered','stuck')),
  -- What we actually paid for it. Null until somebody buys something.
  sourced_price int check (sourced_price >= 0),
  -- Set when the buyer agreed to a price above the budget. Nothing over
  -- budget is ever bought without this.
  agreed_at     timestamptz,
  -- What goes back to the buyer: budget less what the gift and any separate
  -- delivery cost. Written when the gift is bought, paid within the week.
  refund        int check (refund >= 0),
  refunded_at   timestamptz,

  -- Who carries it the last step.
  --
  -- we_deliver: it goes with the rest of the room's gifts to the exchange,
  -- and nobody who paid can be let down by anybody but us.
  --
  -- giver: the buyer wants to hand it over themselves, so we deliver it to
  -- the buyer instead, on a day they choose. Worth saying plainly, because
  -- it is the one place the promise changes hands: once it is theirs, the
  -- exchange is between the two of them and we cannot make it happen. The
  -- terms page says so, and so does the screen where they choose it.
  handover      text not null default 'we_deliver'
                check (handover in ('we_deliver', 'giver')),
  -- The day the buyer wants it, when they are handing it over. Null
  -- otherwise, and only ever on or before the room's exchange date: a gift
  -- promised for after the party is a person standing empty-handed at it.
  deliver_on    date,
  -- When the buyer actually took it. Until this is set the gift is still
  -- ours, and the fallback below is still open.
  handed_over_at timestamptz,
  -- A date belongs to a handover and nothing else, either way round.
  check ((handover = 'giver') = (deliver_on is not null)),

  created_at    timestamptz not null default now()
);

-- The two lists somebody actually works from: what is still to be found, and
-- what is going out on a given day. Sorted by the day it is wanted rather
-- than by room, because a day is what gets packed into a car.
create index if not exists santa_orders_open_idx on santa_orders (status)
  where status <> 'delivered';
create index if not exists santa_orders_day_idx on santa_orders (deliver_on)
  where deliver_on is not null and handed_over_at is null;

-- Money held for somebody else, which is not money we have made.
--
-- A ten person room at forty thousand is four hundred thousand naira of other
-- people's cash sitting here for six weeks. It must never reach other_money,
-- because other_money is summed into the profit figure and a room would read
-- as the best week the shop has ever had, right up until it was all paid out
-- again. What is held is santa_members.paid less what has been spent and
-- refunded, and it is worked out from these tables alone.
comment on table santa_members is
  'Money held for a customer, not takings. Never sum paid into profit.';
