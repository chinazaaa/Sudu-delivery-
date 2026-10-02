"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { lagosToday } from "@/lib/time";

const money = (said: FormDataEntryValue | null): number => {
  const digits = String(said ?? "").replace(/[^\d]/g, "");
  return digits === "" ? 0 : Math.min(100_000_000, Number(digits));
};

/**
 * One line of money that did not come through a run.
 *
 * Nothing is validated beyond "it has a name and some money in it", because
 * this is a notebook. The whole reason it exists is that the proper way round
 * was four steps and a lie.
 */
export async function addOtherMoney(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const what = String(form.get("what") ?? "").trim().slice(0, 140);
  const took = money(form.get("took"));
  const spent = money(form.get("spent"));
  if (what === "" || (took === 0 && spent === 0)) return;

  const said = String(form.get("happened_on") ?? "").trim();
  const happened_on = /^\d{4}-\d{2}-\d{2}$/.test(said) ? said : lagosToday();

  const { error } = await db().from("other_money").insert({
    happened_on,
    what,
    who: String(form.get("who") ?? "").trim().slice(0, 80),
    took,
    spent,
    note: String(form.get("note") ?? "").trim().slice(0, 300),
  });
  // Loud rather than quiet: a page that takes a figure and forgets it is
  // worse than one that will not take it, because the figure is gone and
  // nobody knows.
  if (error) throw new Error(`Could not save that: ${error.message}`);

  revalidatePath("/admin/money");
  revalidatePath("/admin");
}

/** Taking one back off, for the ones typed twice or typed wrong. */
export async function removeOtherMoney(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  if (id === "") return;

  await db().from("other_money").delete().eq("id", id);
  revalidatePath("/admin/money");
  revalidatePath("/admin");
}
