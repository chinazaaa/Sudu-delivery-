import Link from "next/link";

/**
 * The app, offered on the one page where it is actually worth something.
 *
 * The floating card that mentions the app is kept off order pages on
 * purpose: somebody watching their dinner does not want an advert over it.
 * But this is the page they come back to, refreshing, to find out where the
 * food has got to, and that refreshing is exactly what the app would save
 * them. So it is offered here as the answer to the thing they are doing,
 * rather than as a card in the corner of something else.
 *
 * Only while there is still something to be told. Once the food is handed
 * over there is nothing left to notify, and "get the app" under a delivered
 * order is an advert with no argument in it.
 *
 * The three things it says are the three the shop really sends: see
 * lib/push.ts and the stage buttons in admin. Nothing is promised here that
 * a phone would not actually get.
 */
export default function GetTheApp({
  /** Empty where the shop has no app to mention, which keeps this silent. */
  appId = "",
  androidPackage = "",
}: {
  appId?: string;
  androidPackage?: string;
}) {
  if (appId === "" && androidPackage === "") return null;

  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white">
      <p className="min-w-0 text-sm font-bold leading-snug">
        Get live updates on where your order is
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/app"
          className="rounded-full bg-brand px-3.5 py-2 text-sm font-extrabold text-white"
        >
          Get the app
        </Link>
      </div>
    </section>
  );
}
