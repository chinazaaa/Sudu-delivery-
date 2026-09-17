"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkPromoterPin,
  currentPromoter,
  signInPromoter,
  signOutPromoter,
} from "@/lib/promoter-auth";
import { db } from "@/lib/supabase";

export type PromoterSignIn = { error: string | null };

export async function signIn(
  _prev: PromoterSignIn,
  form: FormData
): Promise<PromoterSignIn> {
  const result = await checkPromoterPin(
    String(form.get("code") ?? ""),
    String(form.get("pin") ?? "")
  );
  if (!result.ok) return { error: result.error };

  await signInPromoter(result.code);
  redirect("/promoter");
}

export async function signOut(): Promise<void> {
  await signOutPromoter();
  redirect("/promoter");
}

/** Their own bank details, changed by them so nobody has to retype them. */
export async function saveBank(form: FormData): Promise<void> {
  const code = await currentPromoter();
  if (!code) return;

  const { error } = await db()
    .from("promoters")
    .update({
      bank_name: String(form.get("bank_name") ?? "").trim(),
      bank_account_name: String(form.get("bank_account_name") ?? "").trim(),
      bank_account_number: String(form.get("bank_account_number") ?? "")
        .replace(/\D/g, "")
        .slice(0, 10),
    })
    .eq("code", code);
  if (error) throw new Error(`Could not save those details: ${error.message}`);

  revalidatePath("/promoter");
  revalidatePath("/admin", "layout");
}

/**
 * Saying a payout landed.
 *
 * A promoter cannot record a payout, only confirm one you have recorded.
 * Money owed is not something the person owed it should be able to write
 * down, and a confirmation is the useful half anyway: it tells you the
 * transfer arrived without a conversation.
 */
export async function confirmPayout(form: FormData): Promise<void> {
  const code = await currentPromoter();
  if (!code) return;

  const { error } = await db()
    .from("promoter_payouts")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", String(form.get("payout_id")))
    .eq("promoter_code", code)
    .is("confirmed_at", null);
  if (error) throw new Error(`Could not confirm that: ${error.message}`);

  revalidatePath("/promoter");
  revalidatePath("/admin", "layout");
}

/**
 * Their own wording for a nudge.
 *
 * Emptying the box puts the standard one back rather than sending nothing,
 * because a blank message is the one outcome nobody wants at the point of
 * tapping Nudge.
 */
export async function saveNudge(form: FormData): Promise<void> {
  const code = await currentPromoter();
  if (!code) return;

  const { error } = await db()
    .from("promoters")
    .update({ nudge_template: String(form.get("nudge_template") ?? "").trim() })
    .eq("code", code);
  if (error) {
    throw new Error(
      `Could not save that: ${error.message}. If it mentions nudge_template, ` +
        "run supabase/update.sql."
    );
  }

  revalidatePath("/promoter");
}
