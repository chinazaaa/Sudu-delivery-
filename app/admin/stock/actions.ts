"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";

async function assertAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

/**
 * Put back everything that is switched off and has a price on it.
 *
 * This is the morning job the stock page exists for. Kitchens restock
 * overnight, so the first thing somebody does is undo yesterday's switching
 * off, and doing that one row at a time is the reason it does not get done.
 *
 * It works from the same test the card on the page counts with, rather than
 * from a list of ids posted up with the form, for two reasons. A list of two
 * hundred odd uuids in a hidden field is a form big enough to be refused by
 * something in the middle, and more importantly the list would be the one
 * from whenever the page was last drawn: anything switched off in the minute
 * since would be missed, and anything put back by hand would be written
 * again. Asking the database for "off, and priced" at the moment of the tap
 * means the rows that change are exactly the rows the count described.
 *
 * Priced is part of the test and not an afterthought: the menu prints a zero
 * rather than hiding it, so an item on sale at nothing is free food on the
 * website. `toggleItemAvailable` refuses one of those for the same reason,
 * and this refuses the whole set of them.
 *
 * It lives here rather than in the admin's own actions file because it is
 * only ever this page's button.
 */
export async function putBackOnSale(form: FormData): Promise<void> {
  await assertAdmin();

  // Counted before the write, because afterwards there is nothing left to
  // count and the page has to be able to say how many it moved.
  const { count } = await db()
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("available", false)
    .gt("price_food", 0);

  await db()
    .from("menu_items")
    .update({ available: true })
    .eq("available", false)
    .gt("price_food", 0);

  revalidatePath("/admin", "layout");
  updateTag("menu");
  revalidatePath("/", "layout");

  // Back to the page with what happened, in the address, the same way the
  // single switch hands back the item it changed.
  const back = new URLSearchParams();
  const asked = String(form.get("q") ?? "").trim();
  if (asked !== "") back.set("q", asked);
  back.set("put", String(count ?? 0));

  redirect(`/admin/stock?${back.toString()}`);
}
