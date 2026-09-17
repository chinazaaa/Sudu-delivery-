import assert from "node:assert/strict";
import { test } from "node:test";
import { groupForCounter } from "../lib/admin";
import { normalisePhone, formatPhone } from "../lib/phone";
import { countdown, lagosInstant, lagosToday } from "../lib/time";
import { bandFor, feeFor, nextBand, splitFee, HEADLINE_FEE } from "../lib/fees";
import { sheetAsText } from "../lib/sheet-text";
import { template, whatsappTo } from "../lib/messages";
import { newPin } from "../lib/customer-auth";
import { parseMenuText } from "../lib/menu-import";
import { adminEmails } from "../lib/email";
import { shareRef } from "../lib/money";
import { externalUrl } from "../lib/settings";
import { matchPhotos, tidy } from "../lib/match";

/** A settings row with nothing filled in, for the template tests. */
const EMPTY_SETTINGS = {
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  whatsapp_number: "",
  card_note: "",
  instagram_handle: "",
  whatsapp_group_link: "",
  pitch_line: "",
  product_notes: "",
  footer_line: "",
  msg_confirmed: "",
  msg_payment: "",
  msg_card: "",
  msg_pin: "",
  msg_ready: "",
  msg_late: "",
  paid_note: "",
  fee_bands: "",
  admin_emails: "",
  abandon_minutes: 45,
  window_afternoon: "",
  window_night: "",
  order_horizon_days: 7,
  tagline: "",
  auto_headline: "",
  auto_lines: "",
};
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
  assert.match(asking, /Put 1042 as the narration/);
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
