/** Whole naira in, "₦4,000" out. */
export function naira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}

/** How an order is referred to out loud: "#1042", or its id when unnumbered. */
export function orderRef(order: { order_no: number | null; id: string }): string {
  return order.order_no ? `#${order.order_no}` : `#${order.id.slice(0, 6)}`;
}

/**
 * One group, one number. A split group is several orders under the bonnet, so
 * their raw numbers run 1005, 1006, 1007 and read as three unrelated orders.
 * They are shown as 1005a, 1005b, 1005c instead: the same order, one part
 * each, which is what the people in it think they have.
 */
export function shareRef(
  order: { order_no: number | null; id: string },
  group: { order_no: number | null; id: string }[]
): string {
  if (group.length < 2) return orderRef(order);

  const ordered = [...group].sort(
    (a, b) => (a.order_no ?? 0) - (b.order_no ?? 0)
  );
  const base = ordered[0]?.order_no;
  const index = ordered.findIndex((row) => row.id === order.id);
  if (!base || index < 0) return orderRef(order);

  // Past twenty-six people the letters would repeat, so those keep a number.
  return index < 26
    ? `#${base}${String.fromCharCode(97 + index)}`
    : `#${base}-${index + 1}`;
}

/**
 * How every order in a list should be referred to, keyed by id.
 *
 * A split group is several orders under the bonnet, and calling one of them
 * #1001 and its sibling #1002 invites somebody to write the wrong number in a
 * transfer. Given a batch's orders, or a group's, each one comes back as
 * #1001a and #1001b, and an order with no group keeps its plain number.
 */
export function refsIn(
  orders: { id: string; order_no: number | null; group_id?: string | null }[]
): Map<string, string> {
  const byGroup = new Map<string, { id: string; order_no: number | null }[]>();
  for (const order of orders) {
    if (!order.group_id) continue;
    byGroup.set(order.group_id, [...(byGroup.get(order.group_id) ?? []), order]);
  }

  return new Map(
    orders.map((order) => [
      order.id,
      order.group_id ? shareRef(order, byGroup.get(order.group_id) ?? []) : orderRef(order),
    ])
  );
}
