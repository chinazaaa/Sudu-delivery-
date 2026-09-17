/** Whole naira in, "₦4,000" out. */
export function naira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}

/** How an order is referred to out loud: "#1042", or its id when unnumbered. */
export function orderRef(order: { order_no: number | null; id: string }): string {
  return order.order_no ? `#${order.order_no}` : `#${order.id.slice(0, 6)}`;
}
