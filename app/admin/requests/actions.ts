"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";

/**
 * Where a request has got to, and what it was quoted at.
 *
 * Nothing here messages anybody: the answer goes out on WhatsApp by hand
 * like every other word this shop says to a customer. This records what
 * happened, so a request cannot quietly be forgotten, and so the ones that
 * keep coming back are visible as a pattern rather than as a feeling.
 */
export async function markRequest(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["new", "quoted", "done", "dropped"].includes(status)) return;

  const quoted = Number(String(form.get("quoted") ?? "").replace(/[^\d]/g, ""));

  await db()
    .from("custom_requests")
    .update({
      status,
      ...(quoted > 0 ? { quoted } : {}),
      ...(status === "new" ? {} : { answered_at: new Date().toISOString() }),
    })
    .eq("id", id);

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}
