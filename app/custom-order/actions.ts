"use server";

import { redirect } from "next/navigation";
import { askFor } from "@/lib/requests";
import { tellAdmin } from "@/lib/admin-alerts";

export type AskState = { error: string };

/**
 * Somebody asking for something we do not carry.
 *
 * Returns the error rather than throwing it: a throw from a server action
 * goes to the error boundary, which loses everything they typed and tells
 * them nothing about what was wrong with it.
 */
export async function sendRequest(
  _prev: AskState,
  form: FormData
): Promise<AskState> {
  const said = (name: string) => String(form.get(name) ?? "");

  const result = await askFor({
    wanted: said("wanted"),
    budget: said("budget"),
    name: said("name"),
    phone: said("phone"),
    hostel: said("hostel"),
    note: said("note"),
  });

  if (!result.ok) return { error: result.error };

  // After the row exists and never in a way that can fail it. Somebody
  // asking for something we do not carry has to be found, priced and
  // answered by hand, and until it is answered it is a customer waiting.
  try {
    const budget = said("budget").trim();
    await tellAdmin({
      title: `Custom order · ${budget || "no budget said"}`,
      body: `${said("name").trim() || "Someone"} wants ${said("wanted").trim()}.`,
      url: "/admin/requests",
    });
  } catch {
    /* The request is saved either way. */
  }

  redirect("/custom-order?sent=1");
}
