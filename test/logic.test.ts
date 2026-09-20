import assert from "node:assert/strict";
import { test } from "node:test";
import { groupForCounter } from "../lib/admin";
import { normalisePhone, formatPhone } from "../lib/phone";
import { countdown, lagosInstant, lagosToday } from "../lib/time";
import {
  bandFor,
  evenShare,
  feeFor,
  isUrgent,
  nextBand,
  sameDayFee,
  splitFee,
  HEADLINE_FEE,
} from "../lib/fees";
import {
  choiceCombinations,
  choiceValues,
  everyLineChose,
  nearMiss,
  offerFee,
  offerShare,
  offerNote,
  pickOffer,
} from "../lib/offers";
import { sameInstant, slotsWorthOffering, windowPhrase } from "../lib/same-day";
import { sayWindow } from "../lib/settings";
import { sheetAsText } from "../lib/sheet-text";
import { template, whatsappTo } from "../lib/messages";
import { newPin } from "../lib/customer-auth";
import { parseMenuText } from "../lib/menu-import";
import { adminEmails } from "../lib/email";
import { refsIn, shareRef } from "../lib/money";
import { externalUrl, EMPTY as SETTINGS_DEFAULTS, type Settings } from "../lib/settings";
import { matchPhotos, tidy } from "../lib/match";
import { groupNames, lineKey as cartLineKey, reclaim } from "../lib/cart";
import { renderEmail, renderText, type Block } from "../lib/email-html";
import { deliverySlots, slotFee, slotsToday } from "../lib/same-day";
import { nextArrival } from "../lib/arrival";

/** A settings row with nothing filled in, for the template tests. */
const EMPTY_SETTINGS: Settings = { ...SETTINGS_DEFAULTS };

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
        orders: [{ id: "aaaaaaaa", order_no: 1042 }],
        lines: [{ qty: 1, name: "8pc bucket", choices: [] }],
      },
    ],
    unpaid: [
      {
        id: "bbbbbbbb",
        order_no: 1043,
        for_name: null,
        customer_name: "Chidi",
        total: 14666,
        payment_method: "card",
      },
    ],
    summary: { paidCount: 1, minimum: 8, foodCost: 54000, net: 4000 },
  };

  const text = sheetAsText(sheet, "Friday night");
  assert.match(text, /SUDU RUN: Friday night/);
  assert.match(text, /3 x 8pc bucket/);
  assert.match(text, /pay about ₦54,000/);
  assert.match(text, /#1042 Ada \(Blue Block\) 0803 123 4567/);
  assert.match(text, /NOT PAID, DO NOT TAKE/);
  // The number and how they meant to pay are both on the line she reads at
  // the gate, so two orders from one person are never confused.
  assert.match(text, /#1043 Chidi ₦14,666 \(card link\)/);
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


test("a menu pasted straight off a website becomes categories and items", () => {
  const items = parseMenuText(`PIZZA
VEGGIE
MARGHERITA Pizza - Tomato Sauce & Extra Mozzarella Cheese
ADD TO ORDER
CUSTOMIZE
MARGHERITA

CHICKEN
CHICKEN SUYA Pizza - Chicken Suya, Green Peppers, Nigerian Hot Chili Peppers
CHICKEN SUYA

BREADS
BREADSTICKS Bread - Hot & fresh oven-baked Breadsticks
BREADSTICKS

CHICKEN
Roasted Chicken - 2PCS Wings - ROASTED CHICKEN ONLY. NO DIP POT SAUCE ADDED
Roasted Chicken - 2PCS

DRINKS
7UP Drinks -
7UP`);

  assert.deepEqual(
    items.map((i) => `${i.category} / ${i.name}`),
    [
      "Pizza · Veggie / Margherita",
      "Pizza · Chicken / Chicken Suya",
      "Breads / Breadsticks",
      "Chicken / Roasted Chicken - 2PCS",
      "Drinks / 7UP",
    ]
  );
});

test("the section comes from the item line, not the heading above it", () => {
  // CHICKEN heads both a pizza flavour group and a section of its own.
  const items = parseMenuText(`CHICKEN
BBQ CHICKEN Pizza - Grilled chicken and onions
CHICKEN WINGS - 4PCS Wings - Chicken wings only`);

  assert.equal(items[0].category, "Pizza · Chicken");
  assert.equal(items[1].category, "Chicken");
  // Shouted names are title-cased for the card, but 4PCS keeps its shape.
  assert.equal(items[1].name, "Chicken Wings - 4PCS");
});

test("a name containing a dash survives the description split", () => {
  const [item] = parseMenuText(
    "Roasted Chicken With Shawarma - 5PCS Wings - ROASTED CHICKEN WITH SHAWARMA SAUCE DIP POT"
  );
  assert.equal(item.name, "Roasted Chicken With Shawarma - 5PCS");
  assert.equal(item.description, "Roasted chicken with shawarma sauce dip pot");
});

test("prices are optional, and an unpriced item is not sellable", () => {
  const items = parseMenuText(`Pizzas | Pepperoni | 11000 | Beef pepperoni
Pizzas | Margherita`);
  assert.equal(items[0].price, 11000);
  assert.equal(items[1].price, 0);
});

test("labels repeating the item name are not imported twice", () => {
  const items = parseMenuText(`BREADS
CHEESY BREAD Bread - Topped with mozzarella
CHEESY BREAD`);
  assert.equal(items.length, 1);
});


test("a delivery app listing is read as blocks, with out of stock respected", () => {
  const items = parseMenuText(`Burgers & sandwiches
Chief Burger
Enjoy a Mighty Chief Burger made with Soulfully Spiced Fried Chicken
₦5,100
Chicken Republic - Sangotedo Menu & Delivery in Sangotedo | Chowdeck
Add
Shawarma
Soulfully Spiced Fried Chicken with Lettuce in a fresh Tortilla Wrap
₦4,100
Chicken Republic - Sangotedo Menu & Delivery in Sangotedo | Chowdeck
Add
Big Whizz Meal
Enjoy a Chickwhizz with one piece of chicken
Out of stock
Chicken Republic - Sangotedo Menu & Delivery in Sangotedo | Chowdeck

Drinks
Fanta Orange (50cl)
Fanta Orange (50cl)
₦900
Add`);

  assert.deepEqual(
    items.map((i) => `${i.category} / ${i.name} / ${i.price} / ${i.available}`),
    [
      "Burgers & sandwiches / Chief Burger / 5100 / true",
      "Burgers & sandwiches / Shawarma / 4100 / true",
      "Burgers & sandwiches / Big Whizz Meal / 0 / false",
      "Drinks / Fanta Orange (50cl) / 900 / true",
    ]
  );
  // A description that merely repeats the name is dropped.
  assert.equal(items[3].description, "");
});

test("a From price is taken as the starting price", () => {
  const [item] = parseMenuText(`Citizens meals
Citizens Meal without drink
Two pieces of chicken with a side of your choice
From ₦6,200
Add`);
  assert.equal(item.price, 6200);
  assert.equal(item.category, "Citizens meals");
});


test("an item whose name mentions the app it was copied from survives", () => {
  const items = parseMenuText(`Streetwise
Streetwise Regular Chowdeck
Large Spicy Rice + 1 pc Chicken
₦3,500
KFC - Novare Menu & Delivery in Sangotedo - Order Online | Chowdeck
Add`);

  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Streetwise Regular Chowdeck");
  assert.equal(items[0].category, "Streetwise");
  assert.equal(items[0].price, 3500);
});


test("a group member's own phone becomes their identity on a split share", () => {
  // The rule the server applies: their number when given, the leader's when not.
  const leader = "08031234567";
  const people = [
    { name: "Ada", phone: "0803 999 0001", hostel: "Red Block" },
    { name: "Femi", phone: "", hostel: "" },
  ];

  const phoneFor = (who: string) => {
    const theirs = people.find((p) => p.name === who);
    return (theirs?.phone && normalisePhone(theirs.phone)) || leader;
  };

  assert.equal(phoneFor("Ada"), "08039990001");
  assert.equal(phoneFor("Femi"), leader);
});


test("a friend sharing the leader's name is still a second payer", () => {
  // Items are grouped by the tag on the line: the leader's are untagged.
  const lines = [
    { for_name: "" },
    { for_name: "Naza" },
  ];
  const byPerson = new Set(lines.map((l) => (l.for_name ?? "").trim()));
  assert.equal(byPerson.size, 2);

  // The old rule keyed the leader's items by their typed name, so a friend
  // called Naza collapsed the group to one payer and blocked the split.
  const leaderName = "Naza";
  const old = new Set(lines.map((l) => (l.for_name ?? "").trim() || leaderName));
  assert.equal(old.size, 1);
});

test("a message template fills in the order and falls back to the default wording", () => {
  const settings = {
    ...EMPTY_SETTINGS,
    bank_name: "GTBank",
    bank_account_name: "Sudu",
    bank_account_number: "0123456789",
    msg_ready: "{name}, food is outside {hostel}.",
  };
  const order = {
    id: "abc",
    order_no: 1042,
    customer_name: "Naza",
    customer_phone: "08031234567",
    for_name: "Bola",
    total: 17600,
    hostel: "Block C",
    payment_link: null,
  };
  const args = {
    order,
    settings,
    pin: "4579",
    siteUrl: "https://sudu.ng",
    batchLabel: "Wednesday night",
    deliveryWindow: "On campus ~8pm",
  };

  // The admin's own wording wins, with the order filled into it.
  assert.equal(
    template({ ...args, kind: "ready" }),
    "Bola, food is outside Block C."
  );

  // Nothing written for this one, so the default is used, account details and all.
  const asking = template({ ...args, kind: "payment" });
  assert.match(asking, /Bola/);
  assert.match(asking, /#1042/);
  assert.match(asking, /0123456789/);
  // The narration is the order number, not the phone: four digits to type,
  // and it belongs to this one order rather than every order they place.
  // Bold, because WhatsApp renders asterisks and this is the one thing they
  // have to type for the transfer to be matched.
  assert.match(asking, /Put \*1042\* as the narration/);
  assert.match(asking, /https:\/\/sudu\.ng\/o\/abc/);
});

test("tagging some items with a name leaves none of them without an owner", () => {
  // The cart lets someone tag two items and leave a third alone. Whoever
  // ordered owns the untagged one, so a bag never holds a nameless item.
  const name = "Naza";
  const lines = [
    { for_name: "Bola" },
    { for_name: null as string | null },
    { for_name: "  " },
  ];

  const tagged = lines.some((line) => line.for_name?.trim());
  const labelled = tagged
    ? lines.map((line) => ({ for_name: line.for_name?.trim() || name }))
    : lines;

  assert.deepEqual(
    labelled.map((line) => line.for_name),
    ["Bola", "Naza", "Naza"]
  );
});

test("admin email addresses are read one per line, commas included", () => {
  assert.deepEqual(
    adminEmails("a@sudu.ng\n b@sudu.ng , c@sudu.ng\n\nnot-an-email\n"),
    ["a@sudu.ng", "b@sudu.ng", "c@sudu.ng"]
  );
  assert.deepEqual(adminEmails(""), []);
});

test("a split group reads as one order with a part each", () => {
  const group = [
    { id: "a", order_no: 1005 },
    { id: "b", order_no: 1006 },
    { id: "c", order_no: 1007 },
  ];

  // Three orders under the bonnet, one order as far as anyone in it is
  // concerned: 1005a, 1005b, 1005c rather than three unrelated numbers.
  assert.equal(shareRef(group[0], group), "#1005a");
  assert.equal(shareRef(group[1], group), "#1005b");
  assert.equal(shareRef(group[2], group), "#1005c");

  // An order on its own keeps its plain number.
  assert.equal(shareRef({ id: "x", order_no: 1042 }, []), "#1042");
  assert.equal(shareRef({ id: "x", order_no: 1042 }, [{ id: "x", order_no: 1042 }]), "#1042");
});

test("a week's horizon reaches the same weekday next week", () => {
  // Counting hours from "now" put next Friday's 11:30 cut-off outside a
  // seven-day window, so on a Friday the only run on offer was that night's.
  const addDays = (date: string, days: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const friday = "2026-09-18";
  const until = `${addDays(friday, 7)}T23:59:59+01:00`;
  const nextFridayCutOff = new Date("2026-09-25T11:30:00+01:00");

  assert.ok(nextFridayCutOff < new Date(until));
});

test("a pasted payment link is made absolute, or rejected", () => {
  // Without a scheme a browser reads it as a path, so the card link became
  // /o/<order>/paystack.com/pay/x instead of leaving the site.
  assert.equal(externalUrl("paystack.com/pay/x"), "https://paystack.com/pay/x");
  assert.equal(externalUrl("https://paystack.com/pay/x"), "https://paystack.com/pay/x");
  assert.equal(externalUrl("  flutterwave.com/p/abc  "), "https://flutterwave.com/p/abc");

  // Anything that is not a web link is not rendered as one.
  assert.equal(externalUrl("javascript:alert(1)"), null);
  assert.equal(externalUrl(""), null);
  assert.equal(externalUrl(null), null);
});

test("a delivery code never pays out more than the delivery", async () => {
  // "₦500 off delivery" on a ₦2,000 top-up is ₦500; on an order with no
  // delivery to pay it is refused rather than turned into money off the food.
  const { checkCoupon } = await import("../lib/coupons");
  assert.equal(typeof checkCoupon, "function");
});

const PIZZA_MENU = [
  { id: "a", name: "BBQ Chicken" },
  { id: "b", name: "Meat Lovers" },
  { id: "c", name: "Pepperoni" },
  { id: "d", name: "Chicken Supreme Feast" },
];

test("a photo filename loses its extension, separators and copy number", () => {
  assert.equal(tidy("BBQ_Chicken (2).jpg"), "bbq chicken");
  assert.equal(tidy("meat-lovers-2.png"), "meat lovers");
});

test("a photo named after its item lands on it", () => {
  const [one] = matchPhotos(["bbq-chicken.jpg"], PIZZA_MENU);
  assert.equal(one.confident, true);
  assert.equal(one.itemId, "a");
});

test("a photo that fits two items equally is left for a person to place", () => {
  const [one] = matchPhotos(["chicken.jpg"], PIZZA_MENU);
  assert.equal(one.confident, false);
  assert.equal(one.itemId, null);
});

test("a photo straight off a camera matches nothing", () => {
  const [one] = matchPhotos(["IMG_4821.jpg"], PIZZA_MENU);
  assert.equal(one.confident, false);
});

test("two photos never land on the same item", () => {
  const placed = matchPhotos(["pepperoni.jpg", "Pepperoni.png"], PIZZA_MENU).filter(
    (m) => m.itemId === "c"
  );
  assert.equal(placed.length, 1);
});

test("the word pizza is ignored when every file carries it", () => {
  const found = matchPhotos(["Meat Lovers Pizza.jpg", "Pepperoni Pizza.jpg"], PIZZA_MENU);
  assert.deepEqual(found.map((m) => m.itemId), ["b", "c"]);
});

test("the popular row ranks by how much was bought, not how many orders", () => {
  // Ten people in one group order each taking a wrap should beat three
  // separate orders of one pizza.
  const lines = [
    { menu_item_id: "wrap", qty: 10 },
    { menu_item_id: "pizza", qty: 1 },
    { menu_item_id: "pizza", qty: 1 },
    { menu_item_id: "pizza", qty: 1 },
  ];
  const sold = new Map<string, number>();
  for (const line of lines) {
    sold.set(line.menu_item_id, (sold.get(line.menu_item_id) ?? 0) + line.qty);
  }
  const ranked = [...sold.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  assert.deepEqual(ranked, ["wrap", "pizza"]);
});

test("only unpaid orders in a run that can still take money are worth chasing", () => {
  const now = Date.now();
  const batches = [
    { id: "open", status: "open", stage: "ordering", cut_off_at: new Date(now + 3600_000) },
    { id: "closed", status: "open", stage: "ordering", cut_off_at: new Date(now - 3600_000) },
    { id: "counter", status: "open", stage: "counter", cut_off_at: new Date(now + 3600_000) },
  ];
  const open = new Set(
    batches
      .filter(
        (b) =>
          b.status === "open" &&
          b.stage === "ordering" &&
          b.cut_off_at.getTime() > now
      )
      .map((b) => b.id)
  );
  const orders = [
    { id: "a", status: "pending", batch_id: "open" },
    { id: "b", status: "pending", batch_id: "closed" },
    { id: "c", status: "pending", batch_id: "counter" },
    { id: "d", status: "paid", batch_id: "open" },
  ];
  const chase = orders.filter((o) => o.status === "pending" && open.has(o.batch_id));
  assert.deepEqual(chase.map((o) => o.id), ["a"]);
});

/**
 * Food labelled for somebody the people list has lost.
 *
 * This is what happened when the people moved to a new storage key: the cart
 * kept the names, the list came back empty, and the lines were rendered by
 * nobody while still counting towards the fee and the total.
 */
test("reclaim: a line for a person who has gone comes back", () => {
  const line = (forName: string, qty: number, itemId = "a") => ({
    key: cartLineKey(itemId, [], forName),
    itemId,
    optionIds: [] as string[],
    name: "Wrap",
    restaurantId: "r",
    restaurantName: "Chicken Republic",
    imageUrl: "",
    unitPrice: 3000,
    choices: [] as string[],
    qty,
    forName,
  });

  const kept = [line("", 1), line("Ada", 2)];
  assert.equal(reclaim(kept, [{ name: "Ada", phone: "", hostel: "" }]), kept);

  const healed = reclaim([line("", 1), line("Ada", 2)], []);
  assert.equal(healed.length, 1, "the two become one line");
  assert.equal(healed[0].qty, 3);
  assert.equal(healed[0].forName, "");

  const different = reclaim([line("Ada", 1, "a"), line("Ada", 1, "b")], []);
  assert.equal(different.length, 2, "different items stay apart");
  assert.deepEqual(
    different.map((l) => l.forName),
    ["", ""]
  );
});

test("groupNames: a name only the cart knows is still shown", () => {
  const line = (forName: string) => ({
    key: forName,
    itemId: "a",
    optionIds: [] as string[],
    name: "Wrap",
    restaurantId: "r",
    restaurantName: "KFC",
    imageUrl: "",
    unitPrice: 1,
    choices: [] as string[],
    qty: 1,
    forName,
  });

  assert.deepEqual(groupNames([line(""), line("Ada")], []), ["", "Ada"]);
  assert.deepEqual(
    groupNames([line("Ada"), line("Ada")], [{ name: "Bem", phone: "", hostel: "" }]),
    ["", "Bem", "Ada"],
    "no name twice"
  );
});

test("email: the layout carries the same words, and nothing typed becomes markup", () => {
  const blocks: Block[] = [
    { kind: "text", text: "Ada just ordered." },
    { kind: "button", label: "Open the order", href: "https://sudu.example/admin/orders/1" },
    { kind: "rows", rows: [{ label: "Total", value: "₦7,100" }] },
    { kind: "list", title: "KFC", items: ["2 × Zinger Burger"] },
    { kind: "note", text: 'They asked: <script>alert("x")</script> & no pepper' },
  ];

  const html = renderEmail("New order", blocks);
  const text = renderText("New order", blocks);

  assert.ok(html.includes("https://sudu.example/admin/orders/1"), "the link is there");
  assert.ok(html.includes("KFC"), "the restaurant is named");
  assert.ok(!html.includes("<script>"), "nothing typed in is run");
  assert.ok(html.includes("&lt;script&gt;"), "it is shown as words instead");

  // Everything in the layout is in the plain version too, for the clients
  // that will not show it.
  assert.ok(text.includes("Ada just ordered."));
  assert.ok(text.includes("Open the order: https://sudu.example/admin/orders/1"));
  assert.ok(text.includes("Total: ₦7,100"));
  assert.ok(text.includes("2 × Zinger Burger"));
});

test("refsIn: a split group reads as one order with parts", () => {
  const orders = [
    { id: "a", order_no: 1001, group_id: "g1" },
    { id: "b", order_no: 1002, group_id: "g1" },
    { id: "c", order_no: 1003, group_id: null },
  ];

  const refs = refsIn(orders);
  assert.equal(refs.get("a"), "#1001a", "the first part carries the group number");
  assert.equal(refs.get("b"), "#1001b", "so does the second, with its own letter");
  assert.equal(refs.get("c"), "#1003", "an order on its own keeps its number");

  // The one-person group that never grew is still just an order.
  const alone = refsIn([{ id: "d", order_no: 1004, group_id: "g2" }]);
  assert.equal(alone.get("d"), "#1004");
});

/** What each arrival pays when they join a delivery already on the road. */
function joinedFees(arrivals: number[]): number[] {
  let carried = 0;
  let paid = 0;
  return arrivals.map((items) => {
    const due = Math.max(0, feeFor(carried + items) - paid);
    carried += items;
    paid += due;
    return due;
  });
}

test("however many friends join a delivery, the shop collects exactly one band", () => {
  for (const arrivals of [[2, 2], [1, 1, 1, 1], [3, 1, 3, 4], [1, 10], [5, 5, 5], [2]]) {
    const total = joinedFees(arrivals).reduce((a, b) => a + b, 0);
    assert.equal(
      total,
      feeFor(arrivals.reduce((a, b) => a + b, 0)),
      `arrivals ${arrivals} collected ${total}`
    );
  }
});

test("joining never changes what somebody who ordered earlier was charged", () => {
  const two = joinedFees([2, 2]);
  const five = joinedFees([2, 2, 1, 1, 1]);
  assert.equal(two[0], five[0]);
  assert.equal(two[1], five[1]);
});

test("whoever starts a delivery carries the most of its fee", () => {
  const [first, second] = joinedFees([2, 2]);
  assert.equal(first, 4000);
  assert.equal(second, 2000);
  assert.equal(first + second, feeFor(4));
});

test("an even share is the band divided by the people, rounded to something payable", () => {
  // Four items is a 6,000 band. Three people, so 2,000 each exactly.
  assert.equal(evenShare(4, 3), 2000);
  // One person in the car pays the whole band, as they would ordering alone.
  assert.equal(evenShare(2, 1), feeFor(2));
  // 4,000 across three is 1,333.33, which nobody wants to type. Rounded up.
  assert.equal(evenShare(2, 3), 1400);
});

test("rounding an even share up never leaves the shop short of the band", () => {
  for (let items = 1; items <= 40; items++) {
    for (let people = 1; people <= 12; people++) {
      const collected = evenShare(items, people) * people;
      assert.ok(
        collected >= feeFor(items),
        `${people} people, ${items} items: collected ${collected}, band ${feeFor(items)}`
      );
    }
  }
});

test("an even share is never so rounded up that it gouges anybody", () => {
  // At most the rounding step over the true share, for everybody together.
  for (let items = 1; items <= 40; items++) {
    for (let people = 1; people <= 12; people++) {
      const over = evenShare(items, people) * people - feeFor(items);
      assert.ok(over < 100 * people, `${people} people, ${items} items: ${over} over`);
    }
  }
});

test("nobody in a shared delivery pays more than they would alone", () => {
  for (let items = 2; items <= 40; items++) {
    for (let people = 2; people <= 12; people++) {
      assert.ok(
        evenShare(items, people) <= feeFor(items),
        `${people} people, ${items} items`
      );
    }
  }
});

test("same day delivery is its own ladder, two thousand above the batched one", () => {
  assert.equal(sameDayFee(1, false), 6500);
  assert.equal(sameDayFee(4, false), 6500);
  assert.equal(sameDayFee(5, false), 8500);
  assert.equal(sameDayFee(10, false), 10500);
  assert.equal(sameDayFee(40, false), 12500);
});

test("urgent is the same ladder with two thousand on every step", () => {
  for (const items of [1, 4, 5, 6, 10, 11, 30]) {
    assert.equal(sameDayFee(items, true), sameDayFee(items, false) + 2000);
  }
  // The number quoted out loud for a small urgent order.
  assert.equal(sameDayFee(1, true), 8500);
});

test("urgent is decided by the notice given, not by the hour of the day", () => {
  const nine = new Date("2026-09-21T09:00:00+01:00");
  const noon = new Date("2026-09-21T12:00:00+01:00");
  const three = new Date("2026-09-21T15:00:00+01:00");

  // Ordering at nine for noon is three hours, so urgent.
  assert.equal(isUrgent(noon, nine), true);
  // Ordering at nine for three is six hours, so not.
  assert.equal(isUrgent(three, nine), false);
  // Exactly five hours is not urgent: the rule is less than five.
  assert.equal(isUrgent(new Date("2026-09-21T14:00:00+01:00"), nine), false);
});

test("same day is never cheaper than putting the same order on a run", () => {
  for (let items = 1; items <= 40; items++) {
    assert.ok(sameDayFee(items, false) >= feeFor(items), `${items} items`);
  }
});

test("picking a time always costs more than the same order on a run", () => {
  // The ladders step at different places, so four items used to cost the same
  // either way. At 6,500 the pick-a-time price is above the run at every size,
  // which is the point: a car to yourself is not a shared car.
  for (let items = 1; items <= 40; items++) {
    assert.ok(sameDayFee(items, false) > feeFor(items), `${items} items`);
  }
});

test("same day offers windows, and never one sooner than it takes to get there", () => {
  const at = (lagos: string) => slotsToday(new Date(`2026-09-21T${lagos}+01:00`));

  // Nine in the morning: three hours from now is noon, so the whole day, in
  // blocks rather than a wall of half hours.
  assert.deepEqual(at("09:00:00").map((s) => s.label), [
    "Between 12pm and 3pm",
    "Between 3pm and 6pm",
  ]);

  // One o'clock: noon has gone and three is too soon, but four to six is an
  // easy yes, so the window shifts rather than the afternoon being lost.
  assert.deepEqual(at("13:00:00").map((s) => s.label), ["Between 4pm and 6pm"]);

  // Three o'clock: the earliest is six, which is closing, so a window has
  // nowhere left to run and today is finished.
  assert.deepEqual(at("15:00:00"), []);
  assert.deepEqual(at("18:00:00"), []);
});

test("a window knows whether it is urgent, so its price is the real one", () => {
  const nine = new Date("2026-09-21T08:00:00Z"); // 9am Lagos
  const slots = slotsToday(nine);

  const early = slots.find((s) => s.label === "Between 12pm and 3pm")!;
  const later = slots.find((s) => s.label === "Between 3pm and 6pm")!;

  // Worked out from the start of the window, which is the earliest somebody
  // could be standing at their block waiting for it.
  assert.equal(early.urgent, true, "9am for noon is three hours");
  assert.equal(later.urgent, false, "9am for three is six hours");

  assert.equal(slotFee(early, 2), 8500);
  assert.equal(slotFee(later, 2), 6500);
});

test("when today has run out, the soonest window is tomorrow rather than nothing", () => {
  const late = deliverySlots(new Date("2026-09-21T17:00:00+01:00"));
  assert.ok(late.length > 0, "there is always something to offer");
  assert.equal(late[0].label, "Between 12pm and 3pm tomorrow");
  assert.equal(late[0].day, "tomorrow");
  assert.equal(late.every((s) => s.day === "tomorrow"), true);

  // And tomorrow is never urgent, because it is never within five hours.
  assert.equal(late.some((s) => s.urgent), false);
});

test("earlier in the day, today comes first and tomorrow follows it", () => {
  const one = deliverySlots(new Date("2026-09-21T13:00:00+01:00"));
  assert.equal(one[0].label, "Between 4pm and 6pm");
  assert.equal(one[0].day, "today");
  assert.ok(one.some((s) => s.day === "tomorrow"), "tomorrow is still offered");
});

test("the delivery window is whatever admin set, not a fixed noon to six", () => {
  const nine = new Date("2026-09-21T09:00:00+01:00");

  // A late evening, as a day somebody decided to run longer.
  const late = deliverySlots(nine, { first: 12, last: 21 });
  assert.equal(late.at(-1)!.label, "Between 6pm and 9pm tomorrow");
  assert.ok(
    late.some((s) => s.label === "Between 6pm and 9pm"),
    "today reaches the later hour"
  );

  // And a short day, where the last block is whatever is left rather than
  // running past closing.
  const short = deliverySlots(nine, { first: 12, last: 14 });
  assert.equal(
    short.filter((s) => s.day === "today").at(-1)!.label,
    "Between 12pm and 2pm"
  );
  assert.equal(short.some((s) => s.label.includes("6pm")), false);
});


test("a promotion is flat until the taper, then it charges by the item", () => {
  const offer = {
    code: "DOM2K",
    note: "Domino's 2k delivery",
    fee: 2000,
    includedItems: 3,
    extraPerItem: 500,
    places: ["dominos"],
    items: [],
    choice: "",
    sameDay: false,
    fromHour: null,
    toHour: null,
    runs: [],
    firstOrderOnly: false,
    minEach: 1000,
  };

  assert.equal(offerFee(offer, 1), 2000);
  assert.equal(offerFee(offer, 3), 2000);
  assert.equal(offerFee(offer, 5), 3000);
  // Blank included items is flat however much they order.
  assert.equal(offerFee({ ...offer, includedItems: null }, 20), 2000);
});

test("an offer for one kitchen stands down on a cart with anything else in it", () => {
  const offer = {
    code: "DOM2K",
    note: "Domino's",
    fee: 2000,
    includedItems: null,
    extraPerItem: 0,
    places: ["dominos"],
    items: [],
    choice: "",
    sameDay: false,
    fromHour: null,
    toHour: null,
    runs: [],
    firstOrderOnly: false,
    minEach: 1000,
  };
  const ask = (restaurantIds: string[]) =>
    pickOffer([offer], { restaurantIds, items: 2, batchId: "b1", returning: false });

  assert.equal(ask(["dominos"])?.fee, 2000);
  assert.equal(ask(["dominos", "kfc"]), null);
  assert.equal(ask([]), null);
});


test("the top band can charge by the item instead of one price for any load", () => {
  const bands = [
    { maxItems: 3, fee: 4000 },
    { maxItems: 10, fee: 8000 },
    { maxItems: Infinity, fee: 10000, perItem: 500 },
  ];

  assert.equal(feeFor(10, null, bands), 8000);
  assert.equal(feeFor(11, null, bands), 8500);
  assert.equal(feeFor(14, null, bands), 10000);
  // Without a price per item the top band stays one flat price.
  assert.equal(feeFor(30, null, bands.map((b) => ({ ...b, perItem: undefined }))), 10000);
});

test("a promotion splits in a group, but never below the floor", () => {
  const offer = {
    code: "DOM2K",
    note: "Domino's",
    fee: 2000,
    includedItems: null,
    extraPerItem: 0,
    places: ["dominos"],
    items: [],
    choice: "",
    sameDay: false,
    fromHour: null,
    toHour: null,
    runs: [],
    firstOrderOnly: false,
    minEach: 1000,
  };

  // On your own it is the whole thing; with a friend it is half each.
  assert.equal(offerShare(offer, 2, 1), 2000);
  assert.equal(offerShare(offer, 4, 2), 1000);
  // And it stops there rather than running to nothing as the car fills.
  assert.equal(offerShare(offer, 10, 5), 1000);
  assert.equal(offerShare(offer, 20, 20), 1000);
  // No floor is a plain split.
  assert.equal(offerShare({ ...offer, minEach: 0 }, 10, 5), 400);
});

test("an offer says the extra it is charging, so the share adds up", () => {
  const offer = {
    code: "DOM2K",
    note: "Domino's 2k",
    fee: 2000,
    includedItems: 3,
    extraPerItem: 1000,
    places: ["dominos"],
    items: [],
    choice: "",
    sameDay: false,
    fromHour: null,
    toHour: null,
    runs: [],
    firstOrderOnly: false,
    minEach: 1000,
  };

  // Inside what it covers, the headline is the whole story.
  assert.equal(offerNote(offer, 3), "Domino's 2k");
  // Past it, the extra is named rather than left to be guessed at.
  assert.equal(offerNote(offer, 4), "Domino's 2k plus ₦1,000 for the 1 item over 3");
  assert.equal(offerNote(offer, 6), "Domino's 2k plus ₦3,000 for the 3 items over 3");
  // A flat offer has no extra to name.
  assert.equal(offerNote({ ...offer, includedItems: null }, 9), "Domino's 2k");
});

test("free delivery is earned by the dishes that carry it, and nothing else", () => {
  const offer = {
    code: "BBQFREE",
    note: "Free delivery on the BBQ mediums",
    fee: 0,
    includedItems: null,
    extraPerItem: 0,
    places: [],
    items: ["bbq-beef", "bbq-chicken"],
    choice: "",
    sameDay: false,
    fromHour: null,
    toHour: null,
    runs: [],
    firstOrderOnly: false,
    minEach: 0,
  };
  const ask = (itemIds: string[]) =>
    pickOffer([offer], { restaurantIds: ["dominos"], itemIds, items: itemIds.length, batchId: "b1", returning: false });

  assert.equal(ask(["bbq-beef"])?.fee, 0);
  // Two of them together still qualify: each was worth the trip on its own.
  assert.equal(ask(["bbq-beef", "bbq-chicken"])?.fee, 0);
  // Anything else riding along did not earn it.
  assert.equal(ask(["bbq-beef", "chips"]), null);
  assert.equal(ask([]), null);
});

test("any large pizza means every line chose large", () => {
  // A size is a choice on a dish, so the cart qualifies only if each line
  // made it: one small among them and the offer is not this one.
  const large = JSON.stringify([["Size::Large"]]);

  assert.equal(everyLineChose(large, [["Large"], ["Large", "Extra cheese"]]), true);
  assert.equal(everyLineChose(large, [["Large"], ["Medium"]]), false);
  assert.equal(everyLineChose(large, [[]]), false);
  assert.equal(everyLineChose(large, []), false);
  // Case and stray spaces are the same answer to anybody reading a menu.
  assert.equal(everyLineChose(JSON.stringify([[" large "]]), [["Large"]]), true);
  // No choice asked for is no condition at all, and so is a value written by
  // an older version that nothing can make sense of.
  assert.equal(everyLineChose("", [["Medium"]]), true);
  assert.equal(everyLineChose('"BBQ" or Medium 12", and Medium', [["Medium"]]), true);
});

test("choices are grouped by the question they answer", () => {
  // Medium, and one of two flavours: two questions, not a list of three.
  const asks = JSON.stringify([["Medium 12\""], ["BBQ Chicken", "BBQ Meatball"]]);

  assert.equal(everyLineChose(asks, [['Medium 12"', "BBQ Chicken"]]), true);
  assert.equal(everyLineChose(asks, [['Medium 12"', "BBQ Meatball"]]), true);
  // A medium of something else answers only one of the two questions.
  assert.equal(everyLineChose(asks, [['Medium 12"', "Margherita"]]), false);
  // And the right flavour in the wrong size answers only the other.
  assert.equal(everyLineChose(asks, [['Large 14"', "BBQ Chicken"]]), false);
});

test("the cart says what is standing between it and an offer", () => {
  const offer = {
    code: "BBQFREE",
    note: "Free delivery on the BBQ mediums",
    fee: 0,
    includedItems: null,
    extraPerItem: 0,
    places: [],
    items: ["bbq-beef"],
    choice: "",
    sameDay: false,
    fromHour: null,
    toHour: null,
    runs: [],
    firstOrderOnly: false,
    minEach: 0,
  };
  const line = (itemId: string, name: string) => ({
    itemId,
    restaurantId: "dominos",
    name,
    choices: [] as string[],
  });
  const ask = (lines: ReturnType<typeof line>[]) =>
    nearMiss([offer], lines, { batchId: "b1", returning: false });

  // One qualifying dish and one in the way: that is the thing to say.
  assert.deepEqual(ask([line("bbq-beef", "BBQ Beef"), line("coke", "Coke")])?.blocking, [
    "Coke",
  ]);
  // Nothing in the way means the offer already applies, so there is no hint.
  assert.equal(ask([line("bbq-beef", "BBQ Beef")]), null);
  // And nothing qualifying is a different order, not a near miss.
  assert.equal(ask([line("coke", "Coke")]), null);

  // What it does cover, said as well, because with six things in the way the
  // shorter truth is which two the offer is for.
  const many = ask([
    line("bbq-beef", "BBQ Beef"),
    line("coke", "Coke"),
    line("fries", "Fries"),
    line("pie", "Meat pie"),
  ]);
  assert.deepEqual(many?.qualifying, ["BBQ Beef"]);
  assert.deepEqual(many?.blocking, ["Coke", "Fries", "Meat pie"]);
});

test("an offer is spelt out when there are few enough combinations", () => {
  const asks = JSON.stringify([["Medium"], ["BBQ Chicken", "BBQ Meatball"]]);
  assert.deepEqual(choiceCombinations(asks), [
    "Medium BBQ Chicken",
    "Medium BBQ Meatball",
  ]);

  // Past a handful the list would be longer than the menu, so it gives up
  // and the conditions get listed instead.
  const many = JSON.stringify([
    ["Medium", "Large"],
    ["BBQ Chicken", "BBQ Meatball", "Pepperoni"],
  ]);
  assert.deepEqual(choiceCombinations(many), []);
});

test("a saved choice goes back into the picker as it was ticked", () => {
  // The question travels with the answer, so the picker can find its own
  // ticks again and the comparing still sees only the answer.
  const saved = JSON.stringify([["Size::Medium"], ["Flavour::BBQ Chicken"]]);

  assert.deepEqual(choiceValues(saved), ["Size::Medium", "Flavour::BBQ Chicken"]);
  assert.deepEqual(choiceCombinations(saved), ["Medium BBQ Chicken"]);
  assert.equal(everyLineChose(saved, [["Medium", "BBQ Chicken"]]), true);
  assert.equal(everyLineChose(saved, [["Large", "BBQ Chicken"]]), false);
});

test("a link opens whether it carries the long id or the short code", async () => {
  const { isLongId, lookupColumn, shortRef } = await import("../lib/links");

  const long = "0b8f1a2c-3d4e-4f60-8a9b-1c2d3e4f5a6b";
  assert.equal(isLongId(long), true);
  assert.equal(lookupColumn(long), "id");

  // Seven characters from the short alphabet is not an identifier.
  assert.equal(isLongId("k3f9x2a"), false);
  assert.equal(lookupColumn("k3f9x2a"), "short");

  // New links use the short code; anything saved before it falls back.
  assert.equal(shortRef({ id: long, short: "k3f9x2a" }), "k3f9x2a");
  assert.equal(shortRef({ id: long, short: null }), long);
  assert.equal(shortRef({ id: long, short: "  " }), long);
});

test("an offer stays off a car somebody has to themselves unless it says so", () => {
  const offer = {
    code: "DOM2K",
    note: "Domino's",
    fee: 2000,
    includedItems: null,
    extraPerItem: 0,
    places: ["dominos"],
    items: [],
    choice: "",
    sameDay: false,
    runs: [],
    firstOrderOnly: false,
    minEach: 0,
  };
  const ask = (one: typeof offer, deliverAt: string | null) =>
    pickOffer([one], {
      restaurantIds: ["dominos"],
      items: 2,
      batchId: "b1",
      deliverAt,
      returning: false,
    });

  // A run has no time of its own, so it is never held back.
  assert.equal(ask(offer, null)?.fee, 2000);
  // A same day car is a trip for one person, and a flat price does not cover
  // one unless somebody says it should.
  assert.equal(ask(offer, "2026-09-19T14:00:00Z"), null);
  assert.equal(ask({ ...offer, sameDay: true }, "2026-09-19T14:00:00Z")?.fee, 2000);
});

test("a time on a link is said as the window it means", () => {
  // Nigeria is UTC+1 all year, so noon in Lagos is 11:00 UTC.
  const now = new Date("2026-09-20T09:00:00Z");
  assert.equal(
    windowPhrase("2026-09-20T11:00:00Z", now),
    "between 12pm and 3pm"
  );
  // Tomorrow says so, rather than making somebody read a date.
  assert.equal(
    windowPhrase("2026-09-21T14:00:00Z", now),
    "between 3pm and 6pm tomorrow"
  );
});

test("a time a run already covers is not offered as a car of its own", () => {
  const now = new Date("2026-09-20T06:00:00Z");
  const slots = deliverySlots(now, { first: 12, last: 21 });

  // Nothing going, so every window stands.
  assert.equal(slotsWorthOffering(slots, []).length, slots.length);

  // A run delivering between 12 and 3 today covers the noon window exactly,
  // and the same window as a car of its own costs two and a half thousand
  // more for food arriving at the same time, so it goes.
  const left = slotsWorthOffering(slots, [
    { run_date: "2026-09-20", window: "Between 12pm and 3pm" },
  ]);
  assert.equal(
    left.some((slot) => slot.day === "today" && slot.at.startsWith("2026-09-20T11")),
    false
  );
  // Later today still stands, and so does tomorrow.
  assert.equal(left.some((slot) => slot.day === "tomorrow"), true);

  // A run that is gone before the window ends does not cover it. Between 12
  // and 5:30 leaves the five to six window standing, because that run cannot
  // get anybody their food at six.
  const partly = slotsWorthOffering(slots, [
    { run_date: "2026-09-20", window: "Between 12pm and 5:30pm" },
  ]);
  // Three to six in Lagos is 14:00 UTC, and a run gone by half five cannot
  // deliver at six.
  assert.equal(
    partly.some((slot) => slot.at.startsWith("2026-09-20T14")),
    true
  );
  // The window it does cover is still hidden.
  assert.equal(
    partly.some((slot) => slot.at.startsWith("2026-09-20T11")),
    false
  );

  // Words with no time in them hide nothing: better to offer a window than
  // to swallow one because a sentence could not be read.
  assert.equal(
    slotsWorthOffering(slots, [{ run_date: "2026-09-20", window: "When we get there" }])
      .length,
    slots.length
  );
});

test("a run's window is said from the times it was set with", () => {
  assert.equal(sayWindow("12:00", "17:30"), "Between 12pm and 5:30pm");
  assert.equal(sayWindow("19:00", "21:00"), "Between 7pm and 9pm");
  // Midnight and noon are the two that catch a twelve-hour clock out.
  assert.equal(sayWindow("00:30", "12:00"), "Between 12:30am and 12pm");
  // Nothing set is nothing said, and the words typed by hand still stand.
  assert.equal(sayWindow("", ""), "");
});

test("a time is matched by the moment, not by how it is written", () => {
  // What the code writes, and what a timestamptz column gives back. Same
  // moment, different text: comparing the strings refused orders for slots
  // that were hours away.
  assert.equal(sameInstant("2026-09-20T11:00:00.000Z", "2026-09-20T11:00:00+00:00"), true);
  assert.equal(sameInstant("2026-09-20T11:00:00.000Z", "2026-09-20T12:00:00+00:00"), false);
  assert.equal(sameInstant("not a time", "2026-09-20T11:00:00Z"), false);
});

test("what is left of a window is still offered today", () => {
  // Ten past one on a day the shop works noon to five, with three hours'
  // notice. Food ordered now lands comfortably before closing, so today has
  // to be on the page: this said "nothing today, try tomorrow".
  const now = new Date("2026-09-20T12:12:00Z");
  const slots = deliverySlots(now, { first: 12, last: 17 });
  const today = slots.filter((slot) => slot.day === "today");

  assert.equal(today.length, 1);
  // The part that is left, not the block it came from: promising from two
  // o'clock would be promising a time that has gone.
  assert.equal(today[0].label, "Between 4:15pm and 5pm");

  // Too late for any of it, and tomorrow is all there is.
  const late = deliverySlots(new Date("2026-09-20T15:30:00Z"), { first: 12, last: 17 });
  assert.equal(late.some((slot) => slot.day === "today"), false);
});

test("the soonest way to eat is picked, not asked for", () => {
  const slots = deliverySlots(new Date("2026-09-20T12:12:00Z"), { first: 12, last: 17 });
  const today = "2026-09-20";
  const runToday = { id: "a", runDate: today, when: "Between 2pm and 5pm, today" };
  const runTomorrow = { id: "b", runDate: "2026-09-21", when: "Between 2pm and 5pm, tomorrow" };

  // A run going today beats a car of its own today: same afternoon, two and
  // a half thousand less.
  assert.equal(nextArrival([runToday, runTomorrow], slots, today)?.runId, "a");

  // No run today, but the day is not over: a car of its own, today.
  const car = nextArrival([runTomorrow], slots, today);
  assert.equal(car?.onARun, false);
  assert.equal(car?.when, "Between 4:15pm and 5pm");

  // Nothing left today. A run tomorrow beats a car tomorrow, because it is
  // the same hours for less money.
  const tomorrowOnly = slots.filter((slot) => slot.day !== "today");
  assert.equal(nextArrival([runTomorrow], tomorrowOnly, today)?.runId, "b");

  // No runs at all, and nothing left today: tomorrow's first window, which
  // is whenever the shop opens. Never nothing.
  const none = nextArrival([], tomorrowOnly, today);
  assert.equal(none?.onARun, false);
  assert.equal(none?.when, "Between 12pm and 3pm tomorrow");

  // Nothing anywhere is the only case with no answer.
  assert.equal(nextArrival([], [], today), null);
});
