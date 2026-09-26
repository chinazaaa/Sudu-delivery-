-- The example in the "want it changed?" box, per collection.
--
-- One example had to serve every box there is, so a cleaning box offered
-- "vanilla cake, 12 inches, write Happy Birthday Ada, red roses if you have
-- them". An example that has nothing to do with what is on the screen is
-- worse than no example: it reads as a form somebody built for a different
-- shop.
alter table occasions
  add column if not exists custom_hint text not null default '';
