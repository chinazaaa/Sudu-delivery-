-- The second car on today's board, which never carried anything.
--
-- It cannot be deleted: cancelled order 1051 is sitting on it, and a run
-- holding any order refuses to go, which is the right way round. So it is
-- closed instead. A closed car is off the list customers can pick from and
-- out of everything that counts, and the cancelled order keeps its record.
--
-- Same-day cars are left out of the job that closes expired runs, because
-- one is made for a particular afternoon and closing it on a timer would
-- shut a car somebody was still filling. The cost of that is one like this
-- staying open after its afternoon has gone.
update batches
set status = 'closed', stage = 'closed'
where id = 'ea340c4d-6d8f-4f05-98ac-bf85a2122d52' and status = 'open';
