import { BASE } from "@/lib/api";

export type OfferAnswer = {
  offer: { fee: number; note: string } | null;
  nearly: { fee: number; note: string; blocking: string[]; qualifying: string[] } | null;
};

/**
 * What an offer does to this cart on the day it would arrive.
 *
 * The same question as api.offerOn, with the delivery day added: an offer
 * written for Fridays is not quoted or mentioned for a cart arriving on a
 * Saturday.
 */
export async function offerOnDay(body: {
  batchId: string;
  deliverAt?: string | null;
  onDay: string;
  phone?: string;
  lines: { itemId: string; restaurantId: string; name: string; choices: string[] }[];
}): Promise<OfferAnswer> {
  const response = await fetch(`${BASE}/api/app/offer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("offer");
  return (await response.json()) as OfferAnswer;
}
