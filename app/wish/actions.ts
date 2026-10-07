"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FROM_COOKIE } from "@/lib/came-from";
import { wishFor } from "@/lib/wishes";

/**
 * One box, one button.
 *
 * Where they came from is read from the cookie rather than asked, because
 * the whole point of this page is that it asks for one thing.
 */
export async function wishAction(form: FormData): Promise<void> {
  const wanted = String(form.get("wanted") ?? "");
  const phone = String(form.get("phone") ?? "");
  const cameFrom = (await cookies()).get(FROM_COOKIE)?.value ?? "";

  const done = await wishFor({ wanted, phone, cameFrom });
  if (!done.ok) redirect(`/wish?problem=${encodeURIComponent(done.error)}`);
  redirect("/wish?thanks=1");
}
