-- Who picks the food up at the drop point. Paying and collecting are different
-- questions: one person can pay while four collect their own bags.

do $$ begin create type collect_mode as enum ('leader', 'each');
exception when duplicate_object then null; end $$;

alter table order_groups
  add column if not exists collect_mode collect_mode not null default 'leader';
