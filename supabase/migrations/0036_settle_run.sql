-- When the books on a run were closed.
--
-- Delivered is about the food; this is about the money. A run that has been
-- driven still has a counter sheet to reconcile, fuel to put in and the odd
-- unpaid order to chase, and until somebody says otherwise there is no way to
-- tell a run that is finished from one that merely arrived.
--
-- Set, the run reads as history: a summary of what it came to, rather than a
-- page of controls for work that is done.
alter table batches add column if not exists settled_at timestamptz;

notify pgrst, 'reload schema';
