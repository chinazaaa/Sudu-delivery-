/** Whole naira in, "₦4,000" out. */
export function naira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}
