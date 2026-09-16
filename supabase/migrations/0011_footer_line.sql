-- The line at the bottom of every page, editable like the rest of the copy.

alter table settings
  add column if not exists footer_line text not null default
    'Sangotedo to Pan-Atlantic University. Paid orders only, refunds the same night.';
