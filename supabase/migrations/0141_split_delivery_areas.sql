-- Sangotedo, Ajah, Lekki and Ikoyi, each with its own fare.
--
-- One far area called "Lekki/Ikoyi" charged one extra for two places half
-- an hour apart. Lekki paid the Ikoyi fare, and Ajah, which is ten minutes
-- past Sangotedo, could not be added at all without being priced as Ikoyi.
--
-- Four thousand, five, six and a half, seven and a half, which is a ladder
-- out of town rather than a price for "far". Lekki keeps the id the old
-- area had, so every restaurant already in it and every run already routed
-- through it stays where it is: an area's id is what a restaurant row
-- holds, and renaming one must not orphan the shops in it.
--
-- Ajah is the one a car of its own can reach, because three hours is the
-- whole promise of one and Ajah is a quarter of an hour away. Lekki and
-- Ikoyi ride a run or they do not come.
update settings
set delivery_areas = '[{"id":"ajah","name":"Ajah","runExtra":1000,"sameDayExtra":1000,"sameDay":true},{"id":"l","name":"Lekki","runExtra":2500,"sameDayExtra":0,"sameDay":false},{"id":"ikoyi","name":"Ikoyi","runExtra":3500,"sameDayExtra":0,"sameDay":false}]';
