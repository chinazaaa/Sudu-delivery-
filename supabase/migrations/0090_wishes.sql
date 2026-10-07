-- One box: what do you wish you could order?
--
-- There is already a page for asking us to go and find something, and it
-- asks for a budget, a name, a number, a block and a note, because by then
-- somebody has decided to buy and we have to be able to quote them. This is
-- the other end of that: a question put to somebody who has decided nothing,
-- on a status they scrolled past, and every field after the first is a
-- reason to close the tab.
--
-- So it keeps the sentence and nothing else. A number is optional, for
-- somebody who wants telling when we get it; the channel is kept because
-- knowing which promoter's status produced the ideas is half of what the
-- exercise is for.
create table if not exists wishes (
  id         uuid primary key default gen_random_uuid(),
  wanted     text not null,
  phone      text not null default '',
  came_from  text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wishes_newest on wishes (created_at desc);
