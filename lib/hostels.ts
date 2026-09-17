import { db } from "./supabase";
import type { Hostel } from "./types";

/**
 * The blocks food is delivered to. A typed-in hostel is misspelt every other
 * order, which makes a run sheet impossible to sort, so the list is kept by
 * the admin and the customer picks from it.
 */
export async function listHostels(includeHidden = false): Promise<Hostel[]> {
  let query = db().from("hostels").select("*").order("sort_order").order("name");
  if (!includeHidden) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Hostel[];
}

/** The names alone, for a dropdown. Empty means the list is not set up yet. */
export async function hostelNames(): Promise<string[]> {
  try {
    return (await listHostels()).map((hostel) => hostel.name);
  } catch {
    // A database without the table yet must not stop anyone checking out.
    return [];
  }
}
