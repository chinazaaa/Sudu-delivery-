-- The reassurance lines under the buy button. Wording changes often, so it
-- belongs in admin rather than in the code.

alter table settings
  add column if not exists product_notes text not null default
    'Collected from {restaurant}, Sangotedo, on the next run.
Delivery is charged once per order, by how many containers it is.
Wrong or missing item, refunded in full the same night.';
