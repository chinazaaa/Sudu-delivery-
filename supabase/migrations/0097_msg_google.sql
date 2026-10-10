-- The WhatsApp message that asks for a Google review.
--
-- It was hardcoded, which broke the rule the whole admin is built on: every
-- word a customer reads is editable without a deploy. It joins the other
-- templates, with {google} for the review link.
alter table settings add column if not exists msg_google text not null default '';
