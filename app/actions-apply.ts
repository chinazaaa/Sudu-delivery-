"use server";

import { revalidatePath } from "next/cache";
import { apply } from "@/lib/promoter-applications";

export type ApplyState = { error: string | null; sent: boolean };

/**
 * Somebody asking to promote the shop.
 *
 * Its own file rather than the admin's actions, because nothing here is
 * behind a password: it is posted by whoever is reading the page, and it
 * must never sit beside anything that assumes an admin is calling it.
 */
export async function askToPromote(
  _previous: ApplyState,
  form: FormData
): Promise<ApplyState> {
  const answer = await apply({
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    reach: String(form.get("reach") ?? ""),
    said: String(form.get("said") ?? ""),
  });

  if (!answer.ok) return { error: answer.why, sent: false };

  revalidatePath("/admin", "layout");
  return { error: null, sent: true };
}
