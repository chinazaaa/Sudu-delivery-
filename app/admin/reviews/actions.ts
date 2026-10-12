"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";

/**
 * Put one review on the site, or take it off again.
 *
 * Off for everything until somebody ticks it. Feedback is given in private,
 * to the shop, by a customer answering a question about their dinner, and a
 * five star with a nice sentence in it is still not permission to print
 * their words on the front page.
 */
export async function showReview(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  if (id === "") return;
  const on = String(form.get("on") ?? "") === "yes";

  const { error } = await db().from("orders").update({ show_review: on }).eq("id", id);
  if (error) throw new Error(`Could not save that: ${error.message}`);

  revalidatePath("/admin/reviews");
  revalidatePath("/admin/google");
  revalidatePath("/", "layout");
}
