-- With one promoter, every order is theirs: they are the reason anybody is on
-- the site at all. Attribution stops depending on whether the link somebody
-- happened to open still had ?ref= on the end of it.
alter table settings add column if not exists default_promoter_code text not null default '';

notify pgrst, 'reload schema';
