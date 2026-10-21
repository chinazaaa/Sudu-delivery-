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

/**
 * Where each counter can be sent tonight's list.
 *
 * By name rather than by id, because a counter group is grouped by the
 * name on the order line and that is the only handle the sheet has. A
 * counter with no number is not a problem to solve here: the list is read
 * out at the counter as it always was, and the page simply does not offer
 * to send it.
 */
export async function counterPhones(): Promise<Record<string, string>> {
  const { data } = await db()
    .from("restaurants")
    .select("name, phone")
    .overrideTypes<{ name: string; phone: string | null }[]>();

  const phones: Record<string, string> = {};
  for (const row of data ?? []) {
    const number = String(row.phone ?? "").trim();
    if (number !== "") phones[row.name] = number;
  }
  return phones;
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
