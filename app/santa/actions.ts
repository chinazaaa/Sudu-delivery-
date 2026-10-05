"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer-auth";
import { ensureCustomer } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import {
  addWish,
  closeRoom,
  createRoom,
  pickWish,
  removeWish,
  roomByToken,
  setHandover,
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

/** Whoever is signed in, or nobody. */
async function me(token: string): Promise<string> {
  const phone = await currentCustomer();
  if (!phone) redirect(`/orders?next=${encodeURIComponent(`/santa/${token}`)}`);
  return phone;
}

export async function addWishAction(form: FormData): Promise<void> {
  const token = said(form, "token");
  const here = await roomByToken(token);
  if (!here) return;

  const done = await addWish({
    roomId: here.id,
    phone: await me(token),
    title: said(form, "title"),
    photoUrl: said(form, "photoUrl"),
    note: said(form, "note"),
    estPrice: Number(said(form, "estPrice") || 0),
  });

  revalidatePath(`/santa/${token}`);
  if (!done.ok) redirect(`/santa/${token}?problem=${encodeURIComponent(done.error)}`);
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
  revalidatePath(`/santa/${token}`);
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
