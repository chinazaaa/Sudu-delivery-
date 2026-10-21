"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
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
 * The list is short on purpose: tick a stop off, and say what its receipt
 * came to. Moving the run along posts to the stage action the shop already
 * uses, so there is one copy of that rule rather than two. Nothing here
 * can cancel an order, move money, change a price on the menu or touch
 * another night.
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

/**
 * What the receipt said, line by line, typed at the counter.
 *
 * The same rule as the shop's own sheet, because it is the same fact:
 * blank means the menu was right, which is what it is most evenings, and
 * clearing a figure puts that line back to the menu price rather than
 * recording a free one.
 *
 * Typed here rather than reconstructed afterwards because here is where it
 * is known. A card alert at ten at night says what a counter charged in
 * total; it cannot say which of six things moved, and that is the only
 * part worth knowing.
 */
export async function sayWhatItCost(form: FormData): Promise<void> {
  const batch = await runForAction(String(form.get("token") ?? ""));
  if (!batch) return;

  const keys = form.getAll("line_key").map(String);
  const typed = form.getAll("paid").map(String);

  for (const [index, key] of keys.entries()) {
    const raw = (typed[index] ?? "").trim();
    const value = Math.round(Number(raw));

    if (raw === "" || !Number.isFinite(value) || value < 0) {
      await db()
        .from("counter_spend")
        .delete()
        .eq("batch_id", batch.id)
        .eq("line_key", key);
      continue;
    }

    await db()
      .from("counter_spend")
      .upsert(
        {
          batch_id: batch.id,
          line_key: key,
          paid: value,
          recovered: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "batch_id,line_key" }
      );
  }

  revalidatePath(`/run/${batch.runner_token}`);
  revalidatePath("/admin", "layout");
}

/**
 * One sentence about what happened at a counter.
 *
 * The whole of the driver's part in a sold out item. The customer almost
 * always says "give me something else for the same money", and what
 * follows is real work: swapping the line so the brand figures count what
 * actually sold, and so the receipt and the order agree. That work is the
 * shop's. Asking somebody standing at a till with a bag in one hand to
 * re-pick and reprice an order is how a run sheet stops being used.
 *
 * Emptying the box clears the note, because a note that cannot be taken
 * back is a note nobody risks writing.
 */
export async function leaveNote(form: FormData): Promise<void> {
  const batch = await runForAction(String(form.get("token") ?? ""));
  if (!batch) return;

  const lineKey = String(form.get("line_key") ?? "").trim();
  if (lineKey === "") return;

  const said = String(form.get("said") ?? "").trim();
  const about = String(form.get("said_about") ?? "").trim();

  if (said === "") {
    await db()
      .from("run_notes")
      .delete()
      .eq("batch_id", batch.id)
      .eq("line_key", lineKey);
  } else {
    await db().from("run_notes").upsert(
      {
        batch_id: batch.id,
        line_key: lineKey,
        said_about: about,
        said,
        // Written again is written again: a corrected note is not a note
        // the shop has already dealt with.
        done_at: null,
      },
      { onConflict: "batch_id,line_key" }
    );
  }

  revalidatePath(`/run/${batch.runner_token}`);
  revalidatePath("/admin", "layout");
}
