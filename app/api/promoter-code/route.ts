import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { tidyCode, whyNotACode } from "@/lib/promoter-applications";

export const dynamic = "force-dynamic";

/**
 * Whether a code somebody is typing into the application form is free.
 *
 * The form said "We will tell you if it is taken" and meant later, in the
 * reply, which is a day or two after they have stopped thinking about it.
 * Telling them while the cursor is still in the box is the same promise
 * kept at the moment it is useful.
 *
 * Yes or no on one code, and nothing else. It cannot be asked what codes
 * exist, only whether this one does, which is no more than following
 * sudu.store/s/whatever already tells anybody: a promoter's code is on
 * every link they post.
 *
 * Nothing is reserved here. A code is only really taken at the moment it is
 * approved, and approval picks the next free spelling anyway, so an answer
 * here is true of now rather than a promise about next week. The wording
 * says that.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const asked = new URL(request.url).searchParams.get("code") ?? "";
  const code = tidyCode(asked);

  const why = whyNotACode(code);
  if (why !== "") return NextResponse.json({ code, free: false, why });

  try {
    const { data, error } = await db()
      .from("promoters")
      .select("code")
      .ilike("code", code)
      .limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ code, free: (data ?? []).length === 0, why: "" });
  } catch {
    // Unable to check is not the same as taken, and a form that refuses a
    // code because a database blinked is a form somebody gives up on. The
    // page says nothing in this case rather than something wrong.
    return NextResponse.json({ code, free: null, why: "" });
  }
}
