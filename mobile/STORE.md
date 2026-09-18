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
no in-app purchases and no location tracking.

## Data safety and privacy answers

Both stores ask the same questions. The honest answers:

| Question | Answer |
|---|---|
| Collects personal info | Yes: name, phone number, delivery block, optional email |
| Collects financial info | No. Payment happens in the bank app or on the provider's page |
| Collects location | No |
| Collects contacts, photos, files, messages | No |
| Collects device identifiers | The push notification token only, and only if notifications are allowed |
| Data linked to the user | Name, phone, block, order history |
| Data used for tracking across apps | No |
| Data shared with third parties | No, beyond the hosting, database and email providers acting for us |
| Data encrypted in transit | Yes |
| Users can request deletion | Yes, by WhatsApp message from their own number |

iOS encryption declaration: the app uses only standard HTTPS, so
`ITSAppUsesNonExemptEncryption` is `false` and no export compliance
paperwork is needed. It is already set in `app.json`.

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
