"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { normalisePhone } from "@/lib/phone";
import { ensureCustomer } from "@/lib/orders";
import { closeRoom, joinRoom, roomById } from "@/lib/santa";

/**
 * Running the rooms.
 *
 * Admin is where money becomes membership. Nothing on the public side
 * writes a member, because nothing out there can know that somebody paid.
 */

const said = (form: FormData, key: string): string => String(form.get(key) ?? "").trim();
const back = () => revalidatePath("/admin/santa");

/**
 * Put somebody in a room, once their money has landed.
 *
 * The amount is taken from the room rather than typed, because a member who
 * paid less than the budget is the one thing this whole design exists to
 * prevent, and a box somebody can type into is a box somebody can mistype.
 */
export async function addMember(form: FormData): Promise<void> {
  const roomId = said(form, "roomId");
  const here = await roomById(roomId);
  if (!here) return;

  const phone = normalisePhone(said(form, "phone"));
  const name = said(form, "name");
  if (!phone || name === "") return;

  await ensureCustomer({ phone, name });
  await joinRoom({ roomId, phone, name, paid: here.budget });
  back();
}

/** Somebody left before the draw. Their money goes back. */
export async function removeMember(form: FormData): Promise<void> {
  await db()
    .from("santa_members")
    .update({ left_at: new Date().toISOString() })
    .eq("id", said(form, "memberId"));
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
