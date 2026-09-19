# Sudu, for the Play Store and the App Store

Everything a listing asks for, written once so both listings say the same
thing. Copy from here rather than retyping it.

## Names and identifiers

| | |
|---|---|
| App name | Sudu |
| Subtitle / short description | Your fav foods, delivered to PAU |
| Bundle ID (iOS) | `store.sudu.app` |
| Package name (Android) | `store.sudu.app` |
| Category | Food and Drink |
| Website | https://sudu.store |
| Privacy policy | https://sudu.store/privacy |
| Support | the WhatsApp number on the website |

## Short description (Play, 80 characters max)

> Your fav foods from Sangotedo, delivered to Pan-Atlantic University.

That is 68 characters.

## Full description

> Sudu brings the food you actually want from Sangotedo and Novare straight
> to Pan-Atlantic University.
>
> We run in batches. Everybody on campus orders from the same run, one rider
> goes out, and the delivery is shared between all of us. That is why it
> costs a fraction of what a single delivery costs, and why you pay one
> delivery fee however many restaurants you order from.
>
> Order from Chicken Republic, KFC, Domino's, Cold Stone, Krispy Kreme and
> more, all in the same bag.
>
> - One delivery fee for the whole order, however many restaurants
> - Order with your friends and split the bill, or pay for everybody
> - Bags are labelled by name, so nobody has to sort it out at the gate
> - Watch your order move: paid, collected, on the road, at your block
> - No account and no password. Your number is who you are
>
> Pay by bank transfer, or ask us for a card link. Your card details never
> touch us.
>
> Sudu has been feeding PAU since 2021.

## Keywords (App Store, 100 characters max)

> food,delivery,PAU,Pan-Atlantic,Lagos,Sangotedo,Novare,campus,group order,chicken

## Age rating

4+ / Everyone. The app has no user-generated content, no ads, no gambling,
no in-app purchases and no location tracking. Screens opened are counted
against a random id the install makes for itself, which is how many people
used the app rather than who they were.

## App Store Connect, filled in

Character limits are Apple's. Counts are what these actually use.

**Name** (30): `Sudu Store`
**Subtitle** (30): `Food delivery to PAU campus` (27)

**Promotional Text** (170, changeable any time with no new build, so keep it
pointed at whatever is newest):

```
Same day delivery is here. Pick a time between 12pm and 6pm and we bring it. Or start a group, send friends the link, and everybody splits one delivery fee.
```
(156)

**Keywords** (100, comma separated, no spaces after the commas because a space
costs a character. Nothing here repeats the name or subtitle, which Apple
already indexes, and no other company's name appears, which is a rejection):

```
lagos,sangotedo,novare,student,university,hostel,restaurant,takeaway,lunch,dinner,order,group,split
```
(99)

**Support URL**: `https://sudu.store/support`
**Marketing URL** (optional): `https://sudu.store`
**Version**: must match `mobile/app.json`, which says `1.0.0`
**Copyright** (200): `2026 Sudu`

**Description** (4000, uses 2191). Restaurant names are deliberately absent:
listing somebody else's trademark in a store listing is a content rights
question nobody needs during a first review.

```
Real restaurant food from Novare and Sangotedo, brought to your block at Pan-Atlantic University.

No account, no password. Pick your food, say where it goes, and pay by transfer.

TWO WAYS TO GET IT

On a run. Everybody's food travels in one car at a set time, which is why a run is the cheap way to eat. Pick the next one and your delivery is a share of the trip, not the whole thing.

Same day. Pick a time instead and a car goes out for you. Choose any slot in the afternoon or evening, with a few hours' notice, and it arrives when you said.

ORDER WITH YOUR FRIENDS

Start a group and send the link. Everybody adds their own food from their own phone and pays for their own food. The delivery is one fee for the whole car, split evenly between all of you.

The more of you there are, the less each of you pays. Nobody is quoted a share until the group closes, so the number you are told is the number you pay.

You can also order for friends on one bill, with each bag labelled by name so the right food reaches the right person.

WHAT YOU GET

Full menus with the sizes, flavours and extras, priced as you choose them, so the total on screen is the total you pay.

A delivery fee that is worked out from how much travels, shown before you commit. No surprise at the end.

Your order followed all the way: paid, being collected, on the road, at your block.

A notification when it moves, if you want one.

Discount codes when we run them.

PAYING

Pay by bank transfer to the account shown on your order, using the short code given to you as the narration so your payment is matched to you straight away. If you would rather pay by card, message us and we will send you a link.

Nothing is charged inside the app.

YOUR ORDERS

Your orders are kept against your phone number. Enter it with your PIN to see everything you have ordered, reorder in one tap, and rate the food once it has arrived.

You can delete everything we hold about you from inside the app, whenever you like.

WHERE WE DELIVER

Pan-Atlantic University, Lagos. If you are somewhere else, the app will tell you rather than take your money.

Questions, or something not right? Message us on WhatsApp. A person answers.
```

## Data safety and privacy answers

Both stores ask the same questions. The honest answers:

| Question | Answer |
|---|---|
| Collects personal info | Yes: name, phone number, delivery block, optional email |
| Collects financial info | No. Payment happens in the bank app or on the provider's page |
| Collects location | No |
| Collects contacts, photos, files, messages | No |
| Collects device identifiers | The push notification token, only if notifications are allowed, and a random id this install makes for itself so screen counts are not double counted |
| Collects app activity | Yes: which screens are opened, counted against that random id and nothing else |
| Data linked to the user | Name, phone, block, order history. Screen counts are not: the random id is never stored beside a name or a number |
| Data used for tracking across apps | No |
| Data shared with third parties | No, beyond the hosting, database and email providers acting for us |
| Data encrypted in transit | Yes |
| Users can request deletion | Yes, by WhatsApp message from their own number |

iOS encryption declaration: the app uses only standard HTTPS, so
`ITSAppUsesNonExemptEncryption` is `false` and no export compliance
paperwork is needed. It is already set in `app.json`.

## What the stores require, and where it is

Apple rejects on these more often than on anything else. Each one is answered
here so nothing is discovered at submission.

| Requirement | Where it is |
|---|---|
| **Account deletion in the app** (Apple 5.1.1(v)) | Home screen, the **You** button, then Delete my data. Deletes from inside the app, no email, no web form |
| Privacy policy at a public URL | https://sudu.store/privacy, and linked on that same screen |
| Privacy questionnaire / nutrition labels | The data safety table above |
| Support URL | https://sudu.store |
| Sign in with Apple (4.8) | Not required. It applies only to apps offering a third-party login such as Google or Facebook. Ours is a phone number and our own PIN |
| Login required to use the app (2.1) | It is not. Anyone can browse and order without signing in. Signing in only brings back past orders |
| In-app purchase (3.1.1) | Not required. Food delivered to a person is a real-world good, which 3.1.3(e) exempts. Payment happens by bank transfer in their own bank app |
| Push permission not required (4.5.4) | Permission is asked only after an order is placed, and the app works fully without it |
| Tracking permission (ATT) | Not needed. The screen counter uses an id this install invents for itself, which never leaves the app with a name or number attached, is not an advertising identifier, and is not shared with anybody. Nothing is tracked across other apps |
| Minimum functionality (4.2) | A real delivery service with a live menu, not a repackaged website |
| Age rating | 4+ / Everyone. No user content, no ads, no gambling |

### Notes to put in App Review Information

Paste this into the review notes field. It answers the two things a reviewer
will otherwise write to you about:

> Sudu delivers food to students at Pan-Atlantic University in Lagos. No
> account is needed to browse or order: a phone number and delivery block are
> taken at checkout, the same as any delivery service.
>
> There is no username or password. After a first order we send a four digit
> PIN by WhatsApp, and entering the phone number and that PIN on the My orders
> screen brings back past orders. To test this without ordering, use phone
> NUMBER and PIN CODE.
>
> Account deletion is on the home screen, under the You button, as Delete my
> data. It deletes the person's name, phone number, delivery address and PIN
> immediately. It is refused only while an order is still out for delivery,
> because the delivery is labelled with their name, and the message on screen
> says so.
>
> Payment is by bank transfer in the customer's own banking app. The food is a
> physical good delivered to the customer, so in-app purchase does not apply
> under 3.1.3(e).

Replace NUMBER and PIN CODE with a real number and PIN before submitting.
Create one by placing a small test order, then read the PIN in Admin under
that customer. Do not use a real customer's PIN.

### Account deletion, exactly what it does

| Deleted outright | Kept |
|---|---|
| The customer record: name, phone, block, PIN | The order rows, with the name replaced by Deleted and the number by an untraceable token |
| Any phone registered for notifications | Totals, so past sales still add up |
| Any cart left behind | |
| Their name and number on group orders | |

The order rows have to stay: they are the record of money that changed hands.
Nothing on them says who the person was. This is what the privacy policy
promises, in the same words.

## Artwork in this repo

| File | Used for |
|---|---|
| `assets/icon.png` | 1024x1024, opaque, square. Both stores |
| `assets/adaptive-icon.png` | Android adaptive foreground, on `#fff1ea` |
| `assets/splash.png` | Launch screen, on `#ff5a1f` |
| `assets/notification-icon.png` | Android notification silhouette |
| `assets/store/feature-graphic.png` | 1024x500. Play Store only, required |

## Screenshots still to take

Neither store will publish without these, and they have to come from a real
build. Run `eas build -p android --profile preview`, install the APK, then
screenshot on the phone. iOS screenshots come from the simulator or a
TestFlight build.

Play needs at least 2 phone screenshots, 16:9 or 9:16, between 320px and
3840px on the long side. The App Store needs 3 to 10 at 6.7 inch
(1290x2796), and reuses them for the smaller sizes.

Take these five, in this order. They tell the story in the order somebody
new reads it:

1. **Home with a live order.** The black strip at the top saying where the
   order has got to, with the restaurants underneath. This is the one screen
   that explains what the app is for.
2. **A restaurant menu.** Cold Stone or Chicken Republic, scrolled so the
   photos show.
3. **An item sheet with its questions open.** A Cold Stone scoop, showing
   cup size and toppings, or a Chicken Republic meal showing its sides.
4. **The cart with a group order.** Two names on the lines, so the split is
   obvious.
5. **Checkout.** The run, the one delivery fee and the total.

Do not put a promotional frame or marketing text around them. Both stores
now prefer plain screenshots, and a plain one never looks out of date.

## Release checklist

1. `cd mobile && npm install`
2. `npx expo-doctor`
3. `eas login` then `eas init` once, which writes the project ID into
   `app.json`
4. `eas build -p android --profile preview` for an APK you can install by
   hand and send to anybody
5. Take the screenshots above
6. `eas build -p android --profile production` for the Play bundle
7. `eas build -p ios --profile production` for TestFlight
8. `eas submit -p android` and `eas submit -p ios`

Bump `version` in `app.json` for anything customers would notice.
`autoIncrement` in the production profile handles the build numbers.
