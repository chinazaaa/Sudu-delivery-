import { db } from "./supabase";
import { batchSheet, type BatchSheet } from "./admin";
import { getBatch } from "./batches";
import { stillDriving } from "./runner";
import type { Batch } from "./types";

/**
 * Reading a run by the link somebody is driving it with.
 *
 * Split from `runner.ts` the way `areas-server` is split from `areas`: the
 * rules are worth testing without a database behind them, and the database
 * is worth keeping out of anything that only wants the rules.
 *
 * Everything here answers the same question. The token is the whole of the
 * authorisation, so the token is checked once, here, and every caller gets
 * either a run it is allowed to see or nothing at all.
 */

export type DrivenRun = { batch: Batch; sheet: BatchSheet };

/**
 * The run this link opens, or nothing.
 *
 * Nothing covers all of it: a token that matches no run, a run that has
 * been settled since the link went out, and a token the shop has cleared.
 * The page says the same thing to all three on purpose. "That run is
 * finished" and "there is no such run" are different facts, and telling
 * them apart for somebody holding a link they should not have is a
 * courtesy to the wrong person.
 */
export async function runByToken(token: string): Promise<DrivenRun | null> {
  const clean = String(token ?? "").trim();
  if (clean === "") return null;

  const { data } = await db()
    .from("batches")
    .select("*")
    .eq("runner_token", clean)
    .maybeSingle();

  const batch = data as Batch | null;
  if (!stillDriving(batch) || !batch) return null;

  const sheet = await batchSheet(batch.id);
  if (!sheet) return null;
  return { batch, sheet };
}

export type CounterContact = {
  phone: string;
  orders_ahead: string;
  pay_by: string;
};

/**
 * How each counter can be reached before the car gets there.
 *
 * By name rather than by id, because a counter group is grouped by the
 * name on the order line and that is the only handle the sheet has.
 *
 * Both halves, not just the number. A number says where; it does not say
 * whether anybody is watching that inbox, and a page holding only a number
 * has to guess. Reading them together is what lets the sheet offer the way
 * that works and stay quiet where none does.
 */
export async function counterContacts(): Promise<Record<string, CounterContact>> {
  const { data } = await db()
    .from("restaurants")
    .select("name, phone, orders_ahead, pay_by")
    .overrideTypes<
      {
        name: string;
        phone: string | null;
        orders_ahead: string | null;
        pay_by: string | null;
      }[]
    >();

  const reach: Record<string, CounterContact> = {};
  for (const row of data ?? []) {
    reach[row.name] = {
      phone: String(row.phone ?? "").trim(),
      orders_ahead: String(row.orders_ahead ?? "").trim(),
      pay_by: String(row.pay_by ?? "").trim(),
    };
  }
  return reach;
}

/**
 * Tick a stop off, or put it back, from the driver's link.
 *
 * Read then write rather than a single statement, because the column holds
 * a list and the list has to be parsed to be changed. Two people ticking
 * different stops at the same moment is the losing case, and the loss is
 * one tick that can be made again, which is the right size of mistake for
 * a thing with an undo next to it.
 */
export async function setStopCollected(
  batchId: string,
  got: string
): Promise<void> {
  await db().from("batches").update({ runner_got: got }).eq("id", batchId);
}

/**
 * The run behind a token, for an action that is about to change something.
 *
 * Actions cannot trust an id posted in a form: a hidden field saying which
 * run to mark delivered is a hidden field anybody can retype. So they post
 * the token they were opened with, and this turns it back into the only
 * run that token is allowed to touch.
 */
export async function runForAction(token: string): Promise<Batch | null> {
  const clean = String(token ?? "").trim();
  if (clean === "") return null;

  const { data } = await db()
    .from("batches")
    .select("*")
    .eq("runner_token", clean)
    .maybeSingle();

  const batch = data as Batch | null;
  return stillDriving(batch) ? batch : null;
}

/** The run a token opens, by id, for checking an order belongs to it. */
export async function batchOf(id: string): Promise<Batch | null> {
  return getBatch(id);
}

export type RunNote = {
  id: string;
  line_key: string;
  said_about: string;
  said: string;
  done_at: string | null;
};

/**
 * What was written at the counters on one run.
 *
 * Everything, done and not, because the driver's page has to show her the
 * note she already left rather than an empty box over a line she knows she
 * wrote about. The shop's page filters to the ones still open, which is
 * the list of what it owes the run.
 */
export async function notesOn(batchId: string): Promise<RunNote[]> {
  const { data } = await db()
    .from("run_notes")
    .select("id, line_key, said_about, said, done_at")
    .eq("batch_id", batchId)
    .order("created_at");

  return (data ?? []) as RunNote[];
}
