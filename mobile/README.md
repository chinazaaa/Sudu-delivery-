# Sudu, the app

The same shop as sudu.store, as a real app. Expo and React Native, TypeScript.

## Where everything comes from

Nothing here holds a database key. The app reads and writes through the
website's own endpoints under `/api/app`, so:

- menus, photographs, prices, the questions a meal asks, which runs are open
  and what delivery costs are all **edited in admin** and appear here with no
  app release;
- an order is priced and checked by the same code that prices a web order, so
  a phone cannot talk itself into a cheaper one;
- only the screens are written twice.

Point it somewhere else by editing `expo.extra.api` in `app.json`.

## Running it

```
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. For push notifications you need a
real device, not a simulator.

## Notifications

The app asks to notify **after the first order is placed**, not on the first
screen, because a permission box before anybody has ordered is the fastest way
to be told no. The token is registered against that phone number, and the
server sends through Expo (`lib/push.ts` in the web project).

Today it sends when an order is marked paid. Anything else worth telling
somebody, for example "your food is on the way", hangs off the same function.

## Building for the stores

```
npx expo install expo-dev-client
npx eas build --platform android
npx eas build --platform ios
```

Android needs a Play Console account, iOS an Apple Developer account. Neither
is needed to run it on your own phone with Expo Go.

## What is not here yet

- Order again, and the list of past orders, which the endpoints already serve.
- Group ordering and splitting a bill, which the website does.
- A code box at checkout.
