import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** Leaving a group, or having just ordered in one. The browser forgets it and
 *  so must the server, or the next order quietly joins the last group. */
export async function POST(): Promise<NextResponse> {
  (await cookies()).delete("sudu_group");
  return NextResponse.json({ ok: true });
}
