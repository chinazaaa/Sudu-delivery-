"use server";

import { redirect } from "next/navigation";
import {
  checkPromoterPin,
  signInPromoter,
  signOutPromoter,
} from "@/lib/promoter-auth";

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
