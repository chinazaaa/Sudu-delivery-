-- A picture with the ask.
--
-- Half of what people want is easier shown than said: a cracked screen, a
-- hairstyle, the model sticker on the bottom of a laptop, a garment with
-- the damage in it. WhatsApp has always carried pictures, so the form was
-- the poorer of the two ways to ask. Now it is not.
alter table custom_requests add column if not exists photo_url text not null default '';
