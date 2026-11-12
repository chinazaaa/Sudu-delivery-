import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/admin-auth";
import { uploadImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** One loose photo for admin, stored and handed back as an address. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Nothing to upload." }, { status: 400 });
  }
  try {
    const url = await uploadImage(photo, "books");
    if (!url) {
      return NextResponse.json(
        { error: "That file is not an image, or it is over 5MB." },
        { status: 400 }
      );
    }
    return NextResponse.json({ url });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Upload failed." },
      { status: 500 }
    );
  }
}
