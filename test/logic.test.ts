import assert from "node:assert/strict";
import { test } from "node:test";
import { groupForCounter } from "../lib/admin";
import { normalisePhone, formatPhone } from "../lib/phone";
import { countdown, lagosInstant, lagosToday } from "../lib/time";
import type { OrderLine } from "../lib/orders";

test("phone numbers normalise to one identity however they are typed", () => {
  const expected = "08031234567";
  for (const input of [
    "08031234567",
    "0803 123 4567",
    "+2348031234567",
    "234 803 123 4567",
    "8031234567",
    "0803-123-4567",
  ]) {
    assert.equal(normalisePhone(input), expected, input);
  }
});

test("phone numbers that are not Nigerian mobiles are rejected", () => {
  for (const input of ["", "0123456789", "0803123456", "080312345678", "hello"]) {
    assert.equal(normalisePhone(input), null, input);
  }
});

test("phone numbers format for reading against a transfer narration", () => {
  assert.equal(formatPhone("08031234567"), "0803 123 4567");
});

test("countdown reads in hours and minutes, then minutes and seconds", () => {
  assert.equal(countdown(3 * 3600_000 + 12 * 60_000), "3h 12m");
  assert.equal(countdown(12 * 60_000 + 4_000), "12m 04s");
  assert.equal(countdown(9_000), "9s");
  assert.equal(countdown(0), "now");
  assert.equal(countdown(-5_000), "now");
});

test("cut-offs are Lagos wall-clock times, a fixed hour ahead of UTC", () => {
  assert.equal(lagosInstant("2026-09-18", 11, 30), "2026-09-18T10:30:00.000Z");
  assert.equal(lagosInstant("2026-09-18", 18, 0), "2026-09-18T17:00:00.000Z");
  // Nigeria has no DST, so a January cut-off shifts by the same hour.
  assert.equal(lagosInstant("2026-01-09", 18, 0), "2026-01-09T17:00:00.000Z");
});

test("the Lagos date rolls over an hour before UTC does", () => {
  assert.equal(lagosToday(new Date("2026-09-18T23:30:00Z")), "2026-09-19");
  assert.equal(lagosToday(new Date("2026-09-18T22:30:00Z")), "2026-09-18");
});

function line(over: Partial<OrderLine>): OrderLine {
  return {
    id: crypto.randomUUID(),
    order_id: "o1",
    menu_item_id: "m1",
    qty: 1,
    unit_price_at_order: 1000,
    name: "Wrap meal",
    restaurant: "KFC Novare",
    ...over,
  };
}

test("the counter sheet collapses orders into per-restaurant totals", () => {
  const groups = groupForCounter([
    line({ order_id: "a", name: "8pc bucket", qty: 1, unit_price_at_order: 18000 }),
    line({ order_id: "b", name: "8pc bucket", qty: 2, unit_price_at_order: 18000 }),
    line({ order_id: "c", name: "Wrap meal", qty: 3, unit_price_at_order: 5500 }),
    line({
      order_id: "c",
      name: "Medium pepperoni",
      qty: 1,
      unit_price_at_order: 11000,
      restaurant: "Domino's Pizza",
    }),
  ]);

  assert.equal(groups.length, 2);

  const kfc = groups.find((g) => g.restaurant === "KFC Novare")!;
  assert.deepEqual(
    kfc.lines.map((l) => `${l.qty}x ${l.name}`),
    ["3x 8pc bucket", "3x Wrap meal"]
  );
  assert.equal(kfc.expectedFoodTotal, 3 * 18000 + 3 * 5500);

  const dominos = groups.find((g) => g.restaurant === "Domino's Pizza")!;
  assert.equal(dominos.expectedFoodTotal, 11000);
});

test("an item whose price changed mid-week is not merged with its old price", () => {
  const groups = groupForCounter([
    line({ name: "Wrap meal", qty: 1, unit_price_at_order: 5500 }),
    line({ name: "Wrap meal", qty: 1, unit_price_at_order: 6000 }),
  ]);

  assert.equal(groups[0].lines.length, 2);
  assert.equal(groups[0].expectedFoodTotal, 11500);
});
