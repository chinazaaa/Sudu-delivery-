import { db } from "./supabase";
import { normalisePhone } from "./phone";

/**
 * What somebody wishes they could order.
 *
 * Not a request: nobody is buying anything and nothing has to be quoted.
 * It is the cheapest market research there is, which is why the page that
 * takes it asks for one sentence and nothing else. The custom order page
 * is the other end of the same idea, for somebody who has already decided.
 */
export type Wish = {
  id: string;
  wanted: string;
  phone: string;
  cameFrom: string;
  createdAt: string;
};

export type Wished = { ok: true } | { ok: false; error: string };

export async function wishFor(input: {
  wanted: string;
  phone?: string;
  cameFrom?: string;
}): Promise<Wished> {
  const wanted = input.wanted.trim();
  // Enough to act on. "Food" is not something anybody can go and buy.
  if (wanted.length < 3) {
    return { ok: false, error: "Say what it is, in a few words." };
  }

  // A number is optional here, so a bad one is not worth stopping somebody
  // over: we keep what can be dialled and drop what cannot.
  const phone = normalisePhone(input.phone ?? "") ?? "";

  const { error } = await db().from("wishes").insert({
    wanted: wanted.slice(0, 300),
    phone,
    came_from: (input.cameFrom ?? "").slice(0, 60),
  });
  return error ? { ok: false, error: "Could not send that just now. Try again." } : { ok: true };
}

export async function wishes(): Promise<Wish[]> {
  const { data } = await db()
    .from("wishes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return ((data ?? []) as Record<string, any>[]).map((row) => ({
    id: row.id,
    wanted: row.wanted ?? "",
    phone: row.phone ?? "",
    cameFrom: row.came_from ?? "",
    createdAt: row.created_at,
  }));
}

export async function forgetWish(id: string): Promise<void> {
  await db().from("wishes").delete().eq("id", id);
}
