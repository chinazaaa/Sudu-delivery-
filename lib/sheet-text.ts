import { naira } from "./money";
import { formatPhone } from "./phone";
import type { BatchSheet } from "./admin";

/**
 * The whole run as plain text, so it can be sent to WhatsApp before leaving and
 * read at the counter and the gate with no signal. The admin screen needs data;
 * a message in a chat does not.
 */
export function sheetAsText(sheet: BatchSheet, batchLabel: string): string {
  const lines = [`SUDU RUN: ${batchLabel}`, ""];

  lines.push("AT THE COUNTER");
  for (const group of sheet.counter) {
    lines.push(`${group.restaurant}`);
    for (const item of group.lines) lines.push(`  ${item.qty} x ${item.name}`);
    lines.push(`  pay about ${naira(group.expectedFoodTotal)}`);
  }
  if (sheet.counter.length === 0) lines.push("  nothing paid for yet");

  lines.push("", "HANDOUT");
  for (const bag of sheet.handout) {
    lines.push(
      `${bag.name} (${bag.hostel}) ${formatPhone(bag.phone)}`,
      `  ${bag.lines.map((l) => `${l.qty} x ${l.name}`).join(", ")}`
    );
  }
  if (sheet.handout.length === 0) lines.push("  nobody yet");

  if (sheet.unpaid.length > 0) {
    lines.push("", "NOT PAID, DO NOT TAKE");
    for (const order of sheet.unpaid) {
      lines.push(`  ${order.for_name ?? order.customer_name} ${naira(order.total)}`);
    }
  }

  lines.push(
    "",
    `${sheet.summary.paidCount} paid orders, minimum ${sheet.summary.minimum}`,
    `food ${naira(sheet.summary.foodCost)}, net ${naira(sheet.summary.net)} before fuel`
  );
  return lines.join("\n");
}
