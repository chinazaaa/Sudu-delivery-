-- Where to find us, and the line the site opens with. Both are things that get
-- reworded often, so they belong in admin rather than in the code.

alter table settings
  add column instagram_handle    text not null default '',
  add column whatsapp_group_link text not null default '',
  add column pitch_line          text not null default
    'One price covering food and delivery, paid once, before the run. Mix restaurants in one order.';
