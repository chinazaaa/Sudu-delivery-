"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { fileFrom, uploadImage } from "@/lib/uploads";
import { readContents, readLines } from "@/lib/boxes";
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

    // Which shelf it stands on. Anything unrecognised is a collection,
    // because a standing shelf that should have been an occasion is merely
    // in the wrong place, while an occasion that should have been standing
    // vanishes off the page the day it passes.
    const kind = form.get("kind") === "occasion" ? "occasion" : "collection";

    const fields = {
      slug,
      name,
      kind,
      blurb: String(form.get("blurb") ?? "").trim(),
      custom_hint: String(form.get("custom_hint") ?? "").trim().slice(0, 120),
      when_word: String(form.get("when_word") ?? "").trim() || "it starts",
      item_word:
        String(form.get("item_word") ?? "").trim().slice(0, 24) || "box",
      tag: String(form.get("tag") ?? "").trim().slice(0, 24),
      happens_at: happensAt,
      closes_at: closesAt,
      batch_id: String(form.get("batch_id") ?? "") || null,
      active: form.get("active") === "on",
      sort_order: number(form.get("sort_order"), 100),
      image_url: await picture(form, "occasions"),
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
    const where = kind === "occasion" ? "occasions" : "collections";
    return { done: id ? "Saved." : `Added. It is at /${where}/${slug}.`, error: "" };
  } catch (problem) {
    return { done: "", error: said(problem) };
  }
}

export async function saveBox(_prev: SaveState, form: FormData): Promise<SaveState> {
  try {
    await assertAdmin();

    const name = String(form.get("name") ?? "").trim();
    if (name === "") return { done: "", error: "It needs a name." };

    const occasionId = String(form.get("occasion_id") ?? "");
    if (occasionId === "") {
      return { done: "", error: "Pick which occasion it belongs to." };
    }

    const runFee = number(form.get("run_fee"), 4000);

    /*
     * Two ways to price a box, and the form says which.
     *
     * Off the menu is the original and still right for dinner: a box
     * holding a pizza and a bucket of chicken should cost whatever a pizza
     * and a bucket of chicken cost today, and should get dearer by itself
     * when Domino's puts its prices up.
     *
     * A package is the other kind. A hamper is not a shopping list with a
     * total under it: the shops sell one at a price they chose, and what is
     * in it is a description rather than a receipt. Pricing one off
     * thirty-eight ticked menu lines moved its price every time a tin of
     * milk did, and changing a word of it meant finding thirty-eight
     * products.
     */
    const asPackage = form.get("as_package") === "on";
    const contents = readContents(form.get("contents"));
    const packagePrice = number(form.get("package_price"), 0);

    // Read back through the same reader the shop uses, so anything the
    // builder sends that the shop would not understand is dropped here
    // rather than sitting in the database waiting to empty a box.
    let lines = readLines(parse(String(form.get("lines") ?? "[]")));
    let packageItemId = String(form.get("package_item_id") ?? "") || null;

    if (asPackage) {
      if (packagePrice <= runFee) {
        return {
          done: "",
          error: `A package has to come to more than its own delivery. Put the whole price somebody pays, which is more than ${runFee}.`,
        };
      }
      if (contents.length === 0) {
        return { done: "", error: "Say what is in it, one thing per line." };
      }

      /*
       * The one hidden line a package carries.
       *
       * An order is made of products: the driver's sheet, the receipt and
       * every figure in the books are built on them. A package has no
       * products, so it gets one of its own, in a counter that is switched
       * off and therefore appears on no menu and in no picker. Its price is
       * the package price with the delivery taken out, so the shelf adds
       * the delivery back and arrives at exactly the figure typed here.
       */
      const made = await packageProduct(
        packageItemId,
        name,
        contents,
        packagePrice - runFee
      );
      if (!made) {
        return { done: "", error: "Could not save the package price. Try again." };
      }
      packageItemId = made;
      lines = readLines([
        { id: "package", menu_item_id: made, qty: 1, option_ids: [], swaps: [] },
      ]);
    } else if (lines.length === 0) {
      return { done: "", error: "A box with nothing in it is not a box." };
    }

    /*
     * The address it answers at, where its shelf sells things people search
     * for by name. A hamper is looked up, sent to somebody and come back
     * to, and none of that works at a shelf's address.
     *
     * Kept once it exists. A box renamed from "The Family Hamper" to "The
     * Family Christmas Hamper" keeps its address, because every link
     * already sent says the old one and a page that stops answering is a
     * search result that stops working.
     */
    const slug = await addressFor(
      String(form.get("id") ?? ""),
      occasionId,
      name
    );

    const fields = {
      occasion_id: occasionId,
      slug,
      name,
      blurb: String(form.get("blurb") ?? "").trim(),
      custom_hint: String(form.get("custom_hint") ?? "").trim().slice(0, 120),
      serves: String(form.get("serves") ?? "").trim(),
      // One delivery price, because a box only ever goes on a run. The
      // column stays for the orders that recorded a car before that, and
      // the shop no longer has a figure to fill in.
      run_fee: runFee,
      package_price: asPackage ? packagePrice : null,
      contents: asPackage ? contents.join("\n") : "",
      package_item_id: packageItemId,
      is_extra: form.get("is_extra") === "on",
      active: form.get("active") === "on",
      sort_order: number(form.get("sort_order"), 100),
      lines,
      image_url: await picture(form, "boxes"),
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
  revalidatePath("/collections", "layout");
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

/**
 * The picture this is saved with: a new one where one was chosen, nothing
 * where it was taken off, and otherwise whatever was there already.
 *
 * The forms carry the current one through as a hidden field, so a save that
 * changes a price does not quietly drop the photograph. That left no way to
 * remove one, which is now a tick rather than an admin going into storage.
 */
async function picture(form: FormData, folder: string): Promise<string> {
  const uploaded = await uploadImage(fileFrom(form, "photo"), folder);
  if (uploaded) return uploaded;
  if (form.get("remove_photo") === "on") return "";
  return String(form.get("image_url") ?? "").trim();
}

/**
 * The hidden product behind a package box, made or brought up to date.
 *
 * It lives in a counter that is switched off, so it is on no menu, in no
 * picker and in no search: the only thing that points at it is the one line
 * of its own box. Its description is what is in the package, so a driver's
 * sheet and a receipt both read properly without anybody having entered
 * thirty-eight products.
 */
async function packageProduct(
  existing: string | null,
  name: string,
  contents: string[],
  price: number
): Promise<string | null> {
  const { data: counter } = await db()
    .from("restaurants")
    .select("id")
    .eq("kind", "package")
    .maybeSingle();
  const shop = (counter as { id?: string } | null)?.id;
  if (!shop) return null;

  const fields = {
    restaurant_id: shop,
    name,
    price_food: price,
    available: true,
    description: contents.join(", ").slice(0, 2000),
  };

  if (existing) {
    const { error } = await db().from("menu_items").update(fields).eq("id", existing);
    // Gone from under us, which is possible if somebody deleted it by hand.
    // Making another is better than refusing to save the box.
    if (!error) return existing;
  }

  const { data, error } = await db()
    .from("menu_items")
    .insert(fields)
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/**
 * The web address a box answers at, where its shelf gives its things pages
 * of their own.
 *
 * A shelf says so by having a word for what it sells that is not "box":
 * "hamper" today. Dinner keeps no addresses, because nobody searches for
 * the pizza box, they search for pizza, and a thin page per box would be
 * ten thin pages competing with the shelf that is worth having.
 */
async function addressFor(
  id: string,
  occasionId: string,
  name: string
): Promise<string | null> {
  if (id) {
    const { data } = await db().from("boxes").select("slug").eq("id", id).maybeSingle();
    const had = ((data as { slug?: string } | null)?.slug ?? "").trim();
    if (had !== "") return had;
  }

  const { data: shelf } = await db()
    .from("occasions")
    .select("item_word")
    .eq("id", occasionId)
    .maybeSingle();
  const word = String((shelf as { item_word?: string } | null)?.item_word ?? "box").trim();
  if (word === "" || word === "box") return null;

  const stem =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "hamper";

  // Taken, by something else: a second shelf can easily hold another "the
  // family hamper", and two rows cannot share one address.
  for (let at = 0; at < 20; at += 1) {
    const tryThis = at === 0 ? stem : `${stem}-${at + 1}`;
    const { data } = await db()
      .from("boxes")
      .select("id")
      .eq("slug", tryThis)
      .maybeSingle();
    const taken = (data as { id?: string } | null)?.id;
    if (!taken || taken === id) return tryThis;
  }
  return null;
}
