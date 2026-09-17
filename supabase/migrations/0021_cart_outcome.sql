-- Why a cart was closed. A cart chased and turned down is finished business;
-- one nobody has looked at is not, and the list has to tell them apart.
alter table carts add column if not exists handled_reason text not null default '';

notify pgrst, 'reload schema';
