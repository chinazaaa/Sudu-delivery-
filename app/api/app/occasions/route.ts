import { NextResponse } from "next/server";

import { appShelves } from "@/lib/app-doors";

export const dynamic = "force-dynamic";

/**
 * The occasions, for the app's list.
 *
 * The same cards the home screen draws, built in one place so the two
 * cannot drift: a shelf that gained a price on one screen and not the
 * other would be nobody's deliberate decision. See lib/app-doors.
 */
export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ occasions: await appShelves() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read those." },
      { status: 500 }
    );
  }
}
