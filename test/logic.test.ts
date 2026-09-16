import assert from "node:assert/strict";
import { test } from "node:test";
import { groupForCounter } from "../lib/admin";
import { normalisePhone, formatPhone } from "../lib/phone";
import { countdown, lagosInstant, lagosToday } from "../lib/time";
import { bandFor, feeFor, nextBand, splitFee, HEADLINE_FEE } from "../lib/fees";
import { sheetAsText } from "../lib/sheet-text";
import { whatsappTo } from "../lib/messages";
import { newPin } from "../lib/customer-auth";
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
    for_name: null,
    choices: [],
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


test("delivery is banded by how many containers, not what they cost", () => {
  assert.equal(feeFor(1), 4000);
  assert.equal(feeFor(3), 4000);
  assert.equal(feeFor(4), 6000);
  assert.equal(feeFor(6), 6000);
  assert.equal(feeFor(7), 8000);
  assert.equal(feeFor(10), 8000);
  assert.equal(feeFor(11), 10000);
  assert.equal(feeFor(40), 10000);
  // One ₦24,000 bucket is one container and pays the headline fee.
  assert.equal(feeFor(1), HEADLINE_FEE);
});

test("an empty cart is still priced as the first band, never free", () => {
  assert.equal(feeFor(0), 4000);
});

test("a flash drop lowers every band by the same amount", () => {
  assert.equal(feeFor(1, 2000), 2000);
  assert.equal(feeFor(4, 2000), 4000);
  assert.equal(feeFor(7, 2000), 6000);
  assert.equal(feeFor(11, 2000), 8000);
  // A car-load never becomes cheap to carry just because the entry fee dropped.
  assert.ok(feeFor(11, 2000) > feeFor(1, 2000));
});

test("the cart can say how far the next band is", () => {
  assert.deepEqual(nextBand(3), { itemsAway: 1, fee: 6000 });
  assert.deepEqual(nextBand(1), { itemsAway: 3, fee: 6000 });
  assert.equal(nextBand(11), null);
  assert.equal(bandFor(5).fee, 6000);
});

test("a group's fee splits by what each person ordered and sums exactly", () => {
  const shares = splitFee(6000, [2, 2, 1]);
  assert.equal(shares.reduce((a, b) => a + b, 0), 6000);
  assert.deepEqual(shares, [2400, 2400, 1200]);

  // Rounding remainders land somewhere, never vanish.
  const awkward = splitFee(8000, [1, 1, 1]);
  assert.equal(awkward.reduce((a, b) => a + b, 0), 8000);

  const single = splitFee(4000, [3]);
  assert.deepEqual(single, [4000]);
});

test("adding to an order charges only the difference in band", () => {
  // Three items already (₦4,000 paid); two more makes five, a ₦6,000 load.
  const alreadyCharged = feeFor(3);
  const topUp = Math.max(0, feeFor(3 + 2) - alreadyCharged);
  assert.equal(topUp, 2000);

  // Staying inside the same band costs nothing extra.
  assert.equal(Math.max(0, feeFor(1 + 1) - feeFor(1)), 0);
});


test("the run sheet reads as plain text that survives a dead signal", () => {
  const sheet: any = {
    counter: [
      {
        restaurant: "KFC Novare",
        lines: [{ name: "8pc bucket", choices: [], qty: 3, unitPrice: 18000 }],
        expectedFoodTotal: 54000,
      },
    ],
    handout: [
      {
        key: "k",
        name: "Ada",
        hostel: "Blue Block",
        phone: "08031234567",
        orders: [],
        lines: [{ qty: 1, name: "8pc bucket", choices: [] }],
      },
    ],
    unpaid: [{ for_name: null, customer_name: "Chidi", total: 14666 }],
    summary: { paidCount: 1, minimum: 8, foodCost: 54000, net: 4000 },
  };

  const text = sheetAsText(sheet, "Friday night");
  assert.match(text, /SUDU RUN: Friday night/);
  assert.match(text, /3 x 8pc bucket/);
  assert.match(text, /pay about ₦54,000/);
  assert.match(text, /Ada \(Blue Block\) 0803 123 4567/);
  assert.match(text, /NOT PAID, DO NOT TAKE/);
  assert.match(text, /Chidi ₦14,666/);
});

test("a WhatsApp link carries a Nigerian number in international form", () => {
  assert.match(whatsappTo("08031112222", "hi"), /^https:\/\/wa\.me\/2348031112222\?text=hi$/);
  assert.match(whatsappTo("2348031112222", "hi"), /wa\.me\/2348031112222/);
});

test("PINs are four digits, zero padded", () => {
  for (let i = 0; i < 200; i++) {
    assert.match(newPin(), /^\d{4}$/);
  }
});


test("the counter sheet keeps sizes and flavours apart", () => {
  const pizza = (choices: string[], qty: number, price: number) =>
    line({ name: "Pizza", choices, qty, unit_price_at_order: price, restaurant: "Domino's" });

  const groups = groupForCounter([
    pizza(["Large", "Pepperoni"], 1, 17000),
    pizza(["Large", "Pepperoni"], 2, 17000),
    pizza(["Small", "Margherita"], 1, 11000),
  ]);

  const domino = groups.find((g) => g.restaurant === "Domino's")!;
  assert.equal(domino.lines.length, 2);
  assert.deepEqual(
    domino.lines.map((l) => `${l.qty}x ${l.name} (${l.choices.join(", ")})`),
    ["3x Pizza (Large, Pepperoni)", "1x Pizza (Margherita, Small)"]
  );
  assert.equal(domino.expectedFoodTotal, 3 * 17000 + 11000);
});
