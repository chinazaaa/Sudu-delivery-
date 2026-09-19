import { joinableGroup, claimLeader, startGroupClock } from "./groups";
import { saveGroupCart } from "./group-carts";
import { normalisePhone } from "./phone";
import type { CartLine } from "./types";

export type HoldResult =
  | { ok: true; cartId: string }
  | { ok: false; error?: string };

/**
 * Put somebody's food into a shared delivery, without making an order.
 *
 * Nobody in a group has a delivery fee until it closes, so until then there
 * is no honest order to make: the number on it would be a number nobody can
 * pay and which is about to change. The food waits, and becomes an order at
 * the close, priced once, when who is in the car is finally known.
 *
 * A group that has closed or gone is not an error. It means this person is
 * now ordering alone, so nothing is held and the caller places an ordinary
 * order instead, which is what it has become.
 */
export async function holdForGroup(input: {
  groupId: string;
  name: string;
  phone: string;
  hostel: string;
  lines: CartLine[];
  paymentMethod: "transfer" | "card";
  customerNote: string;
  coupon: string;
  leader: boolean;
}): Promise<HoldResult> {
  const group = await joinableGroup(input.groupId);
  if (!group) return { ok: false };

  // The same three answers an order is refused without, asked here so nobody
  // finds out at the close that their food was never really in.
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That phone number doesn't look right." };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  const hostel = input.hostel.trim();
  if (hostel.length < 1) return { ok: false, error: "Please enter your hostel or block." };

  const cartId = await saveGroupCart({
    groupId: group.id,
    phone,
    name,
    hostel,
    lines: input.lines,
    paymentMethod: input.paymentMethod,
    customerNote: input.customerNote,
    coupon: input.coupon,
  });

  if (!cartId) {
    return { ok: false, error: "Could not add your food to that group. Try again." };
  }

  // Whoever made the link is who can close it, and the group only learns
  // their number when they put their own food in.
  if (input.leader) await claimLeader(group.id, phone);
  // The first food in is what starts the fifteen minutes.
  await startGroupClock(group.id);

  return { ok: true, cartId };
}
