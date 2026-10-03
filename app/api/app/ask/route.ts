import { NextResponse } from "next/server";
import { askFor } from "@/lib/requests";

export const dynamic = "force-dynamic";

/**
 * Asking us to find something, from the app.
 *
 * The website has had this since the beginning and the app never did, so a
 * search that found nothing was the end of the road on a phone: the one
 * moment somebody has told us exactly what they want and been told we have
 * not got it.
 *
 * Every rule stays on the server, in the same function the website posts to,
 * so the two cannot drift into disagreeing about what counts as a request.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const said = (field: string) => String(body[field] ?? "").trim();

    const result = await askFor({
      wanted: said("wanted"),
      budget: said("budget"),
      name: said("name"),
      phone: said("phone"),
      hostel: said("hostel"),
      note: said("note"),
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send that." },
      { status: 500 }
    );
  }
}
