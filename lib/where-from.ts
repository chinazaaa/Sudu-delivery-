import { cookies } from "next/headers";
import { FROM_COOKIE, WHO_COOKIE, tidyChannel } from "./came-from";
import { safeSettings } from "./settings";

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

/**
 * The code a promoter's link carries, for an order being placed right now.
 *
 * Read from the cookie and the settings on the server rather than taken from
 * the form. The checkout already shows what it is worth, but what a browser
 * posts is whatever somebody felt like posting, and a discount is exactly
 * the field worth being strict about: nobody gets to name their own code by
 * editing a hidden input.
 */
export async function linkCouponNow(): Promise<string> {
  try {
    const sentBy = (await cookies()).get(WHO_COOKIE)?.value ?? "";
    if (sentBy.trim() === "") return "";
    return (await safeSettings()).promoter_perk_code.trim();
  } catch {
    return "";
  }
}
