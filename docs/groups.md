# Shared deliveries: what broke, and what must not break again

Everything here was a real fault on the live site, found by somebody trying to
order with a friend. The app is getting the same feature, so the same traps are
in front of us a second time. Each line is a rule, then the bug that bought it.

## Identity and lookup

1. **Resolve a link to the group's real id before anything else reads it.**
   A group can be opened by its uuid or its seven character code. Finding the
   group by either and then passing the raw parameter to the seat and order
   lookups found nothing, so the board showed the join popup for ever and
   people tapped Join again and again.

2. **A seat keeps what it was given.** Taking a seat used to upsert
   `phone: ""`, so arriving on the link a second time wiped the number and the
   block off a seat that had them. The close then could not deliver anybody's
   food and shut the group empty.

3. **Only the seat cookie, or the seat token, says who somebody is.** Never
   the group id: every member's browser holds that, so anything trusting it
   let any member act as the leader.

## Closing

4. **Closed is not gone.** A group's clock may end on the run's cut off, and
   the run is marked closed the second it passes. Orders made by the close
   must still ride that run: they are refused only once the shopping has
   started.

5. **A close that orders nothing must change nothing.** It used to mark the
   group closed and leave everybody's food stranded in it. It now rolls back
   and says why.

6. **Every refusal is reported.** A close refused by the seat check or by the
   orders said nothing at all, so the button sat on "Closing…" for ever. In
   admin the same refusal was thrown, which took the whole page to the error
   screen.

7. **Everybody lands on their own order, not just whoever closed it.**
   Closing deletes the seats, so the tie between a person and their order has
   to be written down first: `orders.seat_token`.

## The cart, and asking twice

8. **The cart empties when an order exists, never before.** Emptying it at
   finalise broke adding a drink five minutes later, which is the whole point
   of the fifteen minutes.

9. **Ask once.** Finalising asks for the number, the block, the note and how
   they are paying, in one sheet. The board asking again, with the answers
   already filled in, is two forms for one answer.

10. **Open a form on what the seat already holds.** Not on defaults: a note
    came back blank and the payment choice reset to transfer, so updating food
    quietly rewrote both.

11. **Ask how they are paying.** Group forms defaulted everybody to bank
    transfer, so anybody wanting a card link had to ask for one by hand.

## Money on the screen

12. **Never print a fee the ladder did not set.** A promotion prices delivery
    outright and a closed group hands down a share, and printing "1 to 4
    items, ₦4,000" over a line reading ₦2,000 reads as the page arguing with
    itself.

13. **A late order is never free.** The share was read off the first order in
    the group, which is nothing when the group closed empty, so the first
    person back got free delivery.

14. **Payability follows the shopping, not the clock.** Every group order is
    written moments after the cut off, and calling that "this run has gone"
    told people not to pay for food that was about to be bought.

## What the board may say

15. **First names only.** A group link gets pasted into a chat, so anybody
    holding it can read the board. No numbers, no blocks, no totals of other
    people's food. A browser may see its own seat in full, matched on the seat
    token, and nothing else.

16. **Do not print a countdown that is not one.** Before anybody finalises,
    `closes_at` is the run's own cut off, which can be most of a day away: it
    read "closes in 1053m".

17. **Say the shorter side.** Listing six things to take out of a cart is a
    list nobody reads; naming the one thing that qualifies is the same fact.

## Leaving

18. **Leaving takes you off the group's page**, or the page asks you to join
    the thing you just left.

19. **Past groups are ones an order came out of.** A link somebody opened and
    left is a door into nothing.

## Closing, once and for all

22. **A group closes when whoever made it closes it, or when the fifteen
    minutes run out. Nothing else.** It does not close itself when everybody
    is ready: a car that shuts the moment two people are done locks out a
    third who was still choosing. The board says who everybody is waiting on
    rather than implying something is about to happen on its own.

## Deep links

20. **A link opens the app, and the code stays a code.** sudu.store/g/<code>
    is claimed by the app on both platforms, but the code goes straight to
    the join call and nowhere else: it is swapped for the group's real id the
    moment a seat is taken.

21. **The association files claim nothing until they can claim it properly.**
    Apple and Google both cache what they fetch, so an empty or half-filled
    file is worse than a missing one. Each answers 404 until its credential
    is in the environment.

## Setting the links up

The app declares what it claims in `mobile/app.json`; the site serves what the
platforms check. Two values are needed, and neither can be read off the
repository:

- `APPLE_APP_ID` — the Apple team id and the bundle id together, for example
  `AB12CD34EF.store.sudu.app`. The team id is in the Apple Developer account
  under Membership.
- `ANDROID_CERT_SHA256` — the SHA-256 fingerprint of the key that signs the
  build, from `eas credentials` or Play Console under Setup, App signing. A
  Play build and an EAS build are signed by different keys, and both can be
  listed, separated by commas.

Set both in Vercel, redeploy, then check:

    curl -sS https://sudu.store/.well-known/apple-app-site-association
    curl -sS https://sudu.store/.well-known/assetlinks.json

Both must answer plain JSON over https with no redirect. Android verifies on
install; iOS fetches when the app is installed, so a link tapped before that
opens the website, which is the right fallback.
