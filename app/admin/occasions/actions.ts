"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { fileFrom, uploadImage } from "@/lib/uploads";
import { readLines } from "@/lib/boxes";
import { lagosInstant } from "@/lib/time";

export type SaveState = { done: string; error: string };

async function assertAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

/**
 * Occasions and boxes, saved from admin.
 *
 * Every one of these hands back what happened rather than throwing, because
 * a throw from a server action is the error boundary, and "that address is
 * taken" is exactly the sentence that gets lost in one.
 */
export async function saveOccasion(
  _prev: SaveState,
  form: FormData
): Promise<SaveState> {
  try {
    await assertAdmin();

    const name = String(form.get("name") ?? "").trim();
    if (name === "") return { done: "", error: "It needs a name." };

    const slug = slugify(String(form.get("slug") ?? "") || name);
    if (slug === "") return { done: "", error: "That name makes no web address." };

    // A time everybody shares, typed as a day and an hour in Lagos rather
    // than as an instant, because nobody thinks in instants.
    const day = String(form.get("happens_on") ?? "").trim();
    const time = String(form.get("happens_time") ?? "").trim();
    const happensAt = day !== "" && time !== "" ? at(day, time) : null;

    const closesOn = String(form.get("closes_on") ?? "").trim() || day;
    const closesTime = String(form.get("closes_time") ?? "").trim();
    const closesAt =
      happensAt && closesOn !== "" && closesTime !== "" ? at(closesOn, closesTime) : null;

    if (happensAt && closesAt && closesAt >= happensAt) {
      return { done: "", error: "Orders have to close before it starts, not after." };
    }

    const fields = {
      slug,
      name,
      blurb: String(form.get("blurb") ?? "").trim(),
      when_word: String(form.get("when_word") ?? "").trim() || "it starts",
      happens_at: happensAt,
      closes_at: closesAt,
      batch_id: String(form.get("batch_id") ?? "") || null,
      active: form.get("active") === "on",
      sort_order: number(form.get("sort_order"), 100),
      image_url:
        (await uploadImage(fileFrom(form, "photo"), "occasions")) ??
        String(form.get("image_url") ?? "").trim(),
    };

    const id = String(form.get("id") ?? "");
    const { error } = id
      ? await db().from("occasions").update(fields).eq("id", id)
      : await db().from("occasions").insert(fields);

    if (error) {
      return {
        done: "",
        error: error.message.includes("slug")
          ? `Something else already uses "${slug}". Give this one a different web address.`
          : error.message,
      };
    }

    touch();
    return { done: id ? "Saved." : `Added. It is at /occasions/${slug}.`, error: "" };
  } catch (problem) {
    return { done: "", error: said(problem) };
  }
}

export async function saveBox(_prev: SaveState, form: FormData): Promise<SaveState> {
  try {
    await assertAdmin();

    const name = String(form.get("name") ?? "").trim();
    if (name === "") return { done: "", error: "It needs a name." };

    // Read back through the same reader the shop uses, so anything the
    // builder sends that the shop would not understand is dropped here
    // rather than sitting in the database waiting to empty a box.
    const lines = readLines(parse(String(form.get("lines") ?? "[]")));
    if (lines.length === 0) {
      return { done: "", error: "A box with nothing in it is not a box." };
    }

    const occasionId = String(form.get("occasion_id") ?? "");
    if (occasionId === "") {
      return { done: "", error: "Pick which occasion it belongs to." };
    }

    const fields = {
      occasion_id: occasionId,
      name,
      blurb: String(form.get("blurb") ?? "").trim(),
      serves: String(form.get("serves") ?? "").trim(),
      run_fee: number(form.get("run_fee"), 4000),
      car_fee: number(form.get("car_fee"), 6500),
      is_extra: form.get("is_extra") === "on",
      active: form.get("active") === "on",
      sort_order: number(form.get("sort_order"), 100),
      lines,
      image_url:
        (await uploadImage(fileFrom(form, "photo"), "boxes")) ??
        String(form.get("image_url") ?? "").trim(),
    };

    const id = String(form.get("id") ?? "");
    const { error } = id
      ? await db().from("boxes").update(fields).eq("id", id)
      : await db().from("boxes").insert(fields);
    if (error) return { done: "", error: error.message };

    touch();
    return { done: "Saved.", error: "" };
  } catch (problem) {
    return { done: "", error: said(problem) };
  }
}

/**
 * Taking one away.
 *
 * Deleting an occasion takes its boxes with it, which is what the foreign
 * key says and what anybody would expect. No order points at either, so
 * nothing anybody has already bought is touched.
 */
export async function removeOccasion(form: FormData): Promise<void> {
  await assertAdmin();
  await db().from("occasions").delete().eq("id", String(form.get("id") ?? ""));
  touch();
}

export async function removeBox(form: FormData): Promise<void> {
  await assertAdmin();
  await db().from("boxes").delete().eq("id", String(form.get("id") ?? ""));
  touch();
}

function touch(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/occasions", "layout");
  revalidatePath("/");
}

/** A day and a time in Lagos, as the instant it really is. */
const at = (day: string, time: string): string => {
  const [hour, minute] = time.split(":").map(Number);
  return lagosInstant(day, hour || 0, minute || 0);
};

const number = (raw: FormDataEntryValue | null, fallback: number): number => {
  const value = Math.round(Number(String(raw ?? "").trim()));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const said = (problem: unknown): string =>
  problem instanceof Error && problem.message !== ""
    ? problem.message
    : "Could not save that just now.";

/** "Liverpool v Man City" becomes "liverpool-v-man-city". */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
