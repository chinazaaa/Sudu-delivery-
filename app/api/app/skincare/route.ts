import { NextResponse } from "next/server";
import { COUNTERS } from "@/lib/counter";
import { counterShelfJson } from "@/lib/counter-api";

export const dynamic = "force-dynamic";

/**
 * The skincare shelf, for the app.
 *
 * The body of this moved into the counter answer when the pharmacy wanted
 * the same hundred lines with a different prefix. Two copies would have
 * drifted apart the first time one of them gained a field, and the app
 * would have had a shelf that knew about same day and a shelf that did
 * not, for no reason anybody could have explained.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    return await counterShelfJson(COUNTERS.skincare, request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the shelf." },
      { status: 503 }
    );
  }
}
