import { Settings } from "./settings";

/**
 * Paying from abroad, through Stripe, in pounds or dollars.
 *
 * A parent in London or a sister in Houston wants to pay for somebody's
 * food, and a Nigerian transfer is not something either of them can do. The
 * card link handles it, the same link sent by hand on WhatsApp that a card
 * payment has always been: the only new thing is which currency it is made
 * out in, and the shop has to know that before it makes one.
 */

export type Money = "GBP" | "USD";

export const SYMBOL: Record<Money, string> = { GBP: "£", USD: "$" };
export const MONEY_NAME: Record<Money, string> = {
  GBP: "pounds",
  USD: "dollars",
};

/** Whether the checkout offers it at all. Off unless admin says otherwise. */
export function abroadOn(settings: Settings): boolean {
  return settings.abroad_on === "on";
}

/** What the shop will honour, as naira to one of them. Zero means unset. */
export function rateFor(settings: Settings, money: Money): number {
  const raw = money === "GBP" ? settings.gbp_rate : settings.usd_rate;
  const rate = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

/** The currencies worth offering: switched on, and with a rate behind them. */
export function moniesOn(settings: Settings): Money[] {
  if (!abroadOn(settings)) return [];
  return (["GBP", "USD"] as Money[]).filter((one) => rateFor(settings, one) > 0);
}

/**
 * A naira total said in their money, roughly.
 *
 * Rounded up to the nearest ten pence or ten cents, and never down: the rate
 * moves while somebody reads it, and the shop is the one left short when it
 * moves the wrong way. Said as "about" everywhere it is shown, because it is.
 */
export function inMoney(naira: number, rate: number): string {
  if (rate <= 0) return "";
  return (Math.ceil((naira / rate) * 10) / 10).toFixed(2);
}

/** "about £9.20", or nothing at all where there is no rate to say it with. */
export function roughly(naira: number, settings: Settings, money: Money): string {
  const rate = rateFor(settings, money);
  if (rate <= 0) return "";
  return `about ${SYMBOL[money]}${inMoney(naira, rate)}`;
}

/**
 * An order's total in the money its card link will be made out in.
 *
 * Empty where nobody abroad is paying, and empty where no rate is set:
 * admin is better off seeing the currency alone than a figure the shop
 * never agreed to.
 */
export function abroadRoughly(
  order: { pay_currency?: string; total: number },
  settings: Settings
): string {
  const said = String(order.pay_currency ?? "").toUpperCase();
  if (said !== "GBP" && said !== "USD") return "";
  return roughly(order.total, settings, said);
}
