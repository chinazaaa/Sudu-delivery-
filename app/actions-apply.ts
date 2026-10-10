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
 *
 * The hostel and the code they want are carried in with what they said,
 * because the applications table has no column for either and the admin
 * list already shows that text in full. It is the same two lines whoever
 * reads it would otherwise have had to ask for on WhatsApp. Columns of
 * their own would be better, and are noted for whoever next touches the
 * table.
 */
export async function askToPromote(
  _previous: ApplyState,
  form: FormData
): Promise<ApplyState> {
  const hostel = String(form.get("hostel") ?? "").trim();
  const wanted = String(form.get("wanted_code") ?? "")
    .trim()
    .replace(/^.*\//, "");
  const theirs = String(form.get("said") ?? "").trim();

  // Joined on one line rather than with newlines, because the admin list
  // prints this in an ordinary paragraph and a newline there collapses to a
  // space anyway.
  const said = [
    hostel && `Hostel or block: ${hostel}`,
    wanted && `Code they want: ${wanted}`,
    theirs,
  ]
    .filter(Boolean)
    .join(" · ");

  const answer = await apply({
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    reach: String(form.get("reach") ?? ""),
    said,
  });

  if (!answer.ok) return { error: answer.why, sent: false };

  revalidatePath("/admin", "layout");
  return { error: null, sent: true };
}
