import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { waitingCounts } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * The numbers on the rail, asked for after the page is on the screen.
 *
 * They used to be read in the admin layout, which put eight questions to a
 * database in Lagos between every tap and anything changing on the screen.
 * The loading screens underneath could not help: they sit inside the
 * layout, so none of them can be drawn until the layout has finished
 * asking. The board felt dead, and somebody tapping Runs tapped it three
 * times.
 *
 * A badge is decoration. It can arrive a moment after the page it is drawn
 * on, and now it does: asked once when the board is opened and again each
 * minute, rather than on every navigation, because the frame it lives in
 * is never torn down.
 */
export async function GET(): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({}, { status: 401 });
  }
  return NextResponse.json(await waitingCounts());
}
