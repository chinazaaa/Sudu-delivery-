-- A tool nobody could reach, that anybody could call.
--
-- move_customer_phone(old, new) rewrote a customer's number across every
-- table that holds one: orders, carts, requests, groups, wishes, Santa
-- rooms, push devices. Nothing in the app ever called it. It was written
-- for an admin screen that was never built.
--
-- Left in place it was worse than clutter. It was SECURITY DEFINER, so it
-- ran as its owner and row level security did not apply to it, and EXECUTE
-- was granted to anon, which is the role the key in every browser bundle
-- carries. Anyone who guessed the name could have called it with somebody
-- else's number and their own, and walked off with that person's whole
-- history: their orders, their PIN, their groups, the lot. A phone number
-- is who you are on this shop, and this was a public function for changing
-- whose number it was.
--
-- The grants are already revoked in production, which is the half that
-- shuts the door. This is the half that takes the door away.
--
-- Dropped rather than kept and locked, because the job it did is a job for
-- an admin page with a person behind it. The body is in this project's
-- history if that page is ever built: the logic in it was sound, and it was
-- the door that was wrong rather than the room.
revoke all on function public.move_customer_phone(text, text) from anon, authenticated, public;
drop function if exists public.move_customer_phone(text, text);

-- The same door, left open on a much smaller room. rls_auto_enable() is
-- housekeeping that turns row level security on for new tables, and there
-- is no reason a browser should be able to call it. Kept, because it is
-- used; revoked, because it is not used from out there.
revoke all on function public.rls_auto_enable() from anon, authenticated, public;
