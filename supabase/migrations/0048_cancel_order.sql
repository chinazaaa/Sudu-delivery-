-- Cancelling an order that was never paid for.
--
-- A test order, a duplicate, somebody who changed their mind before any
-- money moved. Deleting it would take the row out of the books and leave a
-- gap in the numbering that nobody could explain later; cancelled, it still
-- exists and says what happened, and is left out of every count.
--
-- Only ever an order nobody has paid for. Money that has moved needs a
-- refund, which is a different thing and already has its own status.
alter type order_status add value if not exists 'cancelled';
