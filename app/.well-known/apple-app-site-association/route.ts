import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * What iOS reads to believe the app owns these links.
 *
 * Apple fetches this once, over https, with no redirects and no .json on the
 * end, and it must be served as plain JSON. Get any of that wrong and the
 * link simply opens Safari, with nothing anywhere saying why.
 *
 * The app id is TEAMID.bundleId, and the team id is the only part nobody can
 * read off the repository, so it comes from the environment: APPLE_APP_ID,
 * for instance "AB12CD34EF.store.sudu.app". Until it is set this answers 404
 * rather than a file claiming nothing, because a half-filled one is worse
 * than none: iOS caches it.
 */
export function GET(): NextResponse {
  const appId = (process.env.APPLE_APP_ID ?? "").trim();
  if (!appId) {
    return NextResponse.json(
      { error: "APPLE_APP_ID is not set, so there is nothing to claim yet." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: [appId],
            components: [
              // A group link, which is the one that matters: it arrives in a
              // chat and should open the car, not a web page.
              { "/": "/g/*", comment: "a shared delivery" },
              { "/": "/o/*", comment: "an order" },
              { "/": "/r/*", comment: "a restaurant" },
            ],
          },
        ],
      },
      // Nothing else is claimed. Web credentials and app clips are their own
      // agreements and are not made by accident.
    },
    { headers: { "content-type": "application/json" } }
  );
}
