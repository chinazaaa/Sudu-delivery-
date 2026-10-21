"use server";

import { revalidatePath } from "next/cache";

import { withGot } from "@/lib/runner";
import { runForAction, setStopCollected } from "@/lib/runner-server";

/**
 * What whoever is driving may do, and nothing else.
 *
 * Every action here takes the token the page was opened with and turns it
 * back into a run before it touches anything. A run id in a hidden field
 * is a run id anybody can retype, so no action here trusts one: the id is
 * read from the run the token opens, and an order is only changed once it
 * is shown to be on that run.
 *
 * The list is one item long on purpose. A driver can tick a stop off, and
 * that is all this file does: moving the run along posts to the stage
 * action the shop already uses, so there is one copy of that rule rather
 * than two. Nothing here can cancel an order, move money, change a price
 * on the menu or touch another night.
 */

/** A stop collected, or put back because the wrong one was ticked. */
export async function markStop(form: FormData): Promise<void> {
  const batch = await runForAction(String(form.get("token") ?? ""));
  if (!batch) return;

  const restaurant = String(form.get("restaurant") ?? "").trim();
  if (restaurant === "") return;

  const collected = form.get("collected") === "true";
  await setStopCollected(batch.id, withGot(batch.runner_got ?? "", restaurant, collected));

  revalidatePath(`/run/${batch.runner_token}`);
  revalidatePath("/admin", "layout");
}
