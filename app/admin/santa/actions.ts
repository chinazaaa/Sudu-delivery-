"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { normalisePhone } from "@/lib/phone";
import { ensureCustomer } from "@/lib/orders";
import {
  closeRoom,
  createRoom,
  deleteRoom,
  joinRoom,
  markPaid,
  markUnpaid,
  removeMember as takeOut,
  roomById,
} from "@/lib/santa";
import { redirect } from "next/navigation";

/**
 * Running the rooms.
 *
 * Admin is where money becomes membership. Nothing on the public side
 * writes a member, because nothing out there can know that somebody paid.
 */

const said = (form: FormData, key: string): string => String(form.get(key) ?? "").trim();
const back = () => {
  revalidatePath("/admin/santa");
  revalidatePath("/admin/santa/wishlists");
};

/**
 * Starting a room from this side of the counter.
 *
 * The public page is where a room normally begins, and that is the right
 * door: somebody shares the link into their class group and it runs
 * itself. But the shop gets asked to set one up often enough -- over
 * WhatsApp, in a DM, by somebody who would rather we did it -- and until
 * now the answer was to walk them through the form themselves.
 *
 * The room still belongs to a person rather than to the shop. The
 * organiser's number is asked for and the room is made in their name, so
 * they get the PIN, they can close it, and they are the one everybody else
 * is relying on. A room owned by admin is a room nobody in the group can
 * do anything with.
 */
export async function startRoom(form: FormData): Promise<void> {
  const phone = normalisePhone(said(form, "phone"));
  const name = said(form, "name");
  if (!phone) return oops("That organiser number does not look right.");
  if (name === "") return oops("Give the room a name.");

  // Their PIN comes from here, the same as it would on the public page.
  // Without a customer record they could not prove the room was theirs.
  await ensureCustomer({ phone, name: said(form, "organiser") || name });

  const made = await createRoom({
    creatorPhone: phone,
    name,
    budget: Number(said(form, "budget")),
    exchangeDate: said(form, "exchangeDate"),
    closeDate: said(form, "closeDate"),
  });

  if (!made.ok) return oops(made.error);

  back();
  // Straight to the share link, because that is the only reason anybody
  // makes a room: something to paste into a group chat.
  redirect(`/admin/santa?made=${encodeURIComponent(made.room.shareToken)}`);
}

/** What went wrong, said on the page rather than thrown at somebody. */
function oops(why: string): never {
  redirect(`/admin/santa?problem=${encodeURIComponent(why)}`);
}

/**
 * Add somebody by hand.
 *
 * Joining is open on the room page, so this is for the person who paid in
 * cash, or rang up, or whose transfer landed before they ever opened the
 * link. It does not mark them paid: that is its own step, done against a
 * statement.
 */
export async function addMember(form: FormData): Promise<void> {
  const roomId = said(form, "roomId");
  const here = await roomById(roomId);
  if (!here) return;

  const phone = normalisePhone(said(form, "phone"));
  const name = said(form, "name");
  if (!phone || name === "") return;

  await ensureCustomer({ phone, name });
  await joinRoom({ roomId, phone, name });
  back();
}

/**
 * Their money landed, so they are in the draw.
 *
 * Picked off a list that shows the name, the number and the reference
 * together, because a bank statement gives a name that is often somebody's
 * father's and an amount every member of the room has also paid.
 */
export async function markMemberPaid(form: FormData): Promise<void> {
  const memberId = said(form, "memberId");
  if (!memberId) return;
  await markPaid(memberId);
  back();
}

/** It bounced, or went back. Out of the draw again. */
export async function markMemberUnpaid(form: FormData): Promise<void> {
  const memberId = said(form, "memberId");
  if (!memberId) return;
  await markUnpaid(memberId);
  back();
}

/**
 * Somebody left before the draw. Their money goes back.
 *
 * The rule and the tidying up live in the engine, so this and the button
 * the room's own creator presses cannot drift apart: before the draw only,
 * marked rather than deleted so their reference still means something on a
 * statement, and their list goes with them.
 */
export async function removeMember(form: FormData): Promise<void> {
  await takeOut(said(form, "memberId"));
  back();
}

export async function drawRoom(form: FormData): Promise<void> {
  await closeRoom(said(form, "roomId"));
  back();
}

/**
 * What the gift actually cost, and what that leaves.
 *
 * The refund is worked out here rather than typed, so it cannot disagree
 * with the two numbers it comes from. Over budget is not refused: it is
 * recorded, and the status says somebody has to agree it before it is
 * bought. Nothing above the budget is ever bought without that.
 */
export async function priceJob(form: FormData): Promise<void> {
  const orderId = said(form, "orderId");
  const paid = Math.max(0, Math.round(Number(said(form, "sourcedPrice"))));
  // The ceiling the screen showed, which already has the fetching taken
  // out of it: one errand per thing chosen.
  const budget = Math.max(0, Math.round(Number(said(form, "budget"))));
  if (!orderId || !Number.isFinite(paid)) return;

  await db()
    .from("santa_orders")
    .update({
      sourced_price: paid,
      refund: Math.max(0, budget - paid),
      status: paid > budget ? "asking" : "buying",
    })
    .eq("id", orderId);
  back();
}

/** The buyer agreed to the higher price. */
export async function agreeOverBudget(form: FormData): Promise<void> {
  await db()
    .from("santa_orders")
    .update({ agreed_at: new Date().toISOString(), status: "buying" })
    .eq("id", said(form, "orderId"));
  back();
}

export async function setStatus(form: FormData): Promise<void> {
  const status = said(form, "status");
  const allowed = ["sourcing", "asking", "buying", "bought", "delivered", "stuck"];
  if (!allowed.includes(status)) return;

  await db().from("santa_orders").update({ status }).eq("id", said(form, "orderId"));
  back();
}

/**
 * The buyer took it to hand over themselves.
 *
 * Until this is set the gift is still ours and the fallback is still open:
 * if their day comes and they cannot be reached, it goes back to being
 * delivered to the person it is for on the exchange day, which is what
 * keeps the promise intact.
 */
export async function markHandedOver(form: FormData): Promise<void> {
  await db()
    .from("santa_orders")
    .update({ handed_over_at: new Date().toISOString(), status: "delivered" })
    .eq("id", said(form, "orderId"));
  back();
}

/** The buyer could not be reached, so we deliver it after all. */
export async function backToUs(form: FormData): Promise<void> {
  await db()
    .from("santa_orders")
    .update({ handover: "we_deliver", deliver_on: null })
    .eq("id", said(form, "orderId"));
  back();
}

export async function markRefunded(form: FormData): Promise<void> {
  await db()
    .from("santa_orders")
    .update({ refunded_at: new Date().toISOString() })
    .eq("id", said(form, "orderId"));
  back();
}

/**
 * The shop's side of one wish: what it costs, what we charge, where it is bought.
 *
 * Saved against the wish rather than the order, because the useful moment is
 * before anybody has picked anything. Fifty things on ten lists, and the ones
 * that take a week to find are knowable in November.
 */
export async function saveWishPlan(form: FormData): Promise<void> {
  const wishId = said(form, "wishId");
  if (!wishId) return;

  const number = (key: string) => {
    const raw = said(form, key);
    const value = Math.round(Number(raw));
    return raw === "" || !Number.isFinite(value) || value < 0 ? 0 : value;
  };

  await db()
    .from("santa_wishes")
    .update({
      cost_price: number("costPrice"),
      sell_price: number("sellPrice"),
      source: said(form, "source"),
    })
    .eq("id", wishId);
  back();
}

/** A room made to try the thing out, swept up afterwards. */
export async function removeRoom(form: FormData): Promise<void> {
  await deleteRoom(said(form, "roomId"), said(form, "force") === "1");
  back();
}
