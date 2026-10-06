"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCustomer, customerDetails, signInCustomer } from "@/lib/customer-auth";
import { ensureCustomer } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { fileFrom, uploadImage } from "@/lib/uploads";
import { db } from "@/lib/supabase";
import {
  addWish,
  agreeToPayMore,
  closeRoom,
  createRoom,
  editWish,
  joinRoom,
  pickWish,
  removeWish,
  leaveRoom,
  memberIn,
  removeMember,
  roomByToken,
  setHandover,
  setHostel,
  unpickWish,
} from "@/lib/santa";

/**
 * Everything a room can be asked to do.
 *
 * Who somebody is comes from the signed cookie, never from a form field.
 * A room's secret is which name you drew, and a phone number typed into a
 * box is not an identity: anyone who guessed a member's number could read
 * their match off the page. So: joining writes the number down, and
 * everything after it reads the cookie.
 */

const said = (form: FormData, key: string): string => String(form.get(key) ?? "").trim();

export async function createRoomAction(form: FormData): Promise<void> {
  const phone = normalisePhone(said(form, "phone"));
  const name = said(form, "name");
  if (!phone || name === "") redirect("/santa?problem=Give+your+number+and+a+name");

  // A creator is a customer like anybody else, and this is where their PIN
  // comes from. Without it they could make a room and then have no way to
  // prove they are the one who made it.
  await ensureCustomer({ phone, name: said(form, "yourName") || name });

  const made = await createRoom({
    creatorPhone: phone,
    name,
    budget: Number(said(form, "budget")),
    exchangeDate: said(form, "exchangeDate"),
    closeDate: said(form, "closeDate"),
  });

  if (!made.ok) redirect(`/santa?problem=${encodeURIComponent(made.error)}`);
  redirect(`/santa/${made.room.shareToken}`);
}

/**
 * Join a room.
 *
 * Costs nothing and takes nobody's money: joining puts you in the room and
 * paying puts you in the draw, and those are two different days. What it
 * hands back is a reference to put in the transfer, which is the only way
 * a statement full of identical amounts can be told apart.
 */
export async function joinRoomAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) redirect("/santa?problem=That+link+does+not+point+at+a+room");

  const phone = normalisePhone(said(form, "phone"));
  const name = said(form, "name");
  if (!phone || name === "") {
    redirect(`/santa/${token}?problem=${encodeURIComponent("Give your number and your name.")}`);
  }

  const hostel = said(form, "hostel");

  // Whether we knew this number before they typed it, asked before the row
  // is written. It decides whether joining is enough to be them.
  const knownBefore = await customerDetails(phone);

  await ensureCustomer({ phone, name, hostel });
  const joined = await joinRoom({ roomId: here.id, phone, name, hostel });

  revalidatePath(`/santa/${token}`);
  if (!joined.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(joined.error)}`);

  /*
   * Joining has to leave them signed in, or the room has no idea who they
   * are the second it reloads: it shows the join form again, forever, to
   * somebody already standing in the room.
   *
   * A number nobody has ever ordered under guards nothing, so typing it is
   * enough to be it. A number we already know guards a name, a block and
   * every order ever placed under it, and a typed number is not an identity
   * here and never has been. That one signs in with its PIN and comes
   * straight back to the room, already joined.
   */
  const signedIn = await currentCustomer();
  if (!knownBefore) await signInCustomer(phone);
  if (knownBefore && signedIn !== phone) {
    redirect(`/orders?next=${encodeURIComponent(`/santa/${token}`)}`);
  }
  redirect(`/santa/${token}?joined=1`);
}

/** Whoever is signed in, or nobody. */
async function me(token: string): Promise<string> {
  const phone = await currentCustomer();
  if (!phone) redirect(`/orders?next=${encodeURIComponent(`/santa/${token}`)}`);
  return phone;
}

/**
 * The pictures off one of these forms.
 *
 * A screenshot is how half of what students want is described, so these are
 * the fields that matter most on the form, and two of them because a thing
 * has a front and a back. Failing to upload must not lose the rest of what
 * they typed, and an empty slot must stay empty rather than shuffling the
 * second picture into the first: the slots are how an edit knows which one
 * is being replaced.
 */
async function pictures(form: FormData): Promise<string[]> {
  const one = async (field: string): Promise<string> => {
    try {
      return (await uploadImage(fileFrom(form, field), "santa")) ?? "";
    } catch {
      return "";
    }
  };
  return [await one("photo"), await one("photo2")];
}

export async function addWishAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const photos = await pictures(form);

  const done = await addWish({
    roomId: here.id,
    phone: await me(token),
    title: said(form, "title"),
    photos,
    note: said(form, "note"),
    estPrice: Number(said(form, "estPrice") || 0),
  });

  revalidatePath(`/santa/${token}/wishlist`);
  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}/wishlist?problem=${encodeURIComponent(done.error)}`);
  // Back to the list they just added to, not the top of the page. The form
  // is the bottom of a long page, and a submit that scrolls you away from
  // it costs a scroll every single time.
  redirect(`/santa/${token}/wishlist?saved=added#list`);
}

export async function removeWishAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  await removeWish({
    roomId: here.id,
    phone: await me(token),
    wishId: said(form, "wishId"),
  });
  revalidatePath(`/santa/${token}/wishlist`);
  revalidatePath(`/santa/${token}`);
  redirect(`/santa/${token}/wishlist?saved=gone#list`);
}

export async function closeRoomAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  // Only the person who made it. Closing draws the room and cannot be
  // undone, so it is not something a member can do to everybody else.
  const phone = await me(token);
  if (phone !== here.creatorPhone) {
    redirect(`/santa/${token}?problem=${encodeURIComponent("Only whoever made the room can close it.")}`);
  }

  const done = await closeRoom(here.id);
  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
}

export async function pickWishAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await pickWish({
    roomId: here.id,
    phone: await me(token),
    wishId: said(form, "wishId"),
  });

  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
}

/** Taking one of them back off. */
export async function unpickWishAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await unpickWish({
    roomId: here.id,
    phone: await me(token),
    wishId: said(form, "wishId"),
  });

  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
}

export async function handoverAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await setHandover({
    roomId: here.id,
    phone: await me(token),
    byGiver: said(form, "byGiver") === "1",
    deliverOn: said(form, "deliverOn"),
  });

  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
}

/**
 * The buyer says yes to paying the difference.
 *
 * Theirs to give, not something admin ticks for them: the reason the rule
 * exists at all is that somebody is being asked for more than they agreed
 * to hand over.
 */
export async function agreeAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await agreeToPayMore({ roomId: here.id, phone: await me(token) });
  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
}

/** Change something already on your list, keeping its picture and place. */
export async function editWishAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const photos = await pictures(form);

  const done = await editWish({
    roomId: here.id,
    phone: await me(token),
    wishId: said(form, "wishId"),
    title: said(form, "title"),
    note: said(form, "note"),
    estPrice: Number(said(form, "estPrice") || 0),
    photos,
  });

  revalidatePath(`/santa/${token}/wishlist`);
  if (!done.ok) redirect(`/santa/${token}/wishlist?problem=${encodeURIComponent(done.error)}`);
  redirect(`/santa/${token}/wishlist?saved=changed#list`);
}

/** Where this person's own gift should be driven to. */
export async function hostelAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await setHostel({
    roomId: here.id,
    phone: await me(token),
    hostel: said(form, "hostel"),
  });

  revalidatePath(`/santa/${token}/wishlist`);
  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}/wishlist?problem=${encodeURIComponent(done.error)}`);
  redirect(`/santa/${token}/wishlist?saved=block`);
}

/** Walking away from a room, before it is drawn. */
export async function leaveRoomAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await leaveRoom({ roomId: here.id, phone: await me(token) });
  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
  redirect(`/santa/${token}?left=1`);
}

/**
 * The person who made the room taking somebody out of it.
 *
 * Theirs to do, because they are the one being asked by the eleven other
 * people why the room still has not been drawn. Only while it is open, and
 * never themselves: that is what leaving is for, and they cannot leave.
 */
export async function kickMemberAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const phone = await me(token);
  if (phone !== here.creatorPhone) {
    redirect(`/santa/${token}?problem=${encodeURIComponent("Only whoever made the room can do that.")}`);
  }

  const them = said(form, "memberId");
  const mine = await memberIn(here.id, phone);
  if (mine && them === mine.id) {
    redirect(`/santa/${token}?problem=${encodeURIComponent("You made this room, so message us to close it.")}`);
  }

  const done = await removeMember(them);
  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
  redirect(`/santa/${token}?removed=1`);
}

/**
 * Something off our own shelf, straight onto a list.
 *
 * The name, the price and the picture are read here rather than posted,
 * because a form field is a thing anybody can type and this one would be
 * saying what we charge. All the browser sends is which item it was.
 */
export async function addFromMenuAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const itemId = said(form, "itemId");
  const { data: item } = await db()
    .from("menu_items")
    .select("id, name, price_food, image_url, available")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.available === false) {
    redirect(`/santa/${token}/pick?problem=${encodeURIComponent("We are not selling that at the moment.")}`);
  }

  const done = await addWish({
    roomId: here.id,
    phone: await me(token),
    title: String(item.name ?? ""),
    photos: [String(item.image_url ?? "")],
    // Nothing: it is ours, and every screen that reads it says so itself.
    // Writing it into the note put "From Sudu" twice on the same card and
    // into the box asking how to know it is the right one.
    note: "",
    estPrice: Number(item.price_food ?? 0),
    itemId: String(item.id),
  });

  revalidatePath(`/santa/${token}/pick`);
  revalidatePath(`/santa/${token}/wishlist`);
  revalidatePath(`/santa/${token}`);

  /*
   * Back to where they were standing, filters and page and all.
   *
   * Nobody picks one present and stops. Sending them to the wishlist after
   * each one meant scrolling back into the shop and finding their place
   * again to add the second, and the shop is the one screen where staying
   * put is the whole point.
   */
  const asked = said(form, "back");
  const where = asked.startsWith(`/santa/${token}/pick`) ? asked : `/santa/${token}/pick`;
  const join = where.includes("?") ? "&" : "?";

  if (!done.ok) redirect(`${where}${join}problem=${encodeURIComponent(done.error)}`);
  redirect(`${where}${join}added=${encodeURIComponent(String(item.name ?? ""))}`);
}
