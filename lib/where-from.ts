import { cookies } from "next/headers";
import { FROM_COOKIE, tidyChannel } from "./came-from";

/**
 * The channel remembered in this browser, read on the server.
 *
 * Kept out of lib/orders on purpose: next/headers cannot be imported by
 * anything a client component touches, and lib/orders is imported by one.
 *
 * Tidied again here rather than trusted. It is a cookie, so it is whatever
 * somebody felt like typing into it, and a column that has to be counted
 * later can only hold names we chose.
 */
export async function cameFromNow(): Promise<string> {
  try {
    return tidyChannel((await cookies()).get(FROM_COOKIE)?.value ?? "");
  } catch {
    // No request to read a cookie off. Nothing is worth failing an order.
    return "";
  }
}
