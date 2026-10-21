-- A line of what actually happened, left at the counter for the shop.
--
-- About one stop in ten the counter is out of something. The customer
-- almost always says "give me something else for the same money", and the
-- shop then has real work to do: swap the line, so what sold is what the
-- brand figures count, and so the receipt and the order agree.
--
-- That work is not the driver's. She is standing at a till with a bag in
-- one hand; asking her to re-pick an item, reprice it and re-save an order
-- is how a sheet stops being used. So she writes one sentence and carries
-- on, and the note is the shop's signal that this run needs ten minutes
-- afterwards.
--
-- Its own table rather than a column on counter_spend, which is where the
-- price for a line already lives. A blank price there means "the menu was
-- right" and deletes the row, and a rule that quietly deletes a note
-- somebody wrote at a counter is the wrong kind of clever.
create table if not exists run_notes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  -- The counter line it is about, keyed exactly as the run sheet groups
  -- them, so a note and its line are the same line by construction.
  line_key text not null,
  -- What the line is called, kept as it was written. The key carries the
  -- name already, but reading a key is not reading a sentence, and this
  -- is read by somebody deciding what to fix.
  said_about text not null default '',
  said text not null,
  created_at timestamptz not null default now(),
  -- When the shop put it right. Null is the whole point of the table: it
  -- is the list of what still needs doing.
  done_at timestamptz
);

create index if not exists run_notes_batch_idx on run_notes (batch_id);
create unique index if not exists run_notes_line_idx on run_notes (batch_id, line_key);

comment on table run_notes is
  'What happened at a counter, written by whoever was there, for the shop to put right afterwards. Null done_at means it still needs doing.';
