-- Two misspellings on one product, which is a different thing from a shout.
--
-- "Orinary" is The Ordinary, and the serum is Retinol 1% in Squalane, not
-- Squalene: squalene is the unstable form the brand deliberately does not
-- use. Both came off the source menu, and both made the one product on the
-- shelf that nobody could find by typing the brand into search.
update menu_items
set name = 'The Ordinary Retinol 1% in Squalane 30ML'
where name = 'The Orinary Retinol 1% in Squalene 30ML';
