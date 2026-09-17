import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/admin-auth";
import { uploadImage } from "@/lib/uploads";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * One photo, one request.
 *
 * The bulk photo screen posts here rather than through a server action,
 * because a server action's body is capped at a megabyte and a phone
 * photograph is rarely that small. Sending them one at a time also means a
 * dropped connection on a mall wifi loses one picture, not twenty.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const form = await request.formData();
  const itemId = String(form.get("item_id") ?? "");
  const photo = form.get("photo");
  if (!itemId || !(photo instanceof File)) {
    return NextResponse.json({ error: "Nothing to upload." }, { status: 400 });
  }

  try {
    const url = await uploadImage(photo, "items");
    if (!url) {
      return NextResponse.json(
        { error: "That file is not an image, or it is over 5MB." },
        { status: 400 }
      );
    }

    const { error } = await db()
      .from("menu_items")
      .update({ image_url: url })
      .eq("id", itemId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ url });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
