import { naira, orderRef, refsIn } from "./money";
import { formatPhone } from "./phone";
import type { BatchSheet } from "./admin";

/**
 * The whole run as plain text, so it can be sent to WhatsApp before leaving and
 * read at the counter and the gate with no signal. The admin screen needs data;
 * a message in a chat does not.
 */
const lineText = (l: {
  qty: number;
  name: string;
  choices: string[];
  restaurant?: string;
  for_name?: string | null;
}) =>
  `${l.qty} x ${l.name}${l.choices.length > 0 ? ` (${l.choices.join(", ")})` : ""}` +
  (l.restaurant ? ` [${l.restaurant}]` : "") +
  (l.for_name ? ` for ${l.for_name}` : "");

export function sheetAsText(sheet: BatchSheet, batchLabel: string): string {
  const lines = [`SUDU RUN: ${batchLabel}`, ""];

  // A share is #1001a wherever it is written: on the sheet, on the screen and
  // in the narration somebody types into their banking app.
  const refs = refsIn([...sheet.handout.flatMap((bag) => bag.orders), ...sheet.unpaid]);

  lines.push("AT THE COUNTER");
  for (const group of sheet.counter) {
    lines.push(`${group.restaurant}`);
    for (const item of group.lines) {
      const choices = item.choices.length > 0 ? ` (${item.choices.join(", ")})` : "";
      lines.push(`  ${item.qty} x ${item.name}${choices}`);
    }
    lines.push(`  pay about ${naira(group.expectedFoodTotal)}`);
  }
  if (sheet.counter.length === 0) lines.push("  nothing paid for yet");

  lines.push("", "HANDOUT");
  for (const bag of sheet.handout) {
    lines.push(
      `${bag.orders.map(orderRef).join(" ")} ${bag.name} (${bag.hostel}) ` +
        `${formatPhone(bag.phone)}`,
      `  ${bag.lines.map(lineText).join(", ")}`
    );
  }
  if (sheet.handout.length === 0) lines.push("  nobody yet");

  if (sheet.unpaid.length > 0) {
    lines.push("", "NOT PAID, DO NOT TAKE");
    for (const order of sheet.unpaid) {
      lines.push(
        `  ${refs.get(order.id) ?? orderRef(order)} ${order.for_name ?? order.customer_name} ` +
          `${naira(order.total)} (${order.payment_method === "card" ? "card link" : "transfer"})`
      );
    }
  }

  lines.push(
    "",
    `${sheet.summary.paidCount} paid of ${sheet.summary.paidCount + sheet.summary.unpaidCount} orders`,
    `food ${naira(sheet.summary.foodCost)}, net ${naira(sheet.summary.net)} before fuel`
  );
  return lines.join("\n");
}
