import { otherWorthSaying } from "../lib/arrival";
import { windowStart, worthACar } from "../lib/pick-a-day";
import { easterSunday, motheringSunday, mothersDayMay, nextOf, valentines } from "../lib/feasts";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { anythingLeft, stillToGo, takingLastMinute } from "../lib/last-minute";
import { runCarries } from "../lib/run-places";
import { withIce, withoutIce } from "../lib/ice";
import { runToWorkOn, type RunToPick } from "../lib/which-run";
import { dayCostSoFar, shareOut, splitDayCosts } from "../lib/day-costs";
import { windowGone } from "../lib/last-minute";
import { carsBeforeTheRun } from "../lib/one-driver";
import { dayAfter, daySaid, daysOnOffer, dayOfChoice, soonestDay } from "../lib/pick-a-day";
import { carsStillDrivable, driverIsOut } from "../lib/one-driver";
import { saidPick, saidPicks, saidPicksLine } from "../lib/picks";
import { closureSaid, datesIn, isOn, rangeLabel } from "../lib/closures";
import { containersIn } from "../lib/containers";
import { runShouldBe } from "../lib/run-follow";
import { likelyOrders, mentions, nameOverlap, readAlert, settledBy } from "../lib/alerts";
import { svixSigned } from "../lib/svix";
import { addressOf, isAlert, replySubject, senderName, snippet, vouchedFor } from "../lib/mail";
import { tidyCode, whyNotACode } from "../lib/promoter-applications";
import { tidyName } from "../lib/case";
import { AISLES, aislesFrom, guessAisle } from "../lib/aisles";
import { nextLanding, owed, type Plan } from "../lib/plans";
import { adminStageLabel, adminStatusWord, STAGE_LABEL } from "../lib/stages";
import { channelOfSite, tidyChannel, tidyHandle } from "../lib/came-from";
import { weekAround } from "../lib/time";
import { monthOf, nextMonth } from "../lib/standing";
import { googleTagId, instagramLink, numberOr, shopEmails, xLink } from "../lib/settings";
import { isExtra } from "../lib/shelf";
import { shelfSeo } from "../lib/shelf-seo";
import { emptyAndDone } from "../lib/batches";
import { stillAGuess } from "../lib/profit";
import { pauseAfter, waitLeft, waitSaid } from "../lib/admin-gate";
import { signingKey } from "../lib/signing";
import {
  costFrom,
  expectedFoodCost,
  keptOn,
  lineCost,
  raisedCost,
  sellingFrom,
} from "../lib/cost-price";
import {
  owedByShrinking,
  owesSomething,
  refundSaid,
  soldOutSaid,
} from "../lib/refunds";
import { buyingDone } from "../lib/runner";
import { didYouMean } from "../lib/did-you-mean";
import { looksLikeABasket, looksLikeAGift, orderPart } from "../lib/occasions";
import {
  feeByStep,
  feeRidingAlong,
  parseStepFee,
  serialiseStepFee,
} from "../lib/step-fee";
import {
  isCustom,
  liveRoutes,
  parcelsFrom,
  placesSaid,
  pricedRoutes,
  type Route as ParcelRoute,
} from "../lib/parcels";
import {
  MOST,
  NOTHING_READ,
  botModel,
  isCorrection,
  howMany,
  readIntent,
  shopBrief,
  worthActingOn,
} from "../lib/bot-brain";
import {
  counterKey,
  counterMessage,
  expectedAt,
  gotList,
  hasGot,
  howToOrderAhead,
  paysAtCounter,
  runProgress,
  whoOrdered,
  stillDriving,
  withGot,
} from "../lib/runner";
import {
  collectedFrom,
  everyPair,
  everywhere,
  mixedExtra,
  parseAreaPairs,
  serialiseAreaPairs,
  withExtra,
  carGoesOn,
  MIXED_AREA_EXTRA,
} from "../lib/areas";
import { opensOn } from "../lib/open-days";
import { dayAsked, nextOn, sayWhen } from "../lib/bot-days";
import {
  applyWanted,
  emptiesIt,
  somethingChanged,
  whyNotChangeable,
  MOST_OF_ONE,
} from "../lib/order-change";
import { cartsInTime, howLong, needsDoing } from "../lib/needs-doing";
import { howPaid, orderStory } from "../lib/order-story";
import { codeFrom } from "../lib/promoter-applications";
import { toCsv } from "../lib/csv";
import { kitchenTotals } from "../lib/profit";
import { templateFor } from "../lib/messages";
import { EMPTY } from "../lib/settings";
import { test } from "node:test";
import { chargedByRestaurant, groupForCounter, sortStops } from "../lib/admin";
import { bare, spellings } from "../lib/admin-search";
import { inWords } from "../lib/counts";
import { fareFor, parseFares, putOnCard, serialiseFares } from "../lib/transport";
import { normalisePhone, formatPhone } from "../lib/phone";
import { countdown, lagosInstant, lagosToday } from "../lib/time";
import {
  bandFor,
  evenShare,
  feeFor,
  isCar,
  isUrgent,
  nextBand,
  sameDayFee,
  tripFee,
  parseBands,
  splitFee,
  HEADLINE_FEE,
  type Band,
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
import {
  daysSince,
  lastSentLine,
  aimOf,
  ordersAfter,
  othersLine,
  outcomeChip,
  sendStamp,
} from "../lib/deal-sends";
import { hushNote, hushedPhones, quietUntil, QUIET_DAYS } from "../lib/carts";
import { sayWindow } from "../lib/settings";
import { sheetAsText } from "../lib/sheet-text";
import { template, whatsappTo } from "../lib/messages";
import { whatsappTo as appWhatsappTo } from "../mobile/lib/whatsapp";
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
import { emptyRunClosesAt, windowAfterHolding } from "../lib/run-window";
import { parseCatalogue, parseProducts } from "../lib/skincare-import";
import { feeForValue, parseValueBands } from "../lib/value-bands";
import { isExampleNumber, sprung, tooFast } from "../lib/guard";
import { nextDrop } from "../lib/skincare";
import {
  BODY_MOST,
  TITLE_MOST,
  cartsLeftAlert,
  forLockScreen,
  isGone,
  toldKey,
  trimToFit,
  unpaidRunAlert,
} from "../lib/admin-alerts";
import { isApple, urlBase64ToBytes } from "../lib/push-keys";

/** A settings row with nothing filled in, for the template tests. */
const EMPTY_SETTINGS: Settings = { ...SETTINGS_DEFAULTS };

import type { OrderLine } from "../lib/orders";
import { halfShown, key as priceKey, pickedPrice } from "../lib/pricing";
import { whatsappTo as botWhatsappTo } from "../lib/messages";
import { pickFaq as botPickFaq } from "../lib/faq-match";
import {
  readBudget as botReadBudget,
  toSpend as botToSpend,
  allIn as botAllIn,
} from "../lib/budget";
import {
  OCCASIONS as botOccasions,
  occasionBy as botOccasionBy,
  isGift as botIsGift,
  them as botThem,
  theirs as botTheirs,
} from "../lib/occasions";
import {
  find as botFind,
  countedInName as botCountedInName,
  howMany as botHowMany,
  wantsAPerson as botWantsAPerson,
  looksLikeAName as botLooksLikeAName,
  namedIn as botNamedIn,
  nearlyNamed as botNearlyNamed,
  without as botWithout,
  phoneIn as botPhoneIn,
  yesNo as botYesNo,
  asksToSwap as botAsksToSwap,
  asksForQty as botAsksForQty,
  splitOrder as botSplitOrder,
  intentOf as botIntentOf,
  kitchenAsked as botKitchenAsked,
  placeAsked as botPlaceAsked,
  insteadOf as botInsteadOf,
  kindOf as botKindOf,
  basketLines,
  looksLikeAQuestion as botLooksLikeAQuestion,
  nameIn as botNameIn,
  whyNotAName as botWhyNotAName,
  lineLike as botLineLike,
  type Candidate as BotCandidate,
} from "../lib/bot-match";

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
    source: "",
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

/*
 * The same rule, in the app.
 *
 * Three screens there built the link by stripping punctuation and nothing
 * else, so a number typed the Nigerian way came out as wa.me/09032175147
 * and the tap went nowhere. The sign-in one was the worst of them: somebody
 * asking for the PIN that gets them to their own orders. Tested beside the
 * website's so the two are read together and cannot drift apart again.
 */
test("the app builds the same WhatsApp link as the website", () => {
  assert.equal(appWhatsappTo("0903 217 5147"), "https://wa.me/2349032175147");
  assert.equal(appWhatsappTo("08031112222", "hi"), "https://wa.me/2348031112222?text=hi");

  // Already international, with or without the plus and the spaces: left be,
  // so a shop that types the country code in itself still works.
  assert.equal(appWhatsappTo("2348031112222"), "https://wa.me/2348031112222");
  assert.equal(appWhatsappTo("+234 803 111 2222"), "https://wa.me/2348031112222");

  // No number set means no link at all, rather than wa.me/ with nothing on
  // the end of it.
  assert.equal(appWhatsappTo(""), "");

  // The two halves of the shop agree, which is the whole point of this.
  assert.equal(appWhatsappTo("08031112222", "hi"), whatsappTo("08031112222", "hi"));
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

test("a per head floor stops a big group pricing the car at nothing", () => {
  // Twelve people on a 4,000 band is 334 each before rounding. With a floor
  // of 1,200 nobody in that car pays less than 1,200.
  assert.equal(evenShare(2, 12, null, undefined, 1200), 1200);
  // The floor only ever raises. A share already above it is left alone.
  assert.equal(evenShare(4, 3, null, undefined, 1200), evenShare(4, 3));
  // Never more than the whole trip: one person in the car pays the band,
  // and a floor above the band does not make them pay more than the car.
  assert.equal(
    evenShare(2, 1, null, undefined, 999_999),
    evenShare(2, 1)
  );
  // No floor is the old arithmetic exactly.
  assert.equal(evenShare(2, 3, null, undefined, 0), evenShare(2, 3));
});

test("a per head floor never collects less than the band", () => {
  for (let items = 1; items <= 40; items++) {
    for (let people = 1; people <= 20; people++) {
      const collected = evenShare(items, people, null, undefined, 1200) * people;
      assert.ok(
        collected >= feeFor(items),
        `${people} people, ${items} items: collected ${collected}`
      );
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
  const runToday = {
    id: "a",
    runDate: today,
    when: "Between 2pm and 5pm, today",
    said: "between 2pm and 5pm today",
    flashFee: null,
  };
  const runTomorrow = {
    id: "b",
    runDate: "2026-09-21",
    when: "Between 2pm and 5pm, tomorrow",
    said: "between 2pm and 5pm tomorrow",
    flashFee: null,
  };

  // A run going today beats a car of its own today: same afternoon, two and
  // a half thousand less.
  assert.equal(nextArrival([runToday, runTomorrow], slots, today)?.runId, "a");

  // No run today, but the day is not over: a car of its own, today.
  const car = nextArrival([runTomorrow], slots, today);
  assert.equal(car?.onARun, false);
  // The window it lands in, which is what the shop can stand behind: a
  // time to the minute is a promise Lagos traffic does not keep.
  assert.equal(car?.when, "Between 4:15pm and 5pm today");

  // Nothing left today. A run tomorrow beats a car tomorrow, because it is
  // the same hours for less money.
  const tomorrowOnly = slots.filter((slot) => slot.day !== "today");
  assert.equal(nextArrival([runTomorrow], tomorrowOnly, today)?.runId, "b");

  // No runs at all, and nothing left today: tomorrow's first window, which
  // is whenever the shop opens. Never nothing.
  const none = nextArrival([], tomorrowOnly, today);
  assert.equal(none?.onARun, false);
  assert.equal(none?.when, "Between 12pm and 3pm tomorrow");

  // The day is always said, so a window never reads as today by default.
  assert.equal(car?.said, "between 4:15pm and 5pm today");
  assert.equal(none?.said, "between 12pm and 3pm tomorrow");

  // A car tomorrow beats a run on Friday. Cheaper is not the same question
  // as sooner, and the front page led with Wednesday while a car could have
  // been there on Monday.
  const runFriday = { ...runTomorrow, id: "c", runDate: "2026-09-25" };
  assert.equal(nextArrival([runFriday], tomorrowOnly, today)?.onARun, false);
  // But a run on the day the car would go still wins it: same evening,
  // less money.
  assert.equal(nextArrival([runTomorrow], tomorrowOnly, today)?.runId, "b");

  // Nothing anywhere is the only case with no answer.
  assert.equal(nextArrival([], [], today), null);
});

test("a catalogue comes in at the real price, with what is out of stock left out", () => {
  const csv = [
    `"title","current_price","original_price","on_sale","stock_status","vendor","product_type","collections","image_filename"`,
    `"CeraVe Foaming Cleanser 236ml","5400.00","16000.00","yes","in_stock","CeraVe","SKIN CARE","Cleansers, All Products, Products, CeraVe","images/cerave-foaming-cleanser-236ml.png"`,
    `"Bioderma Sensibio H2O 500ml","12000.00","12000.00","","out_of_stock","Bioderma","SKIN CARE","Cleansers, All Products, Products","images/bioderma-sensibio-h2o-500ml.jpg"`,
    `"Half a thing","","","","partial","Nobody","","All Products, Products","x.png"`,
  ].join("\n");

  const { products, skipped } = parseProducts(csv);

  // The row with no price is not a product.
  assert.equal(skipped, 1);
  assert.equal(products.length, 2);

  // What the shop charges when nothing is on, never today's promotion: a
  // sale price imported as the price is a discount that never ends.
  assert.equal(products[0].price, 16000);
  assert.equal(products[0].brand, "CeraVe");
  assert.equal(products[0].imageFile, "cerave-foaming-cleanser-236ml.png");

  // Only what can actually be bought is on the shelf.
  assert.equal(products[0].available, true);
  assert.equal(products[1].available, false);

  // The shop's plumbing collections hold everything there is, so they narrow
  // nothing and are dropped. A collection named after the brand goes too,
  // because the brand is its own filter and a better one.
  assert.deepEqual(products[0].shelves, ["Cleansers"]);
  assert.equal(products[0].category, "Cleansers");
});

test("a product with a comma in its name stays one product", () => {
  const csv = [
    `"title","original_price","vendor"`,
    `"Cleanser, 200ml","3000","Nobody"`,
  ].join("\n");
  const { products } = parseProducts(csv);
  assert.equal(products[0].name, "Cleanser, 200ml");
  assert.equal(products[0].price, 3000);
});

test("skincare goes on one day a week, and ordering never stops", () => {
  const settings = { skincare_day: 6, skincare_cut_off: "08:00" } as never;

  // A Wednesday: the Saturday coming.
  assert.equal(nextDrop(settings, new Date("2026-09-23T10:00:00+01:00")).date, "2026-09-26");

  // Saturday, before the cut off: today, and they are on it.
  assert.equal(nextDrop(settings, new Date("2026-09-26T07:30:00+01:00")).date, "2026-09-26");

  // Saturday, an hour after it: the car has gone, so it is the week after.
  // Not a refusal, which is the point: the order is taken either way.
  assert.equal(nextDrop(settings, new Date("2026-09-26T09:00:00+01:00")).date, "2026-10-03");
});

test("a catalogue reads the same from a spreadsheet or a list", () => {
  const csv = [
    "﻿category,name,price,image_filename,image_url",
    `Bread,Bokku Bread,"₦1,900",Bokku_Bread.png,https://example.test/bokku.png`,
    `Protein,Red Guinea corn,Out of stock,corn.png,https://example.test/corn.png`,
  ].join("\n");

  const fromCsv = parseCatalogue(csv);
  // The byte order mark a spreadsheet saves sticks to the first column name,
  // so "category" read as something else and every product landed with no
  // section at all.
  assert.equal(fromCsv.products[0].category, "Bread");
  assert.equal(fromCsv.products[0].price, 1900);
  // An export writes "Out of stock" where the price goes. A product with no
  // price is not one anybody can order, so it is left out and counted.
  assert.equal(fromCsv.products.length, 1);
  assert.equal(fromCsv.skipped, 1);

  const fromJson = parseCatalogue(
    JSON.stringify([
      { category: "Bread", name: "Bokku Bread", price: "₦1,900", image: "https://example.test/bokku.png" },
    ])
  );
  assert.equal(fromJson.products[0].name, "Bokku Bread");
  assert.equal(fromJson.products[0].price, 1900);
  assert.equal(fromJson.products[0].imageUrl, "https://example.test/bokku.png");
  assert.equal(fromJson.products[0].category, "Bread");
});

test("a countdown past a day is said in days", () => {
  // "71h 52m" is a sum somebody has to do before they know whether that is
  // tonight or the weekend, which is the opposite of what a countdown is for.
  const hours = (n: number) => n * 3600 * 1000;
  assert.equal(countdown(hours(71) + 52 * 60 * 1000), "2d 23h");
  assert.equal(countdown(hours(48)), "2d");
  assert.equal(countdown(hours(24)), "1d");
  // Inside a day it stays as hours and minutes, which is what that is for.
  assert.equal(countdown(hours(23) + 59 * 60 * 1000), "23h 59m");
  assert.equal(countdown(90 * 1000), "1m 30s");
  assert.equal(countdown(0), "now");
});

test("a restaurant menu comes in with the choices the kitchen asks for", () => {
  // What a restaurant platform actually exports: "Product Name" rather than
  // "name", "Price (NGN)" rather than "price", and one row per choice, so a
  // dish with two questions arrives four times. Read by the heading as typed,
  // this file had no name column and no price column, and every row of it was
  // skipped: the import brought in nothing at all.
  const csv = [
    "﻿Category,Product Name,Description,Price (NGN),In Stock,Image Filename," +
      "Option Group,Option Group Type,Min Selections,Max Selections,Option Name,Option Price (NGN)",
    "Pasta,Asun Pasta,Spicy and creamy,11800,Yes,asun.png,Spice Level,Required,1,1,Mild,0",
    "Pasta,Asun Pasta,Spicy and creamy,11800,Yes,asun.png,Spice Level,Required,1,1,Hot,0",
    "Pasta,Asun Pasta,Spicy and creamy,11800,Yes,asun.png,Add Extra,Optional,0,2,Sausage,1700",
    // The same dish sold as a sharing tray is a different dish at a different
    // price. Told apart by name alone, the shop kept whichever came first in
    // the file and put the other one on the menu at the wrong price.
    "Trays,Asun Pasta,For the table,35000,Yes,asun-tray.png,,,,,,",
  ].join("\n");

  const { products, skipped } = parseCatalogue(csv);
  assert.equal(skipped, 0);
  assert.equal(products.length, 2);

  const plate = products[0];
  assert.equal(plate.name, "Asun Pasta");
  assert.equal(plate.price, 11800);
  assert.equal(plate.category, "Pasta");
  assert.equal(plate.description, "Spicy and creamy");
  assert.equal(plate.options.length, 2);

  const spice = plate.options[0];
  assert.equal(spice.name, "Spice Level");
  assert.equal(spice.required, true);
  assert.equal(spice.max, 1);
  assert.deepEqual(spice.choices.map((one) => one.name), ["Mild", "Hot"]);

  const extra = plate.options[1];
  assert.equal(extra.required, false);
  assert.equal(extra.max, 2);
  assert.equal(extra.choices[0].price, 1700);

  const tray = products[1];
  assert.equal(tray.price, 35000);
  assert.equal(tray.category, "Trays");
  assert.equal(tray.options.length, 0);
});

test("a market is priced by what the shopping comes to", () => {
  // Eleven peppers and a bag of rice is one trip and two bags. The container
  // ladder reads it as eleven containers and charges nine thousand naira for
  // vegetables, which is the wrong question asked precisely.
  const bands = parseValueBands(
    JSON.stringify([
      { upTo: 30000, fee: 4000 },
      { upTo: null, fee: 4500 },
    ])
  );

  assert.equal(feeForValue(2000, bands), 4000);
  assert.equal(feeForValue(30000, bands), 4000);
  // Over the line, which is where the heavy bags start.
  assert.equal(feeForValue(30001, bands), 4500);
  assert.equal(feeForValue(250000, bands), 4500);

  // The top band catches everything, whatever was typed into it, so no shop
  // can fall through the bottom and price as nothing.
  const open = parseValueBands(JSON.stringify([{ upTo: 5000, fee: 4000 }]));
  assert.equal(feeForValue(999999, open), 4000);

  // Nothing set is the ordinary ladder, not free delivery.
  assert.deepEqual(parseValueBands(""), []);
  assert.equal(feeForValue(10000, []), 0);
});

test("the things no person does", () => {
  // A field nobody can see. Anything at all in it was typed by a script.
  assert.equal(sprung(""), false);
  assert.equal(sprung("   "), false);
  assert.equal(sprung(null), false);
  assert.equal(sprung("http://spam.test"), true);

  // Nobody fills in a name, a number and a block in three seconds.
  assert.equal(tooFast(String(Date.now())), true);
  assert.equal(tooFast(String(Date.now() - 20_000)), false);
  // Missing, unreadable, or a clock that is ahead of ours: all forgiven,
  // because refusing a real order over somebody's wrong clock is worse than
  // letting a script through.
  assert.equal(tooFast(null), false);
  assert.equal(tooFast("not a time"), false);
  assert.equal(tooFast(String(Date.now() + 60_000)), false);

  // The number printed as an example on every phone field on the site.
  assert.equal(isExampleNumber("08031234567"), true);
  assert.equal(isExampleNumber("0803 123 4567"), true);
  assert.equal(isExampleNumber("+2348031234567"), true);
  assert.equal(isExampleNumber("08123456789"), false);
});

test("a cart with a market and a restaurant in it pays the dearer measure", () => {
  const market = parseValueBands(
    JSON.stringify([
      { upTo: 30000, fee: 4000 },
      { upTo: null, fee: 4500 },
    ])
  );
  const containers = parseBands(
    JSON.stringify([
      { maxItems: 4, fee: 4000 },
      { maxItems: 7, fee: 6000 },
      { maxItems: null, fee: 9000 },
    ])
  );

  // One pepper on top of twelve pizzas. Priced by the market alone it would
  // be four thousand, which is the whole of a twelve container run for the
  // price of a bag of vegetables.
  const dearer = (value: number, items: number) =>
    Math.max(feeForValue(value, market), feeFor(items, null, containers));

  assert.equal(dearer(20000, 13), 9000);
  // And a boot full of shopping is not one container, whichever way it is
  // counted: three bags of rice is three things and forty thousand naira.
  assert.equal(dearer(40000, 3), 4500);
  // A market shop on its own, under the line.
  assert.equal(dearer(9000, 2), 4000);
});

test("a drink is a quarter of a container, and three are free", () => {
  const pizza = { qty: 4, container_pct: 100 };
  assert.equal(containersIn([pizza, { qty: 3, container_pct: 25 }]), 4);
  assert.equal(containersIn([pizza, { qty: 4, container_pct: 25 }]), 5);
});

test("a restaurant's own deal counts as the boxes it really is", () => {
  assert.equal(containersIn([{ qty: 1, container_pct: 300 }]), 3);
});

test("an item with no room set is a whole container", () => {
  assert.equal(containersIn([{ qty: 3 }]), 3);
  assert.equal(containersIn([{ qty: 2, container_pct: null }]), 2);
});

test("a car still goes out for one bottle of water", () => {
  assert.equal(containersIn([{ qty: 1, container_pct: 25 }]), 1);
});

test("a setting of zero is an answer, not a missing setting", () => {
  assert.equal(numberOr("0", 2000), 0);
  assert.equal(numberOr("", 2000), 2000);
  assert.equal(numberOr(null, 2000), 2000);
  assert.equal(numberOr("nonsense", 2000), 2000);
  assert.equal(numberOr("1500", 2000), 1500);
});

/*
 * Where somebody came from.
 *
 * The column has to be countable a year from now, so the only thing worth
 * testing is that nothing else can get into it.
 */
test("a channel is tidied to a name we chose, or thrown away", () => {
  assert.equal(tidyChannel("Instagram"), "instagram");
  assert.equal(tidyChannel(" IG "), "instagram");
  // A word at a time: whoever writes the link is usually saying where on
  // Instagram it went, not naming a channel we have never heard of.
  assert.equal(tidyChannel("ig-bio"), "instagram");
  assert.equal(tidyChannel("instagram_story"), "instagram");
  assert.equal(tidyChannel("GOOGLE"), "google");
  assert.equal(tidyChannel("fb"), "facebook");
  assert.equal(tidyChannel("x"), "twitter");
  // Not one of ours. Better empty than a column with a thousand spellings.
  assert.equal(tidyChannel("some-random-blog"), "");
  assert.equal(tidyChannel(""), "");
});

test("a referring site names its channel, and our own pages name none", () => {
  assert.equal(channelOfSite("www.google.com"), "google");
  assert.equal(channelOfSite("google.com.ng"), "google");
  assert.equal(channelOfSite("l.instagram.com"), "instagram");
  assert.equal(channelOfSite("t.co"), "twitter");
  assert.equal(channelOfSite("wa.me"), "whatsapp");
  assert.equal(channelOfSite("somebodyelse.com"), "");
  assert.equal(channelOfSite(""), "");
});

test("a promoter's link is only ever letters and numbers", () => {
  assert.equal(tidyHandle("Ada"), "ada");
  assert.equal(tidyHandle("ada's link (2)"), "adaslink2");
  assert.equal(tidyHandle("  TOBI  "), "tobi");
  assert.equal(tidyHandle("!!!"), "");
  assert.equal(tidyHandle("a".repeat(40)).length, 20);
});

/*
 * A week is Monday to Sunday.
 *
 * It used to be the next seven days, so on a Saturday "this week" began on
 * Saturday and ran into the middle of the week after.
 */
test("a week runs Monday to Sunday, whichever day you ask on", () => {
  // Saturday 3 October 2026.
  assert.deepEqual(weekAround("2026-10-03"), {
    monday: "2026-09-28",
    sunday: "2026-10-04",
  });
  // The Sunday at the end of that same week, not the start of the next.
  assert.deepEqual(weekAround("2026-10-04"), {
    monday: "2026-09-28",
    sunday: "2026-10-04",
  });
  // And the Monday after it begins a new one.
  assert.deepEqual(weekAround("2026-10-05"), {
    monday: "2026-10-05",
    sunday: "2026-10-11",
  });
});

/*
 * Months, for the costs that come back every one of them.
 *
 * The rollovers are where this sort of thing goes quietly wrong, and a
 * standing cost that skips December is a cost nobody notices is missing.
 */
test("a month knows which month comes after it", () => {
  assert.equal(monthOf("2026-10-17"), "2026-10-01");
  assert.equal(monthOf("2026-01-01"), "2026-01-01");

  assert.equal(nextMonth("2026-10-01"), "2026-11-01");
  // Over the end of a year.
  assert.equal(nextMonth("2026-12-01"), "2027-01-01");
  // And into a February, which is where day-of-month maths usually breaks.
  assert.equal(nextMonth("2027-01-01"), "2027-02-01");
  assert.equal(nextMonth("2027-02-01"), "2027-03-01");
});

/*
 * The one place a setting becomes a third-party script.
 *
 * Whatever is typed into that box ends up in a src attribute on every page
 * of the shop, so it is checked for shape rather than trusted. Google hands
 * out several prefixes for the same tag and whichever it printed is the
 * right one, so the test is the shape, not a list of prefixes we happen to
 * have seen.
 */
test("a tag id is taken on its shape, whichever prefix Google used", () => {
  // The real one, off the Merchant Center setup screen.
  assert.equal(googleTagId({ google_tag: "GT-K4LKKR94" }), "GT-K4LKKR94");
  // The other prefixes the same box might be given.
  assert.equal(googleTagId({ google_tag: "G-ABC123DEF4" }), "G-ABC123DEF4");
  assert.equal(googleTagId({ google_tag: "AW-12345678" }), "AW-12345678");
  assert.equal(googleTagId({ google_tag: "987654321" }), "987654321");
  // Pasted with the whitespace that comes off a copy button.
  assert.equal(googleTagId({ google_tag: "  GT-K4LKKR94\n" }), "GT-K4LKKR94");
});

test("anything that is not a tag id puts no script on the page", () => {
  for (const said of [
    "",
    "   ",
    "paste your tag here",
    // The whole snippet pasted in rather than the id out of it.
    '<script async src="https://www.googletagmanager.com/gtag/js?id=GT-K4LKKR94">',
    "GT-",
    "TOOLONGAPREFIX-ABC123",
  ]) {
    assert.equal(googleTagId({ google_tag: said }), "", said);
  }
  // Absent entirely, which is every shop that has not set one up.
  assert.equal(googleTagId({}), "");
});

/*
 * A query with a brace in it is a template nobody filled in.
 *
 * Google crawled the SearchAction target literally, braces and all, then
 * followed every filter link on the page it landed on. The product list now
 * drops such a query rather than searching for it, and this is the rule
 * that decides, kept honest so a real search is never thrown away with it.
 */
test("a search with a brace in it is nobody's search", () => {
  const unfilled = (said: string | undefined): boolean =>
    said !== undefined && /[{}]/.test(said);

  // What Google actually crawled, two hundred and thirty-one times over.
  assert.equal(unfilled("{search_term_string}"), true);
  assert.equal(unfilled("{q}"), true);

  // Things people really type, which must survive.
  for (const real of ["chicken", "jollof rice", "", "pepperoni & chips", "50cl", "CeraVe"]) {
    assert.equal(unfilled(real), false, real);
  }
  // Nothing asked for at all is not a search either way.
  assert.equal(unfilled(undefined), false);
});

/*
 * A pot of sauce is not a page.
 *
 * Every menu item has a page of its own, which is right for a dish and
 * wrong for the things bought alongside one. Nobody searches for extra
 * mozzarella, so those pages sat in the crawl queue ahead of dishes that
 * had never been crawled at all. The rule reads the kitchen's own filing.
 */
test("extras are told apart from dishes by the category they are filed under", () => {
  // Exactly the five categories the kitchens use for them.
  for (const said of ["Extra toppings", "Add-ons", "Sauces", "Sauce Dips", "Dips & sides"]) {
    assert.equal(isExtra(said), true, said);
  }

  // Everything somebody actually orders has to stay indexable.
  for (const said of [
    "Alacarte",
    "Burgers",
    "Pizzas",
    "Chicken & Rice",
    "Drinks",
    "Bread",
    "Desserts",
    "Rice grains & pasta",
    "",
  ]) {
    assert.equal(isExtra(said), false, said);
  }
  assert.equal(isExtra(null), false);
});

/*
 * A message to a person, with no order behind it.
 *
 * The customers list sends two of these: here is your PIN, and would you
 * leave us a review. Neither is about anything somebody bought, and the
 * page has no order on it to hand over. It used to invent one, which worked
 * until the template reached for a field the invention did not have and
 * took the whole page down with a server render error.
 */
test("a message to a person needs no order to be written", () => {
  const settings = { ...EMPTY, google_review: "https://g.page/r/x/review" };

  const asked = templateFor({
    kind: "google",
    name: "Ada Obi",
    settings,
    siteUrl: "https://sudu.store",
  });
  // Their first name, never their full one, and the link they are being
  // asked to use.
  assert.ok(asked.includes("Ada"), asked);
  assert.ok(!asked.includes("Obi"), asked);
  assert.ok(asked.includes("https://g.page/r/x/review"), asked);

  // A PIN message is the other one sent from that page.
  const pin = templateFor({
    kind: "pin",
    name: "Ada",
    settings,
    pin: "4821",
    siteUrl: "https://sudu.store",
  });
  assert.ok(pin.includes("4821"), pin);
});

test("a token needing an order is removed rather than sent to somebody", () => {
  // The wording is editable, so somebody will eventually put an order token
  // in a message that has no order. A customer must never be sent a brace.
  const said = templateFor({
    kind: "google",
    name: "Ada",
    settings: {
      ...EMPTY,
      google_review: "https://g.page/r/x/review",
      msg_google: "Hi {name}, about order {ref} for {total} to {hostel}: {google}",
    },
    siteUrl: "https://sudu.store",
  });
  assert.ok(!said.includes("{"), said);
  assert.ok(!said.includes("}"), said);
  assert.ok(said.includes("Ada"), said);
  assert.ok(said.includes("https://g.page/r/x/review"), said);
});

/*
 * The dashboard list that is the whole job.
 *
 * Six cards of figures answer "how are we doing" and never answer "what
 * should I do now". Every line in this list costs money if it is left, so
 * the order is what it costs to ignore, and an empty list is a finished
 * morning rather than a broken page.
 */
const quiet = {
  left: { value: 0, count: 0, stillInTime: 0 },
  unpaid: { value: 0, count: 0, runLabel: "", closesAt: "" },
  run: null,
  reviews: 0,
};

test("a morning with nothing waiting has an empty list, not a fabricated one", () => {
  assert.deepEqual(needsDoing(quiet), []);
});

test("the list is ordered as the board draws it", () => {
  const jobs = needsDoing({
    ...quiet,
    left: { value: 62100, count: 4, stillInTime: 3 },
    unpaid: { value: 41200, count: 3, runLabel: "Saturday afternoon", closesAt: "12:30" },
    promoters: [{ name: "Onize", owed: 1000, since: "Friday" }],
    reviews: 2,
  });
  // Left behind, then what is owed to somebody else, then what is owed to
  // us, and the review nobody is out of pocket over at the bottom. Fixed
  // rather than sorted by the figures: the promoters' thousand naira sits
  // above the forty-one thousand unpaid, because a list whose rows move
  // about between mornings has to be read from the top every time.
  assert.deepEqual(jobs.map((one) => one.kind), ["left", "promoters", "unpaid", "reviews"]);
  assert.ok(jobs[0].title.includes("62,100"), jobs[0].title);
  assert.ok(jobs[0].detail.includes("3 can still make"), jobs[0].detail);
  // Named for the carts worth a WhatsApp, which is what pressing it does.
  assert.equal(jobs[0].action.label, "Nudge all 3");
  assert.equal(jobs[2].action.label, "Chase");
});

test("a run is only worth saying when it is close enough to act on", () => {
  const far = needsDoing({
    ...quiet,
    run: {
      id: "b1",
      label: "Tomorrow's run",
      closesInMinutes: 9 * 60,
      kitchens: 11,
      paid: 0,
    },
  });
  // Nine hours away is a timetable, and a dashboard that says so every
  // morning is one nobody reads by Thursday.
  assert.deepEqual(far, []);

  const near = needsDoing({
    ...quiet,
    run: { id: "b1", label: "Saturday's run", closesInMinutes: 134, kitchens: 11, paid: 0 },
  });
  assert.equal(near.length, 1);
  assert.ok(near[0].title.includes("2h 14m"), near[0].title);
  assert.ok(near[0].detail.includes("nothing ordered yet"), near[0].detail);
  // The run named in the row, not the list of every run there has ever been.
  assert.equal(near[0].action.label, "Open the run");
  assert.equal(near[0].action.href, "/admin/batch/b1");

  // And a run already closed is not a thing to do either.
  assert.deepEqual(
    needsDoing({
      ...quiet,
      run: { id: "b1", label: "x", closesInMinutes: 0, kitchens: 1, paid: 0 },
    }),
    []
  );
});

test("one of a thing is said as one, never as one(s)", () => {
  const jobs = needsDoing({
    ...quiet,
    left: { value: 4000, count: 1, stillInTime: 0 },
    reviews: 1,
  });
  assert.ok(jobs[0].detail.startsWith("1 cart filled"), jobs[0].detail);
  assert.ok(jobs[0].detail.includes("None of them"), jobs[0].detail);
  assert.ok(jobs[1].title === "1 review to reply to", jobs[1].title);
});

test("a cart can only still make a run its own clock allows", () => {
  // The dashboard said "3 can still make today's run" from a filter whose
  // callback never read the cart, so it counted either none of them or every
  // one of them. Each cart is tested against the cut-off on its own.
  const closes = "2026-10-10T12:30:00+01:00";
  const now = new Date("2026-10-10T11:00:00+01:00").getTime();
  const carts = [
    // Filled in this morning against no run yet: picking one is part of
    // checking out, so this one can still be nudged onto it.
    { updated_at: "2026-10-10T10:40:00+01:00", batch_id: null },
    // Filled in against this very run, before it closes.
    { updated_at: "2026-10-10T09:05:00+01:00", batch_id: "sat" },
    // Somebody else's run, which this cut-off says nothing about.
    { updated_at: "2026-10-10T09:05:00+01:00", batch_id: "sun" },
  ];

  assert.equal(cartsInTime(carts, { id: "sat", cutOffAt: closes }, now), 2);
  // No run to make, so nobody can make it.
  assert.equal(cartsInTime(carts, null, now), 0);
  // The cut-off has gone: an hour later every one of them is an apology
  // rather than a WhatsApp.
  assert.equal(
    cartsInTime(carts, { id: "sat", cutOffAt: closes }, new Date("2026-10-10T13:00:00+01:00").getTime()),
    0
  );
  // A cart whose own last touch is past the cut-off is not on that run,
  // even while the run is still taking orders from everybody else.
  assert.equal(
    cartsInTime(
      [{ updated_at: "2026-10-10T12:45:00+01:00", batch_id: "sat" }],
      { id: "sat", cutOffAt: closes },
      new Date("2026-10-10T12:20:00+01:00").getTime()
    ),
    0
  );
});

test("how long is said the way somebody would say it", () => {
  assert.equal(howLong(134), "2h 14m");
  assert.equal(howLong(40), "40m");
  assert.equal(howLong(120), "2h");
  assert.equal(howLong(0), "0m");
  assert.equal(howLong(-5), "0m");
});

test("what the board never drew is still on the list", () => {
  // The board was drawn for a food run. Parcels and requests are real work
  // the old dashboard surfaced, and a redesign that quietly drops them is a
  // redesign that loses somebody's paid-for errand.
  const jobs = needsDoing({ ...quiet, parcels: 2, asked: 3 });
  assert.deepEqual(jobs.map((one) => one.kind), ["parcels", "asked"]);
  assert.ok(jobs[0].title.includes("2 parcels"), jobs[0].title);
  assert.ok(jobs[1].title.includes("3 requests"), jobs[1].title);

  // And they stay below real money.
  const withMoney = needsDoing({
    ...quiet,
    unpaid: { value: 41200, count: 3, runLabel: "", closesAt: "" },
    parcels: 1,
  });
  assert.deepEqual(withMoney.map((one) => one.kind), ["unpaid", "parcels"]);
});

test("money owed to somebody else is money on the list", () => {
  const jobs = needsDoing({
    ...quiet,
    promoters: [
      { name: "Onize", owed: 500, since: "Friday" },
      { name: "Temmy", owed: 500, since: "Sunday" },
      // Nothing owed is nothing to do, so this one must not be counted.
      { name: "Ada", owed: 0, since: "" },
    ],
  });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "You owe 2 promoters ₦1,000");
  assert.ok(jobs[0].detail.includes("Onize ₦500 since Friday"), jobs[0].detail);
  // "Pay both" is an instruction to whoever reads it, and the thing worth
  // guarding is where it goes: the list and the account numbers, never an
  // action that moves money.
  assert.equal(jobs[0].action.label, "Pay both");
  assert.equal(jobs[0].action.href, "/admin/promoters?owed=1#owed");

  // One of them is paid, not paid all.
  const one = needsDoing({ ...quiet, promoters: [{ name: "Onize", owed: 500, since: "" }] });
  assert.equal(one[0].action.label, "Pay them");
  assert.equal(one[0].title, "You owe 1 promoter ₦500");
  assert.equal(one[0].action.href, "/admin/promoters?owed=1#owed");

  // Nobody owed anything leaves the list empty rather than saying so.
  assert.deepEqual(needsDoing({ ...quiet, promoters: [{ name: "Ada", owed: 0, since: "" }] }), []);
});

/*
 * How an order went, read down as steps.
 *
 * The page could say what an order is and never what had happened to it.
 * The rule worth guarding is that nothing is invented: a step with no time
 * against it says so rather than borrowing the one above it, because a
 * timeline that guesses is worse than one with a gap in it.
 */
const plain = {
  created_at: "2026-10-06T19:28:00Z",
  paid_at: null,
  done_at: null,
  rated_at: null,
  status: "pending",
  payment_method: "transfer",
  hostel: "Queen Mary",
  batchStage: "ordering",
};
const at = (iso: string) => iso.slice(11, 16);

test("an order nobody has paid for has one step behind it", () => {
  const steps = orderStory(plain, at);
  assert.deepEqual(steps.map((one) => one.done), [true, false, false, false, false]);
  assert.equal(steps[0].when, "19:28");
  // Not paid, so no time, and certainly not the time it was ordered.
  assert.equal(steps[1].when, "");
});

test("the run's stage moves the steps the order itself cannot", () => {
  const bought = orderStory(
    { ...plain, status: "paid", paid_at: "2026-10-06T19:31:00Z", batchStage: "at_counter" },
    at
  );
  assert.deepEqual(bought.map((one) => one.done), [true, true, true, false, false]);
  // The run records which stage it is at, never the minute it changed, so
  // this step says that it happened and does not pretend to know when.
  assert.equal(bought[2].when, "");

  const done = orderStory(
    { ...plain, status: "delivered", paid_at: "x", done_at: "2026-10-09T17:04:00Z", batchStage: "handed_out" },
    at
  );
  assert.equal(done[3].done, true);
  assert.equal(done[3].when, "17:04");
  // Nobody has asked for a review, which is the one most often forgotten.
  assert.equal(done[4].done, false);
});

test("the counter is named where there is one, counted where there are many", () => {
  assert.ok(orderStory({ ...plain, counters: ["DO Bowls"] }, at)[2].label === "Bought at DO Bowls");
  assert.ok(
    orderStory({ ...plain, counters: ["KFC", "Domino's"] }, at)[2].label === "Bought at 2 counters"
  );
  assert.ok(orderStory(plain, at)[2].label === "Bought at the counter");
});

test("how they paid names the account once there is one", () => {
  assert.equal(howPaid({ payment_method: "transfer" }), "transfer");
  assert.equal(howPaid({ payment_method: "transfer", paid_into: "GTBank" }), "transfer, GTBank");
  assert.equal(howPaid({ payment_method: "card" }), "card");
});

/*
 * A promoter's code, from their name.
 *
 * It is what they type to sign in and what goes in a caption, so it has to
 * be theirs, readable, and never somebody else's.
 */
test("a code comes off a name and never collides", () => {
  assert.equal(codeFrom("Onize", []), "onize");
  // Spaces, case and punctuation are not part of a code, and a name is not
  // cut in half to make one: "chichiokek" is a misspelling of somebody's
  // own name to hand them as their identity.
  assert.equal(codeFrom("Chi-Chi Okeke", []), "chichiokeke");
  assert.equal(codeFrom("Oluwaseun Adebayo-Johnson", []), "oluwaseunadebayo");
  // Taken, so the next one along.
  assert.equal(codeFrom("Onize", ["onize"]), "onize2");
  assert.equal(codeFrom("Onize", ["onize", "onize2", "onize3"]), "onize4");
  // Nothing usable in the name at all still produces something to type.
  assert.equal(codeFrom("陳", []), "promoter");
  assert.equal(codeFrom("", ["promoter"]), "promoter2");
});

/*
 * The spreadsheet, and the two things that go wrong in one.
 *
 * A file opened in Excel is not a text file: a cell starting with an equals
 * sign is a formula it will run, and a comma in a note is a new column
 * unless the field is quoted.
 */
test("a csv survives Excel", () => {
  // Numbers stay numbers, so the column can be added up.
  assert.equal(
    toCsv([{ Name: "Audrey", Spent: 84100 }]),
    "Name,Spent\r\nAudrey,84100"
  );
  // A comma, a quote and a line break all mean the field has to be quoted,
  // and a quote inside it is doubled.
  assert.equal(
    toCsv([{ Note: 'Calls, never messages' }]),
    'Note\r\n"Calls, never messages"'
  );
  assert.equal(toCsv([{ Note: 'Said "later"' }]), 'Note\r\n"Said ""later"""');
  assert.equal(toCsv([{ Note: "Two\nlines" }]), 'Note\r\n"Two\nlines"');
  // The dangerous ones: a name or a note that Excel would otherwise run.
  assert.equal(toCsv([{ Name: "=1+1" }]), "Name\r\n'=1+1");
  assert.equal(toCsv([{ Name: "-Ada" }]), "Name\r\n'-Ada");
  assert.equal(toCsv([{ Name: "@everyone" }]), "Name\r\n'@everyone");
  // A real minus in a money column is a number, not text, so it is left.
  assert.equal(toCsv([{ Profit: -3200 }]), "Profit\r\n-3200");
  // Nothing at all is an empty file rather than a heading row, because a
  // spreadsheet with only headings is the kind of thing somebody acts on.
  assert.equal(toCsv([]), "");
  // A row missing a column is an empty cell, never a shifted line.
  assert.equal(
    toCsv([{ Name: "Ada", Block: "Queen Mary" }, { Name: "Chisom" }]),
    "Name,Block\r\nAda,Queen Mary\r\nChisom,"
  );
});

test("a counter line that was typed in is charged at what was paid, less anything handed back", () => {
  const lines = [
    line({ order_id: "a", name: "8pc bucket", qty: 2, unit_price_at_order: 18000 }),
    line({
      order_id: "b",
      name: "Medium pepperoni",
      qty: 1,
      unit_price_at_order: 11000,
      restaurant: "Domino's Pizza",
    }),
  ];
  const keyOf = (name: string) =>
    groupForCounter(lines)
      .flatMap((place) => place.lines)
      .find((one) => one.name === name)!.key;

  const charges = chargedByRestaurant(lines, [
    { line_key: keyOf("8pc bucket"), paid: 37000, recovered: 1500 },
    { line_key: keyOf("Medium pepperoni"), paid: 11000 },
  ]);

  const kfc = charges.find((one) => one.restaurant === "KFC Novare")!;
  // The menu asked for ₦36,000, the counter took ₦37,000 and ₦1,500 came
  // back, so the shop is ₦400 under the menu rather than ₦1,000 over it.
  assert.equal(kfc.menu, 36000);
  assert.equal(kfc.charged, 35500);

  const dominos = charges.find((one) => one.restaurant === "Domino's Pizza")!;
  assert.equal(dominos.menu, 11000);
  assert.equal(dominos.charged, 11000);
});

test("a counter line nobody typed in stays at the menu price, because silence is not a saving", () => {
  const lines = [
    line({ name: "8pc bucket", qty: 1, unit_price_at_order: 18000 }),
    line({ name: "Wrap meal", qty: 2, unit_price_at_order: 5500 }),
  ];
  const typed = groupForCounter(lines)[0].lines.find((one) => one.name === "Wrap meal")!;

  const [kfc] = chargedByRestaurant(lines, [{ line_key: typed.key, paid: 10000 }]);

  // The wrap meals came in ₦1,000 under, and the bucket nobody typed is
  // still ₦18,000: half a reconciled run used to read as a whole one, and
  // the untyped half showed up as money saved that nobody had saved.
  assert.equal(kfc.menu, 29000);
  assert.equal(kfc.charged, 28000);
});

test("a run with no counter lines at all is charged the menu price throughout", () => {
  const [kfc] = chargedByRestaurant(
    [line({ name: "8pc bucket", qty: 3, unit_price_at_order: 18000 })],
    []
  );
  assert.equal(kfc.menu, 54000);
  assert.equal(kfc.charged, 54000);
});

test("a kitchen keeps the menu value of its food less what its counter really charged", () => {
  const [kfc] = kitchenTotals([
    { restaurant: "KFC Novare", batchId: "r1", menu: 40000, charged: 30000 },
  ]);

  // Food only: the delivery fee is one fee per car and belongs to the run,
  // so nothing about it reaches a kitchen's line.
  assert.equal(kfc.through, 40000);
  assert.equal(kfc.kept, 10000);
  assert.equal(kfc.share, 25);
  assert.equal(kfc.runs, 1);
  // The same money from the counter's side, which is how the panel's own
  // line says it: ₦10,000 less than the menu.
  assert.equal(kfc.over, -10000);
});

test("a kitchen's runs are counted once each, however many restaurants a run stopped at", () => {
  const totals = kitchenTotals([
    { restaurant: "KFC Novare", batchId: "r1", menu: 10000, charged: 9000 },
    { restaurant: "Domino's Pizza", batchId: "r1", menu: 20000, charged: 20000 },
    { restaurant: "KFC Novare", batchId: "r2", menu: 30000, charged: 28000 },
  ]);

  const kfc = totals.find((one) => one.restaurant === "KFC Novare")!;
  assert.equal(kfc.runs, 2);
  assert.equal(kfc.through, 40000);
  assert.equal(kfc.kept, 3000);

  const dominos = totals.find((one) => one.restaurant === "Domino's Pizza")!;
  assert.equal(dominos.runs, 1);
  assert.equal(dominos.kept, 0);
  assert.equal(dominos.over, 0);
});

test("a counter that charged above the menu reads as money the kitchen took, not kept", () => {
  const [kfc] = kitchenTotals([
    { restaurant: "KFC Novare", batchId: "r1", menu: 10000, charged: 10340 },
  ]);

  assert.equal(kfc.kept, -340);
  // Over the menu by ₦340, which is the figure the panel prints in the
  // dark red rather than the mint.
  assert.equal(kfc.over, 340);
  assert.equal(kfc.share, -3);
});

test("kitchens are ordered by the percentage they keep, not by how big they are", () => {
  const totals = kitchenTotals([
    // A large kitchen keeping a twentieth of what goes through it.
    { restaurant: "Chicken Republic", batchId: "r1", menu: 100000, charged: 95000 },
    // A small one keeping a third, which is the thing worth seeing.
    { restaurant: "Krispy Kreme", batchId: "r1", menu: 6000, charged: 4000 },
  ]);

  assert.deepEqual(
    totals.map((one) => one.restaurant),
    ["Krispy Kreme", "Chicken Republic"]
  );
});

test("two kitchens keeping the same share are ordered by the larger, so the panel does not shuffle", () => {
  const totals = kitchenTotals([
    { restaurant: "Krispy Kreme", batchId: "r1", menu: 10000, charged: 9000 },
    { restaurant: "Market Square", batchId: "r1", menu: 50000, charged: 45000 },
  ]);

  assert.deepEqual(
    totals.map((one) => one.restaurant),
    ["Market Square", "Krispy Kreme"]
  );
});

test("a kitchen nothing went through has no percentage rather than all of nothing", () => {
  const [one] = kitchenTotals([
    { restaurant: "KFC Novare", batchId: "r1", menu: 0, charged: 0 },
  ]);
  assert.equal(one.share, 0);
  assert.equal(one.kept, 0);
});

/* Admin notifications: everything that can be decided without a push service. */

test("a title that fits a lock screen is left exactly as it was written", () => {
  assert.equal(trimToFit("New order #1042 · ₦8,400", 48), "New order #1042 · ₦8,400");
});

test("a long title is cut at a whole word, not mid-word", () => {
  const cut = trimToFit(
    "Somebody is looking for a particular pink power bank from Ikeja",
    30
  );
  assert.ok(cut.length <= 30);
  // Cut at a space, so the last thing on the lock screen is a word.
  assert.ok(!cut.includes("particu…"));
  assert.ok(cut.endsWith("…"));
});

test("one word longer than the whole budget is cut rather than lost", () => {
  const cut = trimToFit("Supercalifragilisticexpialidocious", 12);
  assert.equal(cut, "Supercalifr…");
  assert.ok(cut.length <= 12);
});

test("runs of whitespace collapse, because a lock screen draws them all", () => {
  assert.equal(trimToFit("  New   order\n#9  ", 40), "New order #9");
});

test("a notification is trimmed in both halves and keeps its url untouched", () => {
  const ready = forLockScreen({
    title: "x".repeat(200),
    body: "y".repeat(400),
    url: "/admin/orders?view=new",
  });
  assert.ok(ready.title.length <= TITLE_MOST);
  assert.ok(ready.body.length <= BODY_MOST);
  assert.equal(ready.url, "/admin/orders?view=new");
});

test("only 404 and 410 mean a subscription is gone for good", () => {
  assert.equal(isGone(404), true);
  assert.equal(isGone(410), true);
  // A push service having a bad minute is not a reason to forget a phone.
  assert.equal(isGone(500), false);
  assert.equal(isGone(429), false);
  assert.equal(isGone(201), false);
  assert.equal(isGone(0), false);
});

test("what has been told is keyed by kind and id, so two kinds never collide", () => {
  assert.equal(toldKey("cart", "abc"), "cart:abc");
  assert.notEqual(toldKey("cart", "abc"), toldKey("run-unpaid", "abc"));
});

test("one cart left behind names the person and what they filled", () => {
  const alert = cartsLeftAlert([{ name: "Tolu", value: 8400, items: 3 }]);
  assert.equal(alert.title, "₦8,400 left in a cart");
  assert.equal(alert.body, "Tolu filled 3 items and never paid.");
  assert.equal(alert.url, "/admin/carts");
});

test("one cart with one item in it does not say 1 items", () => {
  const alert = cartsLeftAlert([{ name: "", value: 2000, items: 1 }]);
  assert.equal(alert.body, "Someone filled 1 item and never paid.");
});

test("several carts are one notification carrying the whole amount", () => {
  const alert = cartsLeftAlert([
    { name: "Tolu", value: 8400, items: 3 },
    { name: "Ada", value: 1600, items: 1 },
  ]);
  assert.equal(alert.title, "₦10,000 left in 2 carts");
  assert.ok(alert.body.startsWith("2 people"));
});

test("a run closing with money out says the money, the time and the count", () => {
  const alert = unpaidRunAlert({
    label: "night",
    closes: "7:30 pm",
    orders: 4,
    total: 23500,
  });
  assert.equal(alert.title, "₦23,500 unpaid · closes 7:30 pm");
  assert.ok(alert.body.includes("4 orders"));
  assert.ok(alert.body.includes("night"));
  // It opens the list to chase from. Nothing a notification carries marks
  // anything paid.
  assert.equal(alert.url, "/admin/orders?view=new");
});

test("a single unpaid order on a closing run does not say 1 orders", () => {
  const alert = unpaidRunAlert({ label: "afternoon", closes: "2 pm", orders: 1, total: 5000 });
  assert.ok(alert.body.startsWith("1 order on the"));
  assert.ok(!alert.body.includes("1 orders"));
});

test("the VAPID key reads back as bytes, padding and swapped characters and all", () => {
  // "Hello-world_" in URL-safe base64, which is the alphabet the key uses:
  // minus and underscore where base64 has plus and slash, and no padding.
  const bytes = urlBase64ToBytes("SGVsbG8");
  assert.deepEqual([...bytes], [72, 101, 108, 108, 111]);

  // The two swapped characters have to come back as the bytes plus and
  // slash would have given, or the key is subtly wrong and every subscribe
  // fails with nothing to read.
  assert.deepEqual([...urlBase64ToBytes("-_8")], [...urlBase64ToBytes("+/8")]);
});

test("an applicationServerKey is the 65 bytes a push service expects", () => {
  // A real VAPID public key is 65 bytes, which is 87 URL-safe characters.
  const key = "B" + "A".repeat(86);
  assert.equal(urlBase64ToBytes(key).length, 65);
});

test("an iPhone is told about the Home Screen and a desktop is not", () => {
  assert.equal(isApple("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), true);
  assert.equal(isApple("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), true);
  assert.equal(isApple("Mozilla/5.0 (Linux; Android 14; Pixel 8)"), false);
  // A Mac has no Home Screen, so the sentence would only confuse.
  assert.equal(isApple("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), false);
});


test("orders are counted only inside the six hours after a send", () => {
  // The whole claim the notifications page makes is this window, so the
  // edges of it are the thing worth pinning down. An order placed in the
  // same second as the send counts, and one placed six hours later to the
  // second belongs to whatever was sent after it rather than to this one.
  const sent = "2026-10-03T10:00:00Z";
  const counted = ordersAfter(sent, [
    { created_at: "2026-10-03T09:59:59Z", total: 9000 },
    { created_at: "2026-10-03T10:00:00Z", total: 1000 },
    { created_at: "2026-10-03T13:30:00Z", total: 2500 },
    { created_at: "2026-10-03T16:00:00Z", total: 7000 },
  ]);
  assert.deepEqual(counted, { orders: 2, value: 3500, others: 0 });
});

test("an order of something else is counted apart, not towards the send", () => {
  // A notification about the Liverpool boxes followed by two orders of
  // other food is two orders of other food. The chip used to call them its
  // own, which is the one way a number on this page can lie.
  const counted = ordersAfter("2026-10-03T10:00:00Z", [
    { created_at: "2026-10-03T10:30:00Z", total: 9000, wanted: true },
    { created_at: "2026-10-03T11:00:00Z", total: 4000, wanted: false },
    { created_at: "2026-10-03T12:00:00Z", total: 2000, wanted: false },
  ]);
  assert.deepEqual(counted, { orders: 1, value: 9000, others: 2 });
  assert.equal(othersLine(2), "2 other orders in the same hours.");
  assert.equal(othersLine(1), "1 other order in the same hours.");
  // Nothing else happened, so the card says nothing rather than zero.
  assert.equal(othersLine(0), "");
});

test("where a send pointed is read back off the path it went with", () => {
  // The path is built from a dropdown rather than typed, so these are all
  // the shapes there are. Anything else reads as the shop front, because
  // being unable to tell what somebody was meant to order is not the same
  // as nobody having ordered it.
  assert.deepEqual(aimOf("/collections/liverpool-man-city"), {
    kind: "collection",
    slug: "liverpool-man-city",
  });
  assert.deepEqual(aimOf("/r/abc-123?category=pizza"), { kind: "restaurant", id: "abc-123" });
  assert.deepEqual(aimOf("/skincare"), { kind: "skincare" });
  assert.deepEqual(aimOf("/"), { kind: "shop" });
  assert.deepEqual(aimOf("/c/xyz"), { kind: "shop" });
});

test("a send with nothing readable on it counts nothing", () => {
  // A row with a broken moment on it must not count every order the shop
  // has ever taken, which is what a NaN window would have done.
  assert.deepEqual(
    ordersAfter("not a date", [{ created_at: "2026-10-03T10:00:00Z", total: 1000 }]),
    { orders: 0, value: 0, others: 0 }
  );
  // An order with a broken moment is skipped rather than counted as zero.
  assert.deepEqual(
    ordersAfter("2026-10-03T10:00:00Z", [{ created_at: "", total: 1000 }]),
    { orders: 0, value: 0, others: 0 }
  );
});

test("the outcome chip says orders came after, never that they came from", () => {
  // It is a correlation and the wording has to stay one: the orders were
  // placed after the send, which is not the same as because of it.
  const some = outcomeChip({ orders: 3, value: 12400 });
  assert.equal(some.label, "3 orders after \u00b7 \u20a612,400");
  assert.equal(some.good, true);
  // One order is said as one order, because "1 orders after" is the kind of
  // thing that makes a reader stop trusting the number beside it.
  assert.equal(outcomeChip({ orders: 1, value: 900 }).label, "1 order after \u00b7 \u20a6900");
  // Nothing came of it, which is a quiet night and not an error, so the
  // chip says so plainly and the page draws it on wash rather than in mint.
  assert.deepEqual(outcomeChip({ orders: 0, value: 0 }), {
    label: "No orders after",
    good: false,
  });
  // Where the send pointed at one thing, the chip is about that thing, so
  // it can never be read as credit for an order of something else.
  assert.equal(
    outcomeChip({ orders: 2, value: 48025, aimed: "Liverpool v Man City boxes" }).label,
    "2 Liverpool v Man City boxes \u00b7 \u20a648,025"
  );
  assert.deepEqual(outcomeChip({ orders: 0, value: 0, aimed: "Domino's boxes" }), {
    label: "No Domino's boxes after",
    good: false,
  });
});

test("a send is stamped the way the board writes one", () => {
  // The day first because the list is read downwards, and the clock closed
  // up because it sits in a line of small print. Lagos time, which is where
  // the shop and everybody reading this page is.
  assert.equal(sendStamp("2026-10-03T10:02:00Z"), "Sat 3 Oct, 11:02am");
  // Nothing readable in, nothing out, so a bad row prints nothing rather
  // than the epoch.
  assert.equal(sendStamp("never"), "");
});

test("the card says how long ago the last one went, and nothing until there is one", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  assert.equal(daysSince("2026-10-03T12:00:00Z", now), 7);
  assert.equal(lastSentLine("2026-10-03T12:00:00Z", now), "Last one went 7 days ago");
  // Today and yesterday are said as words, because "0 days ago" is not a
  // thing anybody says out loud.
  assert.equal(lastSentLine("2026-10-10T08:00:00Z", now), "Last one went today");
  assert.equal(lastSentLine("2026-10-09T08:00:00Z", now), "Last one went yesterday");
  // Nothing sent ever, so the card keeps the advice it has always carried
  // rather than reporting on a send that does not exist.
  assert.equal(lastSentLine(null, now), "");
});

test("a number is left alone for a fortnight, and put back by the clock alone", () => {
  // Not interested means two weeks of quiet. The fortnight is a date on the
  // cart rather than a flag, so nothing has to run at night to put somebody
  // back on the list: the moment passes and they are back.
  const now = new Date("2026-10-10T12:00:00Z");
  assert.equal(QUIET_DAYS, 14);
  assert.equal(quietUntil(now), "2026-10-24T12:00:00.000Z");

  const inside = { phone: "08011112222", quiet_until: "2026-10-24T12:00:00Z", bad_number: false };
  const over = { phone: "08033334444", quiet_until: "2026-10-01T12:00:00Z", bad_number: false };
  const bad = { phone: "08055556666", quiet_until: null, bad_number: true };
  const plain = { phone: "08077778888", quiet_until: null, bad_number: false };

  const hushed = hushedPhones([inside, over, bad, plain], now);
  assert.deepEqual([...hushed].sort(), ["08011112222", "08055556666"]);
});

test("one cart carrying the mark leaves every cart of that number alone", () => {
  // The two promises are about a person, not about a cart. Somebody who said
  // no on Tuesday has not changed their mind because they filled another
  // cart on Thursday, and the Thursday cart carries no mark of its own.
  const now = new Date("2026-10-10T12:00:00Z");
  const hushed = hushedPhones(
    [
      { phone: "08011112222", quiet_until: null, bad_number: true },
      { phone: "08011112222", quiet_until: null, bad_number: false },
    ],
    now
  );
  assert.equal(hushed.has("08011112222"), true);
});

test("the carts page can say why a number never appears again", () => {
  // A rule that quietly removes people is only honest if it can be read, so
  // every mark has a sentence and anything unmarked has none.
  const now = new Date("2026-10-10T12:00:00Z");
  assert.equal(
    hushNote({ quiet_until: null, bad_number: true }, now),
    "Number marked wrong"
  );
  assert.equal(
    hushNote({ quiet_until: "2026-10-24T12:00:00Z", bad_number: false }, now),
    "Quiet until Saturday, 24 Oct"
  );
  // A fortnight that has run out is not a reason for anything, so it says
  // nothing and the cart is back on the list.
  assert.equal(
    hushNote({ quiet_until: "2026-10-01T12:00:00Z", bad_number: false }, now),
    ""
  );
  assert.equal(hushNote({ quiet_until: null, bad_number: false }, now), "");
});

test("no server page imports a value out of a client component", () => {
  /*
   * The bug this catches took the customer book down in production and
   * nothing else in this suite could see it.
   *
   * A server component that imports a value from a "use client" module is
   * not handed the value. The bundler gives it a reference to something
   * that only exists in the browser, so the first time the server dots into
   * it the render throws, while the build, the types and every other test
   * pass: it fails only when somebody opens the page. The customers page
   * read VIEWS and called broadcastHref straight out of the composer.
   *
   * The rule a client module can be held to is that everything a server
   * file takes out of it by name is either a component, which is always
   * PascalCase, or a type, which is erased before any of this matters.
   * Data in SCREAMING_CASE and functions in camelCase belong in a module
   * with no directive on it, where both halves get the real thing.
   */
  const dir = new URL("..", import.meta.url).pathname;
  const walk = (at: string): string[] =>
    readdirSync(join(dir, at), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? entry.name === "node_modules"
          ? []
          : walk(join(at, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [join(at, entry.name)]
          : []
    );

  const source = (file: string) => readFileSync(join(dir, file), "utf8");
  const onClient = (file: string) => /^\s*["']use client["']/.test(source(file));

  const resolve = (spec: string, from: string): string | null => {
    const base = spec.startsWith("@/")
      ? spec.slice(2)
      : spec.startsWith(".")
        ? join(from, "..", spec)
        : null;
    if (base === null) return null;
    for (const ext of [".tsx", ".ts"]) {
      if (existsSync(join(dir, base + ext))) return base + ext;
    }
    return null;
  };

  const wrong: string[] = [];
  for (const file of [...walk("app"), ...walk("components"), ...walk("lib")]) {
    if (onClient(file)) continue;
    for (const found of source(file).matchAll(
      /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g
    )) {
      const target = resolve(found[2], file);
      if (target === null || !onClient(target)) continue;
      for (const raw of found[1].split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (name === "" || name.startsWith("type ")) continue;
        // A component. Anything else is data or a function.
        if (/^[A-Z][a-z]/.test(name)) continue;
        wrong.push(`${file} imports ${name} from ${found[2]}`);
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test("a closure says its dates the way somebody would read them", () => {
  // A range inside one month says the month once.
  assert.equal(rangeLabel("2026-10-26", "2026-10-30", "2026-10-10"), "26 to 30 October");
  // One day is one date, not a range of it against itself.
  assert.equal(rangeLabel("2026-10-30", "2026-10-30", "2026-10-10"), "30 October");
  // Across a month, both months.
  assert.equal(
    rangeLabel("2026-10-30", "2026-11-02", "2026-10-10"),
    "30 October to 2 November"
  );
  // Next year is worth saying. This year is not.
  assert.equal(
    rangeLabel("2027-01-04", "2027-01-08", "2026-10-10"),
    "4 to 8 January 2027"
  );
  // A date nobody can read is nothing, never a crash.
  assert.equal(rangeLabel("", "", "2026-10-10"), "");
});

test("a closure on now counts down, and one ahead names its days", () => {
  const off = {
    id: "1",
    name: "Mid-semester break",
    starts_on: "2026-10-26",
    ends_on: "2026-10-30",
    note: "",
  };

  assert.equal(isOn(off, "2026-10-27"), true);
  assert.equal(isOn(off, "2026-10-26"), true);
  // Both ends are days off, so the last one is still on.
  assert.equal(isOn(off, "2026-10-30"), true);
  assert.equal(isOn(off, "2026-10-31"), false);
  assert.equal(isOn(off, "2026-10-25"), false);

  // Ahead of it, the whole range. Inside it, when it lifts, because that is
  // the only part anybody standing in it wants.
  assert.equal(
    closureSaid(off, "2026-10-20"),
    "No runs 26 to 30 October · Mid-semester break"
  );
  assert.equal(
    closureSaid(off, "2026-10-27"),
    "No runs until 30 October · Mid-semester break"
  );
  // Unnamed is the days and nothing invented.
  assert.equal(
    closureSaid({ ...off, name: "  " }, "2026-10-20"),
    "No runs 26 to 30 October"
  );
});

test("a run follows its orders, forwards only", () => {
  // The only order on the car, handed over. The car is done, and all that is
  // left is closing the books.
  assert.equal(runShouldBe("on_the_road", ["delivered"]), "handed_out");

  // One of five. That one is out, the car is at the hostels, and it stays
  // there until the other four have gone too.
  assert.equal(
    runShouldBe("on_the_road", ["delivered", "paid", "paid", "paid", "paid"]),
    "at_drop"
  );
  assert.equal(
    runShouldBe("at_drop", ["delivered", "delivered", "delivered", "delivered", "delivered"]),
    "handed_out"
  );

  // An unpaid order is still something the run is waiting on, so the last
  // paid bag going out does not finish the run.
  assert.equal(runShouldBe("at_drop", ["delivered", "pending"]), null);
  // Cancelling it is the decision that does. A refunded one counts the same.
  assert.equal(runShouldBe("at_drop", ["delivered", "cancelled"]), "handed_out");
  assert.equal(runShouldBe("at_drop", ["delivered", "refunded"]), "handed_out");

  // Nothing delivered yet is nothing to say. The run keeps the stage it was
  // given by hand.
  assert.equal(runShouldBe("at_counter", ["paid", "paid"]), null);

  // Never backwards: a run already handed out is not pulled back to the
  // hostels by one more order appearing on it.
  assert.equal(runShouldBe("handed_out", ["delivered", "paid"]), null);
  // And an at_drop run is not told to be at_drop again.
  assert.equal(runShouldBe("at_drop", ["delivered", "paid"]), null);

  // An empty run is an empty run, not a delivered one.
  assert.equal(runShouldBe("closed", []), null);
  assert.equal(runShouldBe("closed", ["cancelled", "cancelled"]), null);

  // A run nobody had moved along at all, with its one order handed over in
  // the doorway. It jumps to the end, because it is at the end.
  assert.equal(runShouldBe("ordering", ["delivered"]), "handed_out");
});

test("a closure takes every day it covers inside the window, and none outside", () => {
  const breakWeek = [{ starts_on: "2026-10-26", ends_on: "2026-10-30" }];

  // The whole of it, when the window is wider.
  assert.deepEqual(
    [...datesIn(breakWeek, "2026-10-20", "2026-11-10")].sort(),
    ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]
  );

  // A closure that started before the window still takes its days inside
  // it. This is the one that matters: the opener asks about three weeks at
  // a time, so a break is nearly always already running when it asks.
  assert.deepEqual(
    [...datesIn(breakWeek, "2026-10-28", "2026-11-02")].sort(),
    ["2026-10-28", "2026-10-29", "2026-10-30"]
  );

  // And one that ends after it.
  assert.deepEqual(
    [...datesIn(breakWeek, "2026-10-20", "2026-10-27")].sort(),
    ["2026-10-26", "2026-10-27"]
  );

  // No overlap is no days.
  assert.deepEqual([...datesIn(breakWeek, "2026-11-01", "2026-11-05")], []);

  // One day is one day, and two closures merge rather than double-count.
  assert.deepEqual(
    [
      ...datesIn(
        [
          { starts_on: "2026-12-25", ends_on: "2026-12-25" },
          { starts_on: "2026-12-25", ends_on: "2026-12-26" },
        ],
        "2026-12-01",
        "2026-12-31"
      ),
    ].sort(),
    ["2026-12-25", "2026-12-26"]
  );

  // A window nobody can read, and a row nobody can read, are both nothing
  // rather than a crash on the path that opens the shop's runs.
  assert.deepEqual([...datesIn(breakWeek, "", "")], []);
  assert.deepEqual([...datesIn([{ starts_on: "", ends_on: "" }], "2026-10-20", "2026-10-30")], []);
});

test("a run is completed in admin only once the books are closed", () => {
  // Handed out, books still open. There is something left to do, so the
  // word has to say so.
  assert.equal(adminStageLabel("handed_out", null), "Delivered");
  assert.equal(adminStatusWord("delivered", null), "delivered");

  // Books closed. Nothing about this run is anybody's job now.
  assert.equal(adminStageLabel("handed_out", "2026-10-10T18:00:00Z"), "Completed");
  assert.equal(adminStatusWord("delivered", "2026-10-10T18:00:00Z"), "completed");

  // Every other stage is untouched, settled or not. Settling is only ever
  // the last step, so this should never arise, and a run that somehow
  // carries both still says where its food got to.
  assert.equal(adminStageLabel("on_the_road", "2026-10-10T18:00:00Z"), "On the road to you");
  assert.equal(adminStageLabel("ordering", null), "Ordering is open");
  assert.equal(adminStatusWord("open", null), "open");
  assert.equal(adminStatusWord("cancelled", "2026-10-10T18:00:00Z"), "cancelled");

  // What the customer reads is untouched by any of it.
  assert.equal(STAGE_LABEL.handed_out, "Delivered");
});

test("the last step of an order says whether a review came back", () => {
  const base = {
    created_at: "2026-10-09T18:43:00Z",
    paid_at: "2026-10-09T19:29:00Z",
    done_at: "2026-10-09T21:00:00Z",
    rated_at: null,
    status: "delivered",
    payment_method: "transfer",
    hostel: "Trinity",
    batchStage: "handed_out",
  };
  const last = (order: Parameters<typeof orderStory>[0]) =>
    orderStory(order, () => "19:29").at(-1)!;

  // Nothing back. The step is the only one on the list not done.
  assert.deepEqual(last(base), { label: "Reviewed", when: "", done: false });

  // Ticked off as having reviewed on Google. It used to read "Review asked
  // / Not yet" for somebody who had written one, which is the whole bug.
  assert.deepEqual(last({ ...base, reviewed: true }), {
    label: "Reviewed",
    when: "On Google",
    done: true,
  });

  // Stars on this order are the other kind, and carry their own moment.
  assert.deepEqual(last({ ...base, rated_at: "2026-10-09T22:00:00Z" }), {
    label: "Reviewed",
    when: "19:29",
    done: true,
  });

  // The stars win the line where somebody has done both, because only one
  // of the two happened at a time anybody can name.
  assert.equal(last({ ...base, rated_at: "2026-10-09T22:00:00Z", reviewed: true }).when, "19:29");
});

test("a wanted code is tidied to what the shop would really store", () => {
  // Capitals, spaces and punctuation all go, because a code is one word.
  assert.equal(tidyCode("John Doe"), "johndoe");
  assert.equal(tidyCode("  Chi-Chi  "), "chichi");
  // Pasting the whole address back is the commonest thing anybody does with
  // a box that has the address printed beside it.
  assert.equal(tidyCode("sudu.store/s/kayla"), "kayla");
  assert.equal(tidyCode("https://sudu.store/s/kayla"), "kayla");
  // Digits stay, since a collision at approval time appends one.
  assert.equal(tidyCode("kayla2"), "kayla2");
  // Sixteen is the most, the same as the length a name is cut to.
  assert.equal(tidyCode("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnop");
  assert.equal(tidyCode(""), "");
});

test("the code box answers what it can without asking the shop", () => {
  // Nothing typed is not an objection.
  assert.equal(whyNotACode(""), "");
  assert.equal(whyNotACode("ab"), "A bit short, three letters at least.");
  assert.equal(whyNotACode("abc"), "");
  // The shop's own words are not anybody's to take.
  assert.equal(whyNotACode("admin"), "That one is the shop's own.");
  assert.equal(whyNotACode("sudu"), "That one is the shop's own.");
  // An ordinary name is fine, and whether somebody already has it is a
  // question for the database rather than for this.
  assert.equal(whyNotACode("johndoe"), "");
});

test("a From header is read for the name and the address", () => {
  assert.equal(senderName("Kayla <kayla@example.com>"), "Kayla");
  assert.equal(senderName('"Okeke, Chi" <chi@example.com>'), "Okeke, Chi");
  // No name is the address, which is still something to show in a list.
  assert.equal(senderName("chi@example.com"), "chi@example.com");
  assert.equal(senderName("<chi@example.com>"), "chi@example.com");

  assert.equal(addressOf("Kayla <kayla@example.com>"), "kayla@example.com");
  assert.equal(addressOf("  kayla@example.com "), "kayla@example.com");
  // Nothing that could be replied to is an empty string rather than a guess,
  // because the page offers a reply box off the back of this.
  assert.equal(addressOf("Kayla"), "");
  assert.equal(addressOf(""), "");
});

test("a reply is called Re: once, however often it goes back and forth", () => {
  assert.equal(replySubject("My order"), "Re: My order");
  assert.equal(replySubject("Re: My order"), "Re: My order");
  // Clients that add their own are how a subject becomes Re: Re: Re:.
  assert.equal(replySubject("RE: my order"), "RE: my order");
  // A letter with no subject still needs one.
  assert.equal(replySubject(""), "Re: your email");
  assert.equal(replySubject("   "), "Re: your email");
});

test("a snippet is one flat line, cut where it runs long", () => {
  assert.equal(snippet("Hi there\n\n  I wanted to ask"), "Hi there I wanted to ask");
  assert.equal(snippet(""), "");
  const long = "a".repeat(200);
  assert.equal(snippet(long, 10).length, 10);
  assert.ok(snippet(long, 10).endsWith("…"));
  // Short enough is left exactly as it is, with no ellipsis bolted on.
  assert.equal(snippet("Short one", 50), "Short one");
});

test("only a domain that vouched for itself counts as vouched for", () => {
  assert.equal(vouchedFor({ spf: "pass", dkim: "pass", dmarc: "pass" }), true);
  // Case is whatever the provider felt like sending.
  assert.equal(vouchedFor({ spf: "PASS", dkim: "Pass", dmarc: "" }), true);
  // Either one failing is a letter worth a second look.
  assert.equal(vouchedFor({ spf: "fail", dkim: "pass", dmarc: "pass" }), false);
  assert.equal(vouchedFor({ spf: "pass", dkim: "none", dmarc: "pass" }), false);
  // Nothing said is not a pass.
  assert.equal(vouchedFor({ spf: "", dkim: "", dmarc: "" }), false);
});

test("a webhook signature is checked the way the scheme says", () => {
  /*
   * The vector published in the Svix docs, which is what Resend signs with.
   * Checking against somebody else's known answer rather than against our
   * own output is the whole point: a signature check that only agrees with
   * itself would pass while rejecting every real request.
   */
  const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
  const id = "msg_p5jXN8AQM9LWM0D4loKWxJek";
  const timestamp = "1614265330";
  const body = '{"test": 2432232314}';
  const signature = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
  // The vector is from 2021, so the clock is told where it is meant to be.
  const now = 1614265330;

  assert.equal(svixSigned({ secret, id, timestamp, body, signature, now }), true);

  // A changed body is the thing this exists to catch.
  assert.equal(
    svixSigned({ secret, id, timestamp, body: '{"test": 1}', signature, now }),
    false
  );
  // So is somebody replaying a request captured an hour ago.
  assert.equal(
    svixSigned({ secret, id, timestamp, body, signature, now: now + 3600 }),
    false
  );
  // A different secret, a different id, a missing header: all no.
  assert.equal(
    svixSigned({ secret: "whsec_aaaa", id, timestamp, body, signature, now }),
    false
  );
  assert.equal(
    svixSigned({ secret, id: "msg_other", timestamp, body, signature, now }),
    false
  );
  assert.equal(svixSigned({ secret, id, timestamp, body, signature: "", now }), false);
  assert.equal(svixSigned({ secret: "", id, timestamp, body, signature, now }), false);

  // Several signatures arrive while a secret is being rotated, and any one
  // of them matching is the provider.
  assert.equal(
    svixSigned({ secret, id, timestamp, body, signature: `v1,bm90 ${signature}`, now }),
    true
  );
});

test("an alert is told from a letter by who it was sent to", () => {
  // The address the shop chose, not the From line: a forwarded alert is
  // from the bank, or from Gmail, or from whatever the forwarding did to
  // it, and none of those is a thing to sort on.
  assert.equal(isAlert("payments@sudu.store"), true);
  assert.equal(isAlert("Payments@Sudu.Store"), true);
  // Several recipients, one of them ours.
  assert.equal(isAlert("someone@else.com, payments@sudu.store"), true);
  assert.equal(isAlert("hello@sudu.store"), false);
  assert.equal(isAlert(""), false);
});

test("a Catlog alert is read for its amount and who paid", () => {
  // The real thing, forwarded by hand, as it arrived.
  const subject = "Fwd: BEST ETI-INYENE IDONGESIT just paid you NGN 11,700.00 🤑";
  const body = [
    "---------- Forwarded message ---------",
    "From: Catlog <holla@catlog.shop>",
    "Date: Sat, 10 Oct 2026 at 09:38",
    "Subject: BEST ETI-INYENE IDONGESIT just paid you NGN 11,700.00 🤑",
    "To: <nazaalistic@gmail.com>",
    "",
    "You just received NGN 11,700.00 from BEST ETI-INYENE IDONGESIT. Your wallet",
    "balance is now NGN 11,760.25",
  ].join("\n");

  const want = { amount: 11700, payer: "BEST ETI-INYENE IDONGESIT" };
  // The subject carries both facts, and the Fwd: in front of it is not part
  // of anybody's name.
  assert.deepEqual(readAlert(subject, ""), want);
  // So does the body, and a forwarded email carries its own header inside
  // it, so the name must not walk backwards into "shop> Subject:".
  assert.deepEqual(readAlert("", body), want);
  assert.deepEqual(readAlert(subject, body), want);

  // Kobo is dropped rather than rounded: an order's total is whole naira.
  assert.equal(readAlert("Ada Obi just paid you NGN 9,999.99", "")?.amount, 9999);
  // Anything that is not an alert is nothing, never a zero: an alert read
  // as zero naira would match every free order in the book.
  assert.equal(readAlert("Your weekly summary", "Nothing to see"), null);
  assert.equal(readAlert("", ""), null);
});

test("an alert suggests the orders it could be, best first", () => {
  const alert = { amount: 11700, payer: "BEST ETI-INYENE IDONGESIT" };
  const orders = [
    // Same amount, no word in common, and from weeks ago.
    { id: "b", order_no: 1010, customer_name: "Ada Obi", total: 11700, created_at: "2026-09-01T08:00:00Z" },
    // The one. The book has a short name and the bank has the full one,
    // which is the whole reason this matches on words rather than strings.
    { id: "a", order_no: 1036, customer_name: "BEST", total: 11700, created_at: "2026-10-10T08:36:58Z" },
    // Right person, wrong money. A transfer is for what it is for.
    { id: "c", order_no: 1011, customer_name: "BEST", total: 9000, created_at: "2026-10-10T08:40:00Z" },
  ];

  const found = likelyOrders(alert, orders, Date.parse("2026-10-10T09:38:00Z"));
  // Both of the right amount come back, because two people paying the same
  // amount on one run is a real Saturday and the honest answer is a choice.
  assert.deepEqual(found.map((one) => one.orderNo), [1036, 1010]);
  assert.equal(found[0].shared, 1);
  assert.equal(found[1].shared, 0);

  // Nothing of that amount is nothing, rather than the nearest thing.
  assert.deepEqual(likelyOrders({ amount: 500, payer: "BEST" }, orders), []);
});

test("two spellings of one name are compared on their words", () => {
  // The book's name inside the bank's fuller one, either way round.
  assert.equal(nameOverlap("BEST ETI-INYENE IDONGESIT", "BEST"), 1);
  assert.equal(nameOverlap("OGBE IYERESIRI PRECIOUS", "Iyeresiri Ogbe"), 2);
  // Case and punctuation are the bank's business, not a difference.
  assert.equal(nameOverlap("ada obi", "ADA OBI"), 2);
  // Nothing in common is nothing.
  assert.equal(nameOverlap("Ada Obi", "BEST"), 0);
  // Two letters and under are dropped: an initial matches everybody, and a
  // suggestion that matches everybody is noise.
  assert.equal(nameOverlap("A B Okeke", "A B Danjuma"), 0);
  assert.equal(nameOverlap("", "BEST"), 0);
});

test("an order number in the alert outranks the names, when there ever is one", () => {
  /*
   * Catlog does not pass the narration on today, so this finds nothing and
   * the names decide. The shop keeps asking people to type their order
   * number into the transfer, against the day it comes through, and this is
   * what happens when it does.
   */
  const alert = { amount: 11700, payer: "BEST ETI-INYENE IDONGESIT" };
  const orders = [
    { id: "a", order_no: 1036, customer_name: "BEST", total: 11700, created_at: "2026-10-10T08:36:58Z" },
    { id: "b", order_no: 1040, customer_name: "Ada Obi", total: 11700, created_at: "2026-10-10T09:00:00Z" },
  ];
  const at = Date.parse("2026-10-10T09:38:00Z");

  // Nothing to read: the shared name wins, which is today.
  assert.deepEqual(likelyOrders(alert, orders, at, "").map((one) => one.orderNo), [1036, 1040]);

  // The narration names the other one. It is the one, whatever the names
  // say, because a number somebody typed beats a word they share.
  const named = likelyOrders(alert, orders, at, "Narration: 1040");
  assert.deepEqual(named.map((one) => one.orderNo), [1040, 1036]);
  assert.equal(named[0].named, true);
  assert.equal(named[1].named, false);

  // A number cannot be found inside another number: a wallet balance of
  // 11,760.25 does not name order 1176, and the amount does not name 1170.
  assert.equal(mentions("Your wallet balance is now NGN 11,760.25", 1176), false);
  assert.equal(mentions("NGN 11,700.00", 1170), false);
  // Written with or without the grouping, it is the same number.
  assert.equal(mentions("Ref 1036", 1036), true);
  assert.equal(mentions("Ref 1,036", 1036), true);
  assert.equal(mentions("Ref 1036", 1037), false);
  assert.equal(mentions("anything", null), false);
});


/*
 * An empty run is not closed at its cut-off.
 *
 * The cut-off exists so there is time to go and fetch the food. A run with
 * nothing on it has nothing to fetch, so closing it at noon only turns away
 * the one person who was going to order at two. It is held to three hours
 * before the last delivery of the day instead, which is a fact about the
 * shop rather than about this run.
 */
const lagosClock = (iso: string | null) =>
  iso === null
    ? null
    : new Date(iso).toLocaleTimeString("en-GB", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
      });

const onDay = "2026-10-29";
const morning = new Date("2026-10-29T09:00:00+01:00");
const aRun = (over: Record<string, unknown> = {}) => ({
  run_date: onDay,
  delivery_window_text: "Between 3:30pm and 5:30pm",
  kind: "run",
  areas: "",
  ...over,
});

test("an empty run is held to three hours before the last delivery", () => {
  // The shop's own example: deliveries stop at seven, so a quiet run stays
  // open until four, whatever its own window said.
  assert.equal(lagosClock(emptyRunClosesAt(aRun(), morning, [], 19)), "16:00");

  // The window it was given makes no difference: the anchor is the shop's
  // last delivery, not this run's own text.
  assert.equal(
    lagosClock(emptyRunClosesAt(aRun({ delivery_window_text: "Between 3pm and 5pm" }), morning, [], 19)),
    "16:00"
  );

  // A shop that stops delivering earlier holds its runs for less.
  assert.equal(lagosClock(emptyRunClosesAt(aRun(), morning, [], 18)), "15:00");

  // Only a shared run. A car going out for one order, a parcel and a box
  // day each have a cut-off that means something of its own.
  assert.equal(emptyRunClosesAt(aRun({ kind: "same_day" }), morning, [], 19), null);
  assert.equal(emptyRunClosesAt(aRun({ kind: "parcel" }), morning, [], 19), null);

  // Past the held time already: late rather than quiet, so it closes.
  assert.equal(
    emptyRunClosesAt(aRun(), new Date("2026-10-29T18:00:00+01:00"), [], 19),
    null
  );
});

/*
 * A run that goes to Lekki keeps its cut-off.
 *
 * Three hours is not enough to reach Lekki or Ikoyi and come back, which is
 * the same reason a car of its own is never offered there. So the rule is
 * read off that flag rather than off the name: the far area the shop adds
 * next is covered the day somebody ticks the box in admin.
 */
test("an empty run going somewhere far is not held open", () => {
  const far = [
    { id: "l", name: "Lekki/Ikoyi", runExtra: 5000, sameDayExtra: 0, sameDay: false },
  ];

  // Sangotedo only: held to four, as before.
  assert.equal(lagosClock(emptyRunClosesAt(aRun(), morning, far, 19)), "16:00");

  // The same run, routed through Lekki: not held at all.
  assert.equal(emptyRunClosesAt(aRun({ areas: "|l|" }), morning, far, 19), null);

  // An area the shop can reach in three hours does not stop it.
  const near = [{ id: "n", name: "Novare", runExtra: 500, sameDayExtra: 0, sameDay: true }];
  assert.equal(lagosClock(emptyRunClosesAt(aRun({ areas: "|n|" }), morning, near, 19)), "16:00");

  // No areas configured at all is the shop as it was before areas existed.
  assert.equal(lagosClock(emptyRunClosesAt(aRun(), morning, [], 19)), "16:00");
});

/*
 * The window moves with the cut-off.
 *
 * Leaving "Between 3:30pm and 5:30pm" over a run that now closes at four
 * promises a delivery before ordering has even shut.
 */
test("a held run is given a window it can actually meet", () => {
  const heldAtFour = new Date("2026-10-29T16:00:00+01:00").toISOString();
  assert.equal(windowAfterHolding(heldAtFour, 19), "Between 5pm and 7pm");

  // A half past close keeps its half past.
  const heldAtHalfTwo = new Date("2026-10-29T14:30:00+01:00").toISOString();
  assert.equal(windowAfterHolding(heldAtHalfTwo, 19), "Between 3:30pm and 7pm");

  // Held so late there is no room for a window: said as a deadline rather
  // than as a range that starts after it ends.
  const heldAtSix = new Date("2026-10-29T18:00:00+01:00").toISOString();
  assert.equal(windowAfterHolding(heldAtSix, 19), "By 7pm");
});


/*
 * A handle, however it was typed.
 *
 * The footer's Instagram link was dead because the field held the whole
 * address and the link builder encoded it as if it were a name.
 */
test("a social handle survives being pasted as a whole address", () => {
  assert.equal(instagramLink("sudustore"), "https://instagram.com/sudustore");
  assert.equal(instagramLink("@sudustore"), "https://instagram.com/sudustore");
  assert.equal(
    instagramLink("https://www.instagram.com/sudustore"),
    "https://instagram.com/sudustore"
  );
  // A trailing slash, and whatever the app hangs off the end of a profile.
  assert.equal(
    instagramLink("https://instagram.com/sudustore/?hl=en"),
    "https://instagram.com/sudustore"
  );
  assert.equal(instagramLink("  "), null);

  // X, and twitter.com, which is what half of these will be copied from.
  assert.equal(xLink("sudu_store"), "https://x.com/sudu_store");
  assert.equal(xLink("@sudu_store"), "https://x.com/sudu_store");
  assert.equal(xLink("https://x.com/sudu_store"), "https://x.com/sudu_store");
  assert.equal(xLink("https://twitter.com/sudu_store"), "https://x.com/sudu_store");
  assert.equal(xLink(""), null);
});

/*
 * Five addresses from one, so none of them can be left behind.
 */
test("the shop's other addresses are read off the one that is written down", () => {
  const said = shopEmails("hello@sudu.store");
  assert.deepEqual(said, {
    hello: "hello@sudu.store",
    support: "support@sudu.store",
    orders: "orders@sudu.store",
    privacy: "privacy@sudu.store",
    terms: "terms@sudu.store",
  });

  // Whatever was typed, within reason.
  assert.equal(shopEmails("  Hello@Sudu.Store ")?.privacy, "privacy@sudu.store");
  // The domain moves and all five move with it.
  assert.equal(shopEmails("hi@sudu.ng")?.orders, "orders@sudu.ng");

  // Nothing rather than a mailto: to nowhere.
  assert.equal(shopEmails(""), null);
  assert.equal(shopEmails("not an address"), null);
  assert.equal(shopEmails("@sudu.store"), null);
  assert.equal(shopEmails("hello@"), null);
});


test("an alert with nothing unpaid names the order that was already paid", () => {
  // The common case by far: the transfer is marked paid from the orders
  // screen as the bank app shows it, and the alerts tab is read afterwards.
  // "Either it is already marked paid, or this is money for something else"
  // made somebody go and find out which. This says which.
  const alert = { amount: 22375, payer: "ERIN TIOLUWANI RHODES" };
  const rows = [
    {
      id: "a",
      order_no: 1044,
      customer_name: "Erin",
      total: 22375,
      paid_at: "2026-10-14T11:04:12Z",
    },
    // Same money, a different week and a different person. It is still a
    // candidate, and it is not the first one.
    {
      id: "b",
      order_no: 1002,
      customer_name: "Somebody Else",
      total: 22375,
      paid_at: "2026-10-01T09:00:00Z",
    },
    // A different amount is a different transfer, whatever the name says.
    {
      id: "c",
      order_no: 1043,
      customer_name: "Erin",
      total: 9000,
      paid_at: "2026-10-14T11:00:00Z",
    },
  ];
  const found = settledBy(alert, rows, Date.parse("2026-10-14T11:06:00Z"));
  assert.equal(found.length, 2);
  assert.equal(found[0].orderNo, 1044);
  assert.equal(found[0].shared, 1);

  // Money the shop cannot place at all stays unplaced. Inventing a match
  // here would be worse than the sentence it replaced.
  assert.deepEqual(settledBy({ amount: 500, payer: "ERIN" }, rows), []);
});

test("a half and half costs the dearer half, not the two added together", () => {
  // The order that cost real money. A large Half & Half, Extravaganza on one
  // side and BBQ Chicken on the other, was charged ₦13,375 when the
  // Extravaganza alone is ₦15,225 at that size: less than either half as a
  // whole pizza, on a line where the shop still buys a whole pizza.
  const size = {
    name: "Size",
    options: [
      { id: "m", name: 'Medium 12"', priceDelta: 0 },
      { id: "l", name: 'Large 14"', priceDelta: 0 },
    ],
  };
  const extravaganza = {
    id: "ex",
    name: "Extravaganza",
    priceDelta: 0,
    asItem: { base: 9800, delta: { [priceKey("Size", 'Large 14"')]: 5425 } },
  };
  const bbq = {
    id: "bbq",
    name: "BBQ Chicken",
    priceDelta: 0,
    asItem: { base: 9350, delta: { [priceKey("Size", 'Large 14"')]: 4300 } },
  };
  const groups = [
    size,
    { name: "First half", dearest: true, options: [extravaganza, bbq] },
    { name: "Second half", dearest: true, options: [extravaganza, bbq] },
  ];

  // Large, Extravaganza, BBQ Chicken: the Extravaganza is dearer, so that is
  // what the pizza costs. The figure on the item itself is left out of it,
  // because the halves are the whole price: here it is 8,600, the cheapest
  // this pizza can come to, which is what a menu card wants to say.
  assert.equal(pickedPrice(8600, groups, ["l", "ex", "bbq"]), 15225);
  assert.equal(pickedPrice(0, groups, ["l", "ex", "bbq"]), 15225);
  // The same two halves at medium, where the gap between them is different,
  // which is why no flat figure could ever have been right at both sizes.
  assert.equal(pickedPrice(8600, groups, ["m", "ex", "bbq"]), 9800);
  // Both halves the cheaper flavour is the cheaper pizza, not two of it.
  assert.equal(pickedPrice(8600, groups, ["l", "bbq"]), 13650);

  // What each half would make it, for the line beside its name.
  assert.equal(halfShown(groups[1], extravaganza, groups, ["l", "ex", "bbq"]), 15225);
  assert.equal(halfShown(groups[1], bbq, groups, ["l", "ex", "bbq"]), 13650);
  // An ordinary group is not a halves group and says nothing here.
  assert.equal(halfShown(size, size.options[0], groups, ["l"]), null);
});

test("everything that is not halves still simply adds up", () => {
  // The rule changed for one kind of group and must not have moved for any
  // other: a size, a crust and two extras are four things done to one pizza
  // and each costs what it says.
  const groups = [
    {
      name: "Size",
      options: [
        { id: "m", name: "Medium", priceDelta: 0 },
        { id: "l", name: "Large", priceDelta: 3100 },
      ],
    },
    {
      name: "Extra toppings",
      options: [
        { id: "cheese", name: "Mozzarella", priceDelta: 1200 },
        { id: "beef", name: "Beef", priceDelta: 800 },
      ],
    },
  ];
  assert.equal(pickedPrice(8800, groups, ["l", "cheese", "beef"]), 13900);
  assert.equal(pickedPrice(8800, groups, []), 8800);
});

test("a typo is an ordinary thing to type, not a reason to be thrown out", () => {
  // The chat exists to make ordering faster than tapping through a menu.
  // That only holds if a missing letter still finds the food, so this is
  // the test that matters most: nobody should meet WhatsApp because they
  // dropped an E.
  const menu: BotCandidate[] = [
    { id: "wings", name: "Chicken wings, 7 pcs", also: ["Domino's"] },
    { id: "bbq", name: "BBQ Chicken pizza", also: ["Domino's"] },
    { id: "marg", name: "Margherita pizza", also: ["Domino's"] },
    { id: "cola", name: "Coca Cola 50cl", also: ["Domino's"] },
  ];

  // Letters missed out, letters doubled, letters swapped.
  for (const typo of ["chiken wings", "chicken wigs", "chcken wings", "chickenn wings"]) {
    const found = botFind(typo, menu);
    assert.equal(found.hits[0]?.id, "wings", `${typo} should still find the wings`);
  }

  // Half a word is enough, because people stop typing when they can see it.
  assert.equal(botFind("margh", menu).hits[0]?.id, "marg");

  // Said plainly and in full, the chat does not stop to ask.
  assert.equal(botFind("bbq chicken pizza", menu).how, "sure");

  // Said loosely, where two things are genuinely close, it asks rather than
  // guesses: a wrong guess costs an order, a question costs one tap.
  const vague = botFind("chicken", menu);
  assert.equal(vague.how, "asking");
  assert.ok(vague.hits.length >= 2, "should offer the ones it is choosing between");

  // Nothing like anything on the menu is lost, and the chat shows the list
  // rather than the door.
  assert.equal(botFind("a bicycle", menu).how, "lost");
});

test("the chat reads how many, and whether somebody wants a person", () => {
  assert.equal(botHowMany("2 medium bbq pizzas and wings"), 2);
  assert.equal(botHowMany("three chicken wings"), 3);
  assert.equal(botHowMany("a pizza"), 1);
  // Nothing daft: ninety pizzas is a phone call, not a chat.
  assert.equal(botHowMany("90 pizzas"), 1);

  assert.equal(botWantsAPerson("can I talk to someone"), true);
  assert.equal(botWantsAPerson("chicken wings"), false);

  assert.equal(botYesNo("yeah that one"), "yes");
  assert.equal(botYesNo("no I meant the other"), "no");
  assert.equal(botYesNo("chicken"), "");
});

test("naming two counters is a question about where, not about what", () => {
  // "Domino's and KFC" searched against a menu finds nothing worth
  // offering, so it is read first and answered as what it is: two
  // questions, in the order they were said.
  const shops = [
    { id: "d", name: "Domino's Pizza" },
    { id: "k", name: "KFC" },
    { id: "c", name: "Chicken Republic" },
  ];
  assert.deepEqual(botNamedIn("domino and kfc", shops).map((one) => one.id), ["d", "k"]);
  // Order follows the sentence, because that is the order to ask in.
  assert.deepEqual(
    botNamedIn("chicken republic and dominos", shops).map((one) => one.id),
    ["c", "d"]
  );
  // A typo in a name is still that name.
  assert.deepEqual(botNamedIn("dominoes", shops).map((one) => one.id), ["d"]);
  // Food is not a counter. Chicken belongs to the wings and to half the
  // menu, so Chicken Republic is found by Republic or not at all.
  assert.deepEqual(botNamedIn("chicken wings", shops), []);
});

test("a name that is really an order is caught, once, and then believed", () => {
  // Asked their name, a fair few people answer with what they came for.
  // Taken at face value, every message afterwards is addressed to a pizza
  // shop and the customer book fills up with people called Chicken.
  const kitchens = [
    { id: "d", name: "Domino's Pizza" },
    { id: "k", name: "KFC" },
  ];
  assert.equal(botLooksLikeAName("Naza", kitchens), true);
  assert.equal(botLooksLikeAName("Chinaza Okeke", kitchens), true);
  assert.equal(botLooksLikeAName("dominos", kitchens), false);
  assert.equal(botLooksLikeAName("chicken", kitchens), false);
  assert.equal(botLooksLikeAName("i want pizza", kitchens), false);
  assert.equal(botLooksLikeAName("0803", kitchens), false);
  assert.equal(botLooksLikeAName("", kitchens), false);
});

test("a number the rider cannot ring is not a number", () => {
  // However it is typed, it is the same person, and anything that is not a
  // Nigerian mobile is refused while they are still looking at the box
  // rather than at the end when it is too late to ask.
  assert.equal(botPhoneIn("0803 123 4567"), "08031234567");
  assert.equal(botPhoneIn("+234 803 123 4567"), "08031234567");
  assert.equal(botPhoneIn("2348031234567"), "08031234567");
  assert.equal(botPhoneIn("8031234567"), "08031234567");
  assert.equal(botPhoneIn("my number"), null);
  assert.equal(botPhoneIn("0803123456"), null);
  assert.equal(botPhoneIn("0103123456"), null);
});

test("a counter nearly named is asked about, not shrugged at", () => {
  // "Chiken Republik" is not a counter by the strict reading and is
  // obviously one to a person. Sending somebody to WhatsApp over a
  // spelling is the chat failing at the one thing it is for.
  const shops = [
    { id: "d", name: "Domino's Pizza" },
    { id: "c", name: "Chicken Republic" },
    { id: "p", name: "Panarottis" },
  ];
  // Most near misses are not near misses at all: the strict reading is
  // already forgiving, so these are simply found and nothing is asked.
  assert.deepEqual(botNamedIn("chiken republik", shops).map((one) => one.id), ["c"]);
  assert.deepEqual(botNamedIn("panarotis", shops).map((one) => one.id), ["p"]);
  assert.deepEqual(botNearlyNamed("chiken republik", shops), []);

  // Further off than that is where the question lives.
  assert.deepEqual(botNearlyNamed("chicken repulic", shops).map((one) => one.id), ["c"]);
  // Named outright is not a question, so it is left out of the asking.
  assert.deepEqual(botNearlyNamed("domino", shops), []);
});

test("a block is typed, not hunted for in a list of sixteen", () => {
  // Sixteen of them in a box that scrolls with nothing to say it scrolls
  // is a list that looks like six, and somebody whose block is the
  // fourteenth taps WhatsApp instead.
  const blocks = [
    "Cooperative Kings",
    "Cooperative Queens",
    "Pod Living",
    "Faith Hostel",
    "Amethyst Hall",
    "Emerald",
    "Enterprise Development Centre",
    "Queen Mary",
    "Trinity Hall",
  ].map((name) => ({ id: name, name }));

  // Said properly, it goes straight in.
  assert.equal(botFind("queen mary", blocks).hits[0]?.name, "Queen Mary");
  // Said badly, it still goes in.
  assert.equal(botFind("quen mary", blocks).hits[0]?.name, "Queen Mary");
  assert.equal(botFind("amethyst", blocks).hits[0]?.name, "Amethyst Hall");
  // Two blocks share a word, so it asks rather than picking one.
  const both = botFind("cooperative", blocks);
  assert.equal(both.how, "asking");
  assert.ok(both.hits.length >= 2);
  // Nothing like any of them shows the list rather than guessing.
  assert.equal(botFind("my room", blocks).how, "lost");
});

test("naming a counter alongside the food narrows the search to it", () => {
  // "Domino's half and half bbq chicken" names a counter and a dish.
  // Searched across every menu it found a half chicken at one place and a
  // half and half at another and not the one actually asked for, so the
  // counter is used as what it is: a filter, and its own name comes out
  // of the sentence rather than being scored as a word about food.
  const shops = [
    { id: "d", name: "Domino's Pizza" },
    { id: "j", name: "Jay's Diner" },
  ];
  assert.equal(botWithout("Domino's half and half bbq chicken", shops), "half and half bbq chicken");
  // A typo in the name still counts as the name.
  assert.equal(botWithout("dominoes wings", shops), "wings");
  // Nothing but the counter is given back whole, because searching a menu
  // for an empty string finds everything and means nothing.
  assert.equal(botWithout("dominos", shops), "dominos");
  // A counter nobody named changes nothing.
  assert.equal(botWithout("chicken wings", shops), "chicken wings");
});

test("the real Domino's menu, asked for the way somebody actually types it", () => {
  // Against the shop's own list rather than a fixture, because a matcher
  // that passes on three invented dishes and fails on "Domino's half and
  // half bbq chicken and bbq beef" is a matcher that has not been tested.
  const shops = [{ id: "d", name: "Domino's Pizza" }];
  const menu = [
    "BBQ Chicken", "BBQ Meatball", "BBQ Mega Meat", "BBQ Sauce",
    "BBQ Sauce Calzone", "BBQ Suya Mix Grill", "Breadsticks",
    "Cheesy Bread", "Cheesy Grilled Chicken Bread", "Chicken Supreme",
    "Chicken Suya", "Chicken Wings - 4PCS", "Chicken Wings With BBQ - 7PCS",
    "Extravaganza", "Half & Half", "Margherita", "Naija Fiesta",
    "Pepperoni", "Roasted Chicken - 2PCS", "Shawarma",
    "Southern Style BBQ Chicken", "The Lot", "Veggie Supreme",
  ].map((name) => ({
    id: name,
    name,
    // As the shop really holds it: every dish carries the names of its own
    // choices, which is how a flavour that only exists as half of a half
    // and half is still something somebody can ask for by name.
    also:
      name === "Half & Half"
        ? ["BBQ Chicken", "BBQ Meatball", "BBQ Mega Meat", "Extravaganza",
           "Margherita", "Pepperoni", "Chicken Suya", "The Lot",
           "Veggie Supreme", "Naija Fiesta", "Shawarma", "Chicken Supreme"]
        : [],
  }));

  // The counter is a filter, and its name comes out of the sentence.
  const said = "Domino's half and half bbq chicken and bbq beef";
  assert.deepEqual(botNamedIn(said, shops).map((one) => one.id), ["d"]);
  const asked = botWithout(said, shops);

  const found = botFind(asked, menu);
  assert.equal(found.hits[0]?.name, "Half & Half", `asked: ${asked}`);

  // And the shorter way of saying the same thing.
  assert.equal(botFind("half and half", menu).hits[0]?.name, "Half & Half");
  assert.equal(botFind("half n half", menu).hits[0]?.name, "Half & Half");

  // The ones that are simply themselves.
  assert.equal(botFind("extravaganza", menu).hits[0]?.name, "Extravaganza");
  assert.equal(botFind("margarita", menu).hits[0]?.name, "Margherita");
  assert.equal(botFind("peperoni", menu).hits[0]?.name, "Pepperoni");
});

test("how many, and when a number is not how many", () => {
  // Two of something is two of something.
  assert.equal(botHowMany("2 bbq chicken from dominos"), 2);
  assert.equal(botHowMany("two bbq chicken"), 2);
  // A size is not a quantity. Read as one, "chicken wings 7pcs" is seven
  // portions and forty-nine wings, and somebody gets a bill for it.
  assert.equal(botHowMany("chicken wings 7pcs"), 1);
  assert.equal(botHowMany("coke 50cl"), 1);
  assert.equal(botHowMany("2 chicken wings 7 pcs"), 2);
  // And a number inside the dish's own name is the dish.
  assert.equal(botCountedInName("Chicken Wings - 4PCS", 4), true);
  assert.equal(botCountedInName("BBQ Chicken", 2), false);
  assert.equal(botCountedInName("Chicken Wings - 4PCS", 1), false);
});

test("a WhatsApp link carries the number the way wa.me reads it", () => {
  // The shop keeps its number the way it is dialled. wa.me reads a leading
  // zero as a username, so every way out of the chat opened WhatsApp
  // saying "@09032175147 isn't on WhatsApp", which is the one door that
  // has to work.
  assert.equal(
    botWhatsappTo("0903 217 5147", "hi"),
    "https://wa.me/2349032175147?text=hi"
  );
  // Already international, left alone.
  assert.equal(
    botWhatsappTo("+234 903 217 5147", "hi"),
    "https://wa.me/2349032175147?text=hi"
  );
});

test("a kind of thing is a question, not a dish", () => {
  // "2 medium pizza from Domino's" is not a dish on any menu. Matched as
  // one it found a Pizza Sauce Calzone and a plate of rice, because those
  // are the only names with the word in them. The shop files its menu by
  // kind, so the honest answer is the question: which pizza?
  const shelves = [
    { id: "pizzas", name: "Pizzas" },
    { id: "bread", name: "Bread" },
    { id: "rice", name: "Chicken & Rice" },
    { id: "drinks", name: "Drinks" },
  ];
  assert.equal(botFind("medium pizza", shelves, 1).hits[0]?.id, "pizzas");
  assert.equal(botFind("a drink", shelves, 1).hits[0]?.id, "drinks");
  // Said in the singular, in the plural, and badly.
  assert.equal(botFind("pizzas", shelves, 1).hits[0]?.id, "pizzas");
  assert.equal(botFind("piza", shelves, 1).hits[0]?.id, "pizzas");
  // A dish is not a shelf: nothing here is close enough to offer.
  assert.equal(botFind("pepperoni", shelves, 1).how, "lost");
});

test("a shelf named exactly what was asked for leads the answer", () => {
  // Uncle Stan's whole business is small chops: a shelf called exactly
  // that, fifteen things on it. Burger King has four dishes with the words
  // in their names, filed under Sides. Both are real answers and both are
  // offered, but the counter that files a whole shelf under the words goes
  // first, because that is the strongest thing anybody in the shop has
  // said on the subject.
  const shelves = [
    { id: "stan-chops", name: "Small Chops" },
    { id: "bk-sides", name: "Sides" },
    { id: "bk-burgers", name: "Burgers" },
  ];
  const found = botFind("small chops", shelves, 1);
  assert.equal(found.hits[0]?.id, "stan-chops");
  // Said exactly, it is as certain as anything gets.
  assert.ok((found.hits[0]?.score ?? 0) >= 0.97, `scored ${found.hits[0]?.score}`);

  // A shelf merely close to the words is not the same claim.
  const loose = botFind("chops", shelves, 1);
  assert.ok((loose.hits[0]?.score ?? 0) < 0.97, `scored ${loose.hits[0]?.score}`);
});

test("the chat reads a change to an order it has already taken", () => {
  /*
   * The most common sentence after a bill, and until the matcher could
   * read it the only answer was to start the order again.
   *
   * Both halves are optional and both get found: the thing that is off and
   * the thing that takes its place, with the counter kept on whichever
   * half carried it, because "from KFC" is the half that says which of
   * five chickens was meant.
   */
  const both = botAsksToSwap(
    "I don't want chicken from KFC anymore, I want to change it to Chicken Republic"
  );
  assert.ok(both);
  assert.equal(both?.drop, "chicken from kfc");
  assert.equal(both?.want, "chicken republic");

  const plain = botAsksToSwap("change the jollof rice to fried rice");
  assert.equal(plain?.drop, "jollof rice");
  assert.equal(plain?.want, "fried rice");

  const other = botAsksToSwap("instead of the jollof give me fried rice");
  assert.equal(other?.drop, "jollof");
  assert.equal(other?.want, "fried rice");

  // Taking something off is a change with nothing on the other side of it.
  const off = botAsksToSwap("remove the moi moi please");
  assert.equal(off?.drop, "moi moi");
  assert.equal(off?.want, "");

  // And "change it to X" is the other way round: the chat already knows
  // which line is being talked about.
  const it = botAsksToSwap("change it to Chicken Republic");
  assert.equal(it?.drop, "");
  assert.equal(it?.want, "chicken republic");

  // An ordinary order is not a change, however much it mentions food.
  assert.equal(botAsksToSwap("2 medium pizza and a coke"), null);
});

test("a line of an order is found by its dish or by its counter", () => {
  const lines = [
    { name: "Zinger Burger Meal", shop: "KFC" },
    { name: "Jollof Rice and Chicken", shop: "Jay's Diner" },
  ];

  assert.equal(botLineLike("zinger", lines), 0);
  assert.equal(botLineLike("the kfc one", lines), 0);
  assert.equal(botLineLike("jollof", lines), 1);
  // Nothing in the basket is that, which has to come back as nothing
  // rather than as whichever line scored least badly.
  assert.equal(botLineLike("ice cream", lines), -1);
});

test("an order pasted in as a list is split into the things on it", () => {
  /*
   * The order was agreed in a group chat or written in a notepad before
   * anybody opened the website, and it arrives whole. Read as one sentence
   * it matches nothing; read as a list it is three searches.
   */
  assert.deepEqual(botSplitOrder("5 jollof rice, 2 zinger burger, 1 coke"), [
    "5 jollof rice",
    "2 zinger burger",
    "1 coke",
  ]);

  assert.deepEqual(
    botSplitOrder("2 medium pizza\n1 chicken wings\nand a bottle of water"),
    ["2 medium pizza", "1 chicken wings", "a bottle of water"]
  );

  // Both sides counted, so "and" is a list.
  assert.deepEqual(botSplitOrder("2 pizza and 1 coke"), ["2 pizza", "1 coke"]);

  /*
   * And the ones that must never be split, because they are the names of
   * single dishes. Splitting "half and half" would take the pizza rule
   * apart, which is the most expensive thing on the menu to get wrong.
   */
  assert.deepEqual(botSplitOrder("fish and chips"), []);
  assert.deepEqual(botSplitOrder("jollof rice and chicken"), []);
  assert.deepEqual(botSplitOrder("domino's half and half bbq chicken"), []);
  assert.deepEqual(botSplitOrder("2 jollof rice and chicken"), []);
  assert.deepEqual(botSplitOrder("just a zinger burger"), []);
});

test("an answer about ordering is not searched for as a dish", () => {
  /*
   * Asked what they fancy, plenty of people say "I want to order",
   * because every other chat box on the internet opens by asking which
   * department they want. Searched for, it matches nothing, and the chat
   * says it cannot find it anywhere on the shop, which reads as broken.
   */
  assert.equal(botIntentOf("I want to order"), "vague-order");
  assert.equal(botIntentOf("order"), "vague-order");
  assert.equal(botIntentOf("I am hungry"), "vague-order");
  assert.equal(botIntentOf("I want food please"), "vague-order");

  // Somebody who has not come to order at all.
  assert.equal(botIntentOf("I have an enquiry"), "question");
  assert.equal(botIntentOf("i want to make a complaint"), "question");

  // And anything with a real word in it is left for the search.
  assert.equal(botIntentOf("I want to order from Domino's"), "");
  assert.equal(botIntentOf("2 medium pizza"), "");
  assert.equal(botIntentOf("jollof rice"), "");
});

test("a name is read out of however somebody says it", () => {
  /*
   * "My name is Chinaza" was being stored as "My", because the first word
   * of the answer is the name right up until somebody is polite about it.
   */
  assert.equal(botNameIn("my name is Chinaza"), "Chinaza");
  assert.equal(botNameIn("I'm Tomiwa"), "Tomiwa");
  assert.equal(botNameIn("it's Grace"), "Grace");
  assert.equal(botNameIn("Call me Uche"), "Uche");
  assert.equal(botNameIn("Ada"), "Ada");
});

test("words that cannot be a name are caught, and names are not", () => {
  /*
   * The point of the list behind this is what is not on it. Plenty of
   * Nigerian names are ordinary English words, and a list built by feel
   * refuses them, which is worse than greeting a pizza.
   */
  assert.equal(botWhyNotAName("order"), "errand");
  assert.equal(botWhyNotAName("inquiry"), "errand");
  assert.equal(botWhyNotAName("hello"), "errand");
  assert.equal(botWhyNotAName("customer"), "errand");
  assert.equal(botWhyNotAName("pizza"), "food");
  assert.equal(botWhyNotAName("I would like to order two pizzas please"), "sentence");

  for (const real of [
    "Grace", "Faith", "Hope", "Peace", "Joy", "Blessing", "Favour",
    "Precious", "Charity", "Patience", "Mercy", "Comfort", "Gift",
    "Promise", "Success", "Miracle", "Destiny", "Wisdom", "Goodluck",
    "Sunday", "Emmanuel", "Prince", "Chinaza", "Oluwaseun", "Zainab",
  ]) {
    assert.equal(botWhyNotAName(real), "", `${real} is somebody's name`);
  }
});

test("a question reaches the answer however it was worded", () => {
  /*
   * The chat has no model in it, so what it knows is a list somebody
   * edits. The thing that makes the list worth having is that nobody asks
   * a question twice the same way: the keywords ride along with the
   * question so one entry answers every wording of it.
   */
  const written = [
    {
      id: "fee",
      question: "How much is delivery?",
      answer: "It starts at ₦4,000.",
      keywords: "delivery fee, how much is delivery, shipping, fees, cost of delivery",
    },
    {
      id: "pay",
      question: "How do I pay?",
      answer: "Bank transfer.",
      keywords: "payment, transfer, card, pay",
    },
  ];

  assert.equal(botPickFaq("how much is delivery", written).sure?.id, "fee");
  assert.equal(botPickFaq("delivery fee", written).sure?.id, "fee");
  assert.equal(botPickFaq("what are your fees", written).sure?.id, "fee");
  assert.equal(botPickFaq("how do i pay", written).sure?.id, "pay");

  // Nothing like either of them answers with neither, rather than with
  // whichever scored least badly. A wrong answer in the shop's own voice
  // is worse than no answer at all.
  const miss = botPickFaq("do you sell shawarma", written);
  assert.equal(miss.sure, null);
  assert.equal(miss.maybe.length, 0);

  // And an empty list is not an error.
  assert.equal(botPickFaq("anything", []).sure, null);
});

test("a lone word that merely resembles a dish is asked about, not added", () => {
  /*
   * "Can I change my order" put a packet of hangers in somebody's basket.
   * Every word of it but one is noise, so the search ran on "change"
   * alone, and "change" and "hangers" share four letter pairs out of six,
   * which scores 0.73 on the bigrams and sailed past the floor for
   * certainty. The chat said "Found it: Hangers, 6" and added it.
   */
  const shelf = [
    { id: "1", name: "Hangers, 6" },
    { id: "2", name: "Zinger Burger" },
    { id: "3", name: "Chicken Wings" },
  ];

  const wrong = botFind("Can I change my order", shelf);
  assert.notEqual(wrong.how, "sure", "a near-miss on one word is never certain");

  // What the guard must not break: a single word that really is the dish,
  // the start of it, or a word inside it, with a typo still allowed.
  assert.equal(botFind("zinger", shelf).how, "sure");
  assert.equal(botFind("hangers", shelf).how, "sure");
  assert.equal(botFind("chicken", shelf).how, "sure");
  // And more than one word carries its own evidence, so nothing changes.
  assert.equal(botFind("chiken wings", shelf).how, "sure");
});

test("a question is recognised before a menu is searched for it", () => {
  /*
   * A menu is all the search has, so a menu is what it finds. Anything
   * shaped like a question gets the shop's own answers tried first.
   */
  for (const asked of [
    "Can I change my order",
    "do you deliver on sundays",
    "How much is delivery?",
    "what time does it close",
    "is there a minimum order",
    "where are you based",
  ]) {
    assert.equal(botLooksLikeAQuestion(asked), true, asked);
  }

  // And an order is not a question, however politely it is put.
  for (const asked of ["2 medium pizza", "jollof rice and chicken", "zinger burger"]) {
    assert.equal(botLooksLikeAQuestion(asked), false, asked);
  }
});

test("the profit card's three figures subtract to the profit", () => {
  /*
   * The card showed money in, the delivery margin and the costs, which
   * invites the obvious subtraction: 107,000 less 49,450 is 57,550. It
   * reported 98,108, and both were right. Two things were missing from
   * the middle figure: the counter reconciliation, which is a saving as
   * often as it is an overspend, and the errands that have no run behind
   * them.
   *
   * The arithmetic is written out here rather than imported, because the
   * thing being protected is that the figures on a card reconcile, and a
   * test that calls the same function cannot catch them drifting apart.
   */
  const made = (one: {
    margin: number;
    overMenu: number;
    otherIn: number;
    otherOut: number;
    commission: number;
    runCosts: number;
  }) => {
    const earned = one.margin - one.overMenu + one.otherIn;
    const costs = one.runCosts + one.commission + one.otherOut;
    return { earned, costs, profit: earned - costs };
  };

  // The window that found this: August to October 2026.
  const real = made({
    margin: 107000,
    overMenu: -20558,
    otherIn: 20000,
    otherOut: 4950,
    commission: 6500,
    runCosts: 38000,
  });
  assert.equal(real.costs, 49450, "costs is what the card already showed");
  assert.equal(real.profit, 98108, "and the profit is the figure it reported");
  assert.equal(real.earned - real.costs, real.profit, "the card subtracts");

  // A counter that charged over the menu takes the earnings down, not up.
  const over = made({
    margin: 100000, overMenu: 15000, otherIn: 0, otherOut: 0,
    commission: 0, runCosts: 20000,
  });
  assert.equal(over.earned, 85000);
  assert.equal(over.profit, 65000);

  // And a window with nothing in it says nothing rather than something.
  const none = made({
    margin: 0, overMenu: 0, otherIn: 0, otherOut: 0, commission: 0, runCosts: 0,
  });
  assert.equal(none.profit, 0);

  /*
   * And the share is of what the shop earned, not of money in.
   *
   * Money in is mostly the customer's food money on its way to a kitchen:
   * ₦316,781 of that ₦444,339 was never Sudu's. Measured against it the
   * profit read as 22%, which sounds like a thin margin on a big business
   * and is neither. Against what the shop actually earns it is two thirds
   * kept, and that figure moves when a driver costs more or a run goes out
   * half empty, which are the things anybody can do something about.
   */
  const gross = 444339, foodAtMenu = 337339;
  const passedOn = foodAtMenu - Math.max(0, 20558);
  assert.equal(passedOn, 316781, "what went to the kitchens");
  assert.equal(Math.round((real.profit / real.earned) * 100), 66);
  assert.equal(Math.round((real.profit / gross) * 100), 22, "the old, flattering one");
  // Money in is the food that passed through plus the shop's own cut of an
  // order. The errand is not in it, which is why it is not the denominator.
  assert.equal(passedOn + (real.earned - 20000), gross);
});

test("an order for somebody else names the right person throughout", () => {
  /*
   * The chat had no way to hear "this is not for me". It asked a
   * gift-buyer which block they were in, and would have sent a rider to
   * ring the person being surprised, which is the whole gift spent.
   */
  assert.equal(botIsGift("me"), false);
  for (const key of ["birthday", "gift", "parent"]) {
    assert.equal(botIsGift(key), true, key);
  }

  // Whose block, whose name, in a sentence.
  assert.equal(botThem("me", ""), "you");
  assert.equal(botThem("birthday", "Ada"), "Ada");
  assert.equal(botTheirs("birthday", "Ada"), "Ada's");
  // And a gift nobody has named yet is still not the buyer.
  assert.equal(botThem("gift", ""), "them");
  assert.equal(botTheirs("gift", ""), "their");
  assert.equal(botTheirs("me", ""), "your");

  // Four occasions, one of them not a gift, and an unknown key is the
  // ordinary one rather than an error.
  assert.equal(botOccasions.length, 4);
  assert.equal(botOccasions.filter((one) => one.gift).length, 3);
  assert.equal(botOccasionBy("nonsense").key, "me");
  // Every chip has to say something and ask something, or the step after
  // it is a blank question.
  for (const one of botOccasions) {
    assert.ok(one.said.length > 0, one.key);
    assert.ok(one.greet.length > 0, one.key);
    assert.equal(one.asks === "", one.key === "me");
  }
});

test("a budget is read with delivery in it or out of it, and never guessed", () => {
  /*
   * "Fifteen k plus delivery" and "thirty thousand all in" look like the
   * same sentence and are not. Reading one as the other quotes somebody a
   * figure they never agreed to, which is the one mistake about money
   * this chat must not make.
   */
  assert.deepEqual(botReadBudget("15k plus delivery"), { amount: 15000, kind: "food" });
  assert.deepEqual(botReadBudget("₦30,000 all in"), { amount: 30000, kind: "all" });
  assert.deepEqual(botReadBudget("20000 including delivery"), { amount: 20000, kind: "all" });
  assert.deepEqual(botReadBudget("I have about 12k for the food"), {
    amount: 12000,
    kind: "food",
  });

  // Said without saying which, so the chat has to ask rather than pick.
  assert.deepEqual(botReadBudget("around 10k"), { amount: 10000, kind: "" });
  assert.deepEqual(botReadBudget("25,000"), { amount: 25000, kind: "" });

  // Every way anybody writes the same money.
  for (const said of ["15k", "15,000", "15000", "₦15k", "15 k"]) {
    assert.equal(botReadBudget(said)?.amount, 15000, said);
  }
  /*
   * A bare small number only counts where the chat asked for a budget.
   * Answering "what are you thinking of spending?" with "15" is fifteen
   * thousand and nothing else. The same digits loose in a sentence are
   * two medium pizzas, and reading those as a budget would be the chat
   * inventing a constraint nobody set.
   */
  assert.equal(botReadBudget("I have 15", true)?.amount, 15000);
  assert.equal(botReadBudget("15", true)?.amount, 15000);
  assert.equal(botReadBudget("2 medium pizza"), null);

  // Not a budget at all.
  assert.equal(botReadBudget("jollof rice"), null);
  assert.equal(botReadBudget(""), null);

  /*
   * What is left for food, and what the whole thing comes to. A budget
   * that includes delivery has it taken off before anything is suggested;
   * one that does not is already the food figure.
   */
  const allIn = { amount: 30000, kind: "all" as const };
  const foodOnly = { amount: 30000, kind: "food" as const };
  assert.equal(botToSpend(allIn, 4000), 26000);
  assert.equal(botToSpend(foodOnly, 4000), 30000);
  assert.equal(botAllIn(allIn, 4000), 30000);
  assert.equal(botAllIn(foodOnly, 4000), 34000);
  // A fee bigger than the budget leaves nothing, not a negative.
  assert.equal(botToSpend({ amount: 3000, kind: "all" }, 4000), 0);
});

test("\"I don't know\" leads somewhere rather than being searched for", () => {
  /*
   * The commonest thing anybody says to a person behind a counter, and
   * the one answer a menu search can do nothing with. Asking "what would
   * you like?" again is the chat repeating the question they have just
   * said they cannot answer.
   */
  for (const said of [
    "I don't know",
    "dont know",
    "dunno",
    "no idea",
    "not sure",
    "I can't decide",
    "you choose",
    "surprise me",
    "anything",
    "whatever",
    "up to you",
    "pick for me",
    "choose for me",
    "pick",
    "surprise",
    "surprise me",
    "random",
    "suggest something",
    "what do you recommend",
  ]) {
    assert.equal(botIntentOf(said), "unsure", said);
  }

  // And something they do know is still an order.
  for (const said of ["2 medium pizza", "jollof rice", "zinger burger"]) {
    assert.equal(botIntentOf(said), "", said);
  }

  /*
   * The two the shop really sells, which is why "pick" and "surprise"
   * only count as a whole sentence. A rule that caught them anywhere
   * would put both of these out of reach.
   */
  for (const said of ["surprise serum", "choose your own shake", "tiam surprise serum"]) {
    assert.equal(botIntentOf(said), "", said);
  }
});

test("changing how many is not changing what", () => {
  /*
   * "Change the BBQ chicken to 1" reads exactly like a swap: the thing
   * wanted instead is "1". Taken that way it would have taken the pizza
   * off the order and gone looking through the menu for a dish called
   * one. A number on its own is never a dish.
   */
  const dangerous = botAsksToSwap("change the bbq chicken to 1");
  assert.equal(dangerous?.want, "1", "the swap matcher really does read it that way");
  // Which is why the count is looked for first, and finds it.
  assert.deepEqual(botAsksForQty("change the bbq chicken to 1"), {
    which: "bbq chicken",
    qty: 1,
  });

  // Every way anybody says it.
  assert.deepEqual(botAsksForQty("make the bbq chicken one"), { which: "bbq chicken", qty: 1 });
  assert.deepEqual(botAsksForQty("set the pizza to 3"), { which: "pizza", qty: 3 });
  assert.deepEqual(botAsksForQty("I only want one bbq chicken"), {
    which: "bbq chicken",
    qty: 1,
  });
  assert.deepEqual(botAsksForQty("just 2 of the kfc chicken"), {
    which: "kfc chicken",
    qty: 2,
  });
  assert.deepEqual(botAsksForQty("1 bbq chicken instead of 2"), {
    which: "bbq chicken",
    qty: 1,
  });
  // "Make it two" names no line, so the chat has to ask which.
  assert.deepEqual(botAsksForQty("make it 2"), { which: "", qty: 2 });

  /*
   * And the things that are not counts. A swap to a real dish, a removal,
   * and an ordinary order typed at the ordering question, which must stay
   * two pizzas rather than becoming a count of something.
   */
  assert.equal(botAsksForQty("change the bbq chicken to chicken republic"), null);
  assert.equal(botAsksForQty("remove the kfc chicken"), null);
  assert.equal(botAsksForQty("2 medium pizza"), null);
});

test("a name kept all in one case is said normally, and nothing else is touched", () => {
  // The whole of it shouting, which no kitchen chose on purpose.
  assert.equal(tidyName("ALFREDO"), "Alfredo");
  assert.equal(tidyName("STIR FRY"), "Stir Fry");
  assert.equal(tidyName("JAY'S FIESTA"), "Jay's Fiesta");
  // Small words stay down in the middle and stand up at the front.
  assert.equal(tidyName("V FOR VELVET"), "V for Velvet");
  assert.equal(tidyName("THE PIE WHO LOVED ME"), "The Pie Who Loved Me");
  // A symbol before the first letter is not the first letter.
  assert.equal(tidyName("OREO\u00ae OVERLOAD"), "Oreo\u00ae Overload");
  // All lower case was not a decision either.
  assert.equal(tidyName("classic asun pasta"), "Classic Asun Pasta");
  // Anything with both cases in it was typed by somebody who meant it.
  assert.equal(tidyName("iPhone"), "iPhone");
  assert.equal(tidyName("BBQ Chicken"), "BBQ Chicken");
  // Short and shouting is a word, not a shout: nothing to go on, so nothing
  // is done. Anything with a digit keeps its shape.
  assert.equal(tidyName("BBQ"), "BBQ");
  assert.equal(tidyName("2PCS"), "2PCS");
  assert.equal(tidyName("NUTTY SPREAD 510G"), "Nutty Spread 510G");
  // A hyphen joins two words and both of them are words. "Rx-advanced" is
  // neither how it was written nor how anybody would write it.
  assert.equal(tidyName("RX-ADVANCED SNAIL KIT"), "Rx-Advanced Snail Kit");
  // An apostrophe is not a hyphen: "Doughn'T" is the other way to be wrong.
  assert.equal(tidyName("DOUGHN'T"), "Doughn't");
});

test("a kitchen's own section is guessed into one of the shop's aisles", () => {
  assert.equal(guessAisle("Pizzas"), "Pizza");
  assert.equal(guessAisle("Square pizzas"), "Pizza");
  assert.equal(guessAisle("Burgers & sandwiches"), "Burgers & wraps");
  assert.equal(guessAisle("Burgers"), "Burgers & wraps");
  // The narrow rule beats the broad one: an add-on is not a side.
  assert.equal(guessAisle("Dips & sides"), "Extras & add-ons");
  assert.equal(guessAisle("Tasty sides"), "Sides & snacks");
  // A bowl is a bowl and a wrap is a wrap, whatever is in it.
  assert.equal(guessAisle("Burrito Bowls"), "Rice, pasta & bowls");
  assert.equal(guessAisle("Burrito Wraps"), "Burgers & wraps");
  // Nothing rather than a wrong guess.
  assert.equal(guessAisle("You should try"), "");
  assert.equal(guessAisle(""), "");
});

test("the aisles are a setting, and an empty one falls back to the shop's own", () => {
  assert.deepEqual(aislesFrom(""), AISLES);
  assert.deepEqual(aislesFrom("  \n \n"), AISLES);
  assert.deepEqual(aislesFrom("Pizza\nChicken\n"), ["Pizza", "Chicken"]);
});

const aPlan = (over: Partial<Plan> = {}): Plan => ({
  id: "p",
  customerName: "A parent",
  customerPhone: "08000000000",
  forName: "Their child",
  forPhone: "08011111111",
  hostel: "Amethyst",
  kind: "box",
  boxId: "box",
  fromOrderId: null,
  every: "monthly",
  onDay: 3,
  active: true,
  auto: true,
  pausedUntil: null,
  startedOn: "2026-10-01",
  madeThrough: null,
  note: "",
  cameFrom: "",
  createdAt: "",
  ...over,
});

test("a monthly plan lands on the same day every month", () => {
  const plan = aPlan();
  assert.equal(nextLanding(plan, "2026-10-17"), "2026-11-03");
  assert.equal(nextLanding(plan, "2026-11-03"), "2026-12-03");
  // December rolls into January rather than into month thirteen.
  assert.equal(nextLanding(plan, "2026-12-03"), "2027-01-03");
  // A day past the 28th is capped rather than clamped per month: the 31st
  // landing on the 31st, then the 28th, then the 30th is not a fixed day,
  // which is the whole thing being sold.
  assert.equal(nextLanding(aPlan({ onDay: 31 }), "2026-01-05"), "2026-01-28");
});

test("a plan owes only what is close enough to raise, and never the past", () => {
  const plan = aPlan();
  // Five days of lead. On the 30th the third of next month is owed.
  assert.deepEqual(owed(plan, "2026-10-30", 5, "").raise, ["2026-11-03"]);
  // On the 17th nothing is: the next landing is a fortnight off.
  assert.deepEqual(owed(plan, "2026-10-17", 5, "").raise, []);
  // A plan switched on today does not back-fill the months before it. They
  // are stepped over, so they are never asked about again.
  assert.deepEqual(owed(plan, "2026-10-17", 5, "").skip, ["2026-10-03"]);
  // A plan nobody has switched on owes nothing at all.
  assert.deepEqual(owed(aPlan({ active: false }), "2026-10-30", 5, "").raise, []);
});

test("a holiday skips the months inside it rather than storing them up", () => {
  const plan = aPlan({ madeThrough: "2026-11-03" });
  // Campus is empty until the new year. December does not happen, and it
  // does not come back in January as though it were still due.
  const over = owed(plan, "2026-12-30", 5, "2027-01-06");
  assert.deepEqual(over.raise, []);
  assert.deepEqual(over.skip, ["2026-12-03", "2027-01-03"]);
  // One parent's own pause does the same for that one parent.
  const mine = owed(aPlan({ madeThrough: "2026-11-03", pausedUntil: "2026-12-20" }), "2026-12-01", 5, "");
  assert.deepEqual(mine.raise, []);
  assert.deepEqual(mine.skip, ["2026-12-03"]);
});

/*
 * The route ticket names the far end of the trip, not the near end.
 *
 * One area called "Lekki/Ikoyi" never raised the question. Split into Ajah,
 * Lekki and Ikoyi, the Saturday car covers all three, and a ticket with room
 * for two names took them in the order they are set: "Sangotedo/Ajah", the
 * nearest thing on a route that ends an hour past it.
 */
test("the route ticket names the furthest area a run reaches", () => {
  const areas = [
    { id: "ajah", name: "Ajah", runExtra: 1000, sameDayExtra: 1000, sameDay: true },
    { id: "l", name: "Lekki", runExtra: 2500, sameDayExtra: 0, sameDay: false },
    { id: "ikoyi", name: "Ikoyi", runExtra: 3500, sameDayExtra: 0, sameDay: false },
  ];

  assert.equal(collectedFrom("|l|ikoyi|ajah|", areas), "Sangotedo/Ikoyi");
  // Set in any order, the answer is the same: it is read off the fare.
  assert.equal(collectedFrom("|ajah|l|", areas), "Sangotedo/Lekki");
  // One area, named as it is.
  assert.equal(collectedFrom("|ajah|", areas), "Sangotedo/Ajah");
  // A run that goes nowhere else is the home run.
  assert.equal(collectedFrom("", areas), "Sangotedo");
  // An id no area answers to any more does not become an empty name.
  assert.equal(collectedFrom("|gone|", areas), "Sangotedo");
  // An area's own name holding two towns still gives the ticket one word.
  assert.equal(
    collectedFrom("|l|", [{ id: "l", name: "Lekki/Ikoyi", runExtra: 5000, sameDayExtra: 0, sameDay: false }]),
    "Sangotedo/Lekki"
  );
});

/*
 * Where the shop buys, said on the front page, with home in it.
 *
 * The line was filled from the areas list, which is the list of places that
 * are not home. With one area named "Lekki/Ikoyi" that read as a list and
 * nobody noticed Sangotedo missing from it. Split into three it read "from
 * Ajah, Lekki and Ikoyi", leaving out the town fourteen of the seventeen
 * counters are on.
 */
test("the front page names everywhere the shop collects from", () => {
  const areas = [
    { id: "ajah", name: "Ajah", runExtra: 1000, sameDayExtra: 1000, sameDay: true },
    { id: "l", name: "Lekki", runExtra: 2500, sameDayExtra: 0, sameDay: false },
    { id: "ikoyi", name: "Ikoyi", runExtra: 3500, sameDayExtra: 0, sameDay: false },
  ];

  assert.equal(everywhere(areas), "Sangotedo, Ajah, Lekki and Ikoyi");
  assert.equal(everywhere([areas[0]]), "Sangotedo and Ajah");
  // No areas set is the shop as it was before areas existed.
  assert.equal(everywhere([]), "Sangotedo");
  // A home row in the list is not home said twice.
  assert.equal(
    everywhere([{ id: "", name: "Sangotedo", runExtra: 0, sameDayExtra: 0, sameDay: true }, areas[1]]),
    "Sangotedo and Lekki"
  );
});

/*
 * Two areas in one cart is two stops, and what the stop costs depends on
 * which two.
 *
 * The rule was "the furthest thing in the cart pays for the trip", which is
 * right for a cart that is one detour. A cart holding Lekki and Ajah is
 * two, and the second shop is one more place to find, park at, queue in and
 * carry out of.
 *
 * A flat figure for that was wrong in both directions. Lekki and Ikoyi are
 * minutes apart and a car already on the island adds one to the other
 * cheaply; Sangotedo and Ajah are the same the other way; crossing between
 * the two halves is the dear hop. So it is a table the shop fills in, and
 * Sangotedo is in it like anywhere else: a run passes it on the way back,
 * which is why it adds nothing to the distance, but somebody still has to
 * stop the car and go into the shop.
 */
const HOPS = [
  { a: "", b: "ajah", extra: 500 },
  { a: "", b: "l", extra: 1000 },
  { a: "", b: "ikoyi", extra: 1000 },
  { a: "ajah", b: "l", extra: 1000 },
  { a: "ajah", b: "ikoyi", extra: 1000 },
  { a: "ikoyi", b: "l", extra: 500 },
];
const SANGOTEDO = { id: "", name: "Sangotedo", runExtra: 0, sameDayExtra: 0, sameDay: true };
const AJAH = { id: "ajah", name: "Ajah", runExtra: 1000, sameDayExtra: 1000, sameDay: true };
const LEKKI = { id: "l", name: "Lekki", runExtra: 2500, sameDayExtra: 0, sameDay: false };
const IKOYI = { id: "ikoyi", name: "Ikoyi", runExtra: 3500, sameDayExtra: 0, sameDay: false };

test("a second stop is priced by which two places it is between", () => {
  // The six the shop was asked for, read straight off the table and not
  // depending on which of the pair is named first.
  assert.equal(mixedExtra([LEKKI, SANGOTEDO], HOPS), 1000);
  assert.equal(mixedExtra([SANGOTEDO, LEKKI], HOPS), 1000);
  assert.equal(mixedExtra([LEKKI, IKOYI], HOPS), 500);
  assert.equal(mixedExtra([LEKKI, AJAH], HOPS), 1000);
  assert.equal(mixedExtra([SANGOTEDO, AJAH], HOPS), 500);
  assert.equal(mixedExtra([IKOYI, SANGOTEDO], HOPS), 1000);
  assert.equal(mixedExtra([IKOYI, AJAH], HOPS), 1000);

  // One place, however many shops in it, is one stop.
  assert.equal(mixedExtra([LEKKI], HOPS), 0);
  assert.equal(mixedExtra([LEKKI, LEKKI], HOPS), 0);
  assert.equal(mixedExtra([SANGOTEDO], HOPS), 0);
  assert.equal(mixedExtra([], HOPS), 0);
});

/*
 * Three places is the route, not every pair added up.
 *
 * Lekki, Ajah and Ikoyi added pairwise would be 2,500 for a car that drives
 * Ajah to Lekki to Ikoyi and never once does the Ajah-to-Ikoyi leg it would
 * be charging for.
 */
test("three areas pay the cheapest way of joining them up", () => {
  // Ajah to Lekki (1,000) and Lekki to Ikoyi (500). Not the 1,000 it would
  // cost to go from Ajah to Ikoyi, because nobody drives that.
  assert.equal(mixedExtra([LEKKI, AJAH, IKOYI], HOPS), 1500);
  // Named in any order, the same route.
  assert.equal(mixedExtra([IKOYI, LEKKI, AJAH], HOPS), 1500);
  // All four: Sangotedo to Ajah (500), Ajah to Lekki (1,000), Lekki to
  // Ikoyi (500).
  assert.equal(mixedExtra([SANGOTEDO, AJAH, LEKKI, IKOYI], HOPS), 2000);
  // Sangotedo, Lekki and Ikoyi, with no Ajah in between: 1,000 then 500.
  assert.equal(mixedExtra([SANGOTEDO, LEKKI, IKOYI], HOPS), 1500);
});

/*
 * A pair nobody has priced, which is what every pair is the minute after a
 * new area is added. A figure rather than nought, because a stop that is
 * free by accident is a stop the shop makes for nothing.
 */
test("an unpriced pair falls back rather than costing nothing", () => {
  assert.equal(mixedExtra([LEKKI, AJAH], []), MIXED_AREA_EXTRA);
  assert.equal(mixedExtra([LEKKI, AJAH], [], 2500), 2500);
  // A shop that wants stops free can say so.
  assert.equal(mixedExtra([LEKKI, AJAH], [], 0), 0);
  // Priced at nought on purpose is nought, not the fallback.
  assert.equal(mixedExtra([LEKKI, AJAH], [{ a: "l", b: "ajah", extra: 0 }]), 0);
  // A pair priced the other way round is the same pair.
  assert.equal(mixedExtra([LEKKI, AJAH], [{ a: "ajah", b: "l", extra: 300 }]), 300);
});

test("what a Lekki and Ajah cart is actually charged", () => {
  const bands: Band[] = [{ maxItems: 3, fee: 4000 }, { maxItems: 99, fee: 6000 }];
  // Lekki sets the distance at 2,500; the stop in Ajah adds 1,000; both go
  // on every rung, because the petrol is the same whether the car carries
  // two bags or twelve.
  assert.deepEqual(
    withExtra(bands, LEKKI.runExtra + mixedExtra([LEKKI, AJAH], HOPS)),
    [{ maxItems: 3, fee: 7500 }, { maxItems: 99, fee: 9500 }]
  );
});

/*
 * The table survives a trip through settings and back.
 */
test("the stop table is written and read back the same", () => {
  const back = parseAreaPairs(serialiseAreaPairs(HOPS));
  assert.equal(back.length, 6);
  assert.equal(mixedExtra([LEKKI, IKOYI], back), 500);
  assert.equal(mixedExtra([LEKKI, AJAH, IKOYI], back), 1500);

  // Nonsense in, nothing out, rather than a price nobody meant.
  assert.deepEqual(parseAreaPairs(""), []);
  assert.deepEqual(parseAreaPairs("not json"), []);
  assert.deepEqual(parseAreaPairs('[{"a":"l","b":"l","extra":500}]'), []);
  // A negative stop would pay somebody to order across town.
  assert.deepEqual(parseAreaPairs('[{"a":"l","b":"ajah","extra":-500}]'), [
    { a: "l", b: "ajah", extra: 0 },
  ]);
  // The same pair twice keeps the first and drops the rest.
  assert.equal(
    parseAreaPairs(
      serialiseAreaPairs([
        { a: "l", b: "ajah", extra: 700 },
        { a: "ajah", b: "l", extra: 900 },
      ])
    ).length,
    1
  );
});

test("every pair of areas is offered once", () => {
  assert.deepEqual(everyPair(["", "ajah", "l"]), [
    ["", "ajah"],
    ["", "l"],
    ["ajah", "l"],
  ]);
  assert.deepEqual(everyPair(["l"]), []);
  assert.deepEqual(everyPair([]), []);
});

/*
 * One car, one trip, charged once.
 *
 * A cart holding a market and a kitchen is two errands and two ways of
 * measuring them: the market by what the shopping comes to, the kitchen by
 * how much room it takes. The trip out of Sangotedo is neither. It is the
 * car, and there is one car.
 *
 * It was being put on the kitchen's ladder and then added again to the
 * total, so a cart with a pepper and a pizza in it paid the distance twice
 * and a cart with only a pepper paid it once.
 */
test("a mixed cart pays for the trip once, not once per half", () => {
  const base: Band[] = [{ maxItems: 3, fee: 4000 }, { maxItems: 99, fee: 6000 }];
  const far = 2500 + 1000; // Lekki, plus a second stop in Ajah.
  const withTrip = withExtra(base, far);

  // The kitchen half off the plain ladder, the trip added once.
  const right = feeFor(2, null, base) + far;
  // What it did: the trip inside the ladder and again on the total.
  const wrong = feeFor(2, null, withTrip) + far;

  assert.equal(right, 7500);
  assert.equal(wrong, 11000);
  assert.equal(wrong - right, far);

  // A cart that is only a kitchen never took that path, so it was always
  // charged the trip once. The two agree now.
  assert.equal(feeFor(2, null, withTrip), right);
});

/*
 * The run sheet somebody can be handed without being handed the shop.
 *
 * Every rule here exists because the alternative does real damage on a
 * Saturday evening: a link that outlives its run, a stop that ticks itself
 * off because another counter's name contains it, or a customer locked out
 * of their own orders by a driver's typo.
 */
test("a runner link opens one live run and nothing else", () => {
  const live = { runner_token: "abc", settled_at: null };
  assert.equal(stillDriving(live), true);

  // Settled is the end of the night. The books are closed and the link is
  // a copy of a night's names sitting in somebody's messages.
  assert.equal(stillDriving({ ...live, settled_at: "2026-10-31T20:00:00Z" }), false);

  // Cleared beats everything, and has to work while the run is still live:
  // that is exactly when the shop needs to take it back.
  assert.equal(stillDriving({ runner_token: null, settled_at: null }), false);
  assert.equal(stillDriving({ runner_token: "   ", settled_at: null }), false);
  assert.equal(stillDriving(null), false);
});

test("a stop is ticked by its whole name, not by what contains it", () => {
  const got = withGot("", "KFC", true);
  assert.equal(got, "|KFC|");
  assert.equal(hasGot(got, "KFC"), true);

  // The bars are the whole point. Without them a stop called KFC ticks off
  // KFC Express while its food is still behind the counter.
  assert.equal(hasGot(got, "KFC Express"), false);

  // Case is how a name is typed, not which counter it is.
  assert.equal(hasGot(got, "kfc"), true);

  // Putting one back, because the usual mistake is ticking the stop you
  // are standing in front of rather than the one you just left.
  assert.equal(withGot(got, "KFC", false), "");
  assert.equal(hasGot(withGot(got, "KFC", false), "KFC"), false);

  // Ticking twice is still one stop.
  assert.equal(withGot(withGot("", "KFC", true), "KFC", true), "|KFC|");

  const two = withGot(got, "Dominos Pizza", true);
  assert.deepEqual(gotList(two), ["KFC", "Dominos Pizza"]);
});

test("the run's progress is what was collected, not what was priced", () => {
  const counters = [{ restaurant: "KFC" }, { restaurant: "Dominos Pizza" }];
  const bags = [
    { orders: [{ status: "delivered" }] },
    { orders: [{ status: "delivered" }, { status: "paid" }] },
  ];

  const half = runProgress(counters, "|KFC|", bags);
  assert.equal(half.stops, 1);
  assert.equal(half.ofStops, 2);
  assert.equal(half.shopping, true);

  // A bag is dropped when everything in it is. One order still paid means
  // the bag is still in the boot.
  assert.equal(half.dropped, 1);
  assert.equal(half.ofBags, 2);

  const shopped = runProgress(counters, "|KFC|Dominos Pizza|", bags);
  assert.equal(shopped.shopping, false);
});

test("the expected total is the driver's, not the counter's", () => {
  const group = {
    restaurant: "Dominos Pizza",
    lines: [
      { name: "Pepperoni", choices: ['Medium 12"', "Hand Tossed"], qty: 2, unitPrice: 11000, key: "a", paid: null, itemId: "x", recovered: 0, menuPrice: 11000, costPrice: 0 },
      { name: "Cheesy Bread", choices: [], qty: 1, unitPrice: 4500, key: "b", paid: null, itemId: "y", recovered: 0, menuPrice: 4500, costPrice: 0 },
    ],
    expectedFoodTotal: 26500,
  };

  // What the shop expects to pay never goes to the counter. It belongs on
  // the driver's sheet, where it answers the one question asked at a card
  // machine: is the amount on the screen the amount that was ordered.
  assert.equal(expectedAt(group), "\u20a626,500");

  const said = counterMessage(group, { shopName: "Sudu" });
  assert.equal(said.includes("26,500"), false);
  assert.match(said, /2 x Pepperoni Medium 12", Hand Tossed/);
});

test("a runner link opens one live run and nothing else", () => {
  const live = { runner_token: "abc", settled_at: null };
  assert.equal(stillDriving(live), true);

  // Settled is the end of the night. The books are closed and the link is
  // a copy of a night's names sitting in somebody's messages.
  assert.equal(stillDriving({ ...live, settled_at: "2026-10-31T20:00:00Z" }), false);

  // Cleared beats everything, and has to work while the run is still live:
  // that is exactly when the shop needs to take it back.
  assert.equal(stillDriving({ runner_token: null, settled_at: null }), false);
  assert.equal(stillDriving({ runner_token: "   ", settled_at: null }), false);
  assert.equal(stillDriving(null), false);
});

test("a stop is ticked by its whole name, not by what contains it", () => {
  const got = withGot("", "KFC", true);
  assert.equal(got, "|KFC|");
  assert.equal(hasGot(got, "KFC"), true);

  // The bars are the whole point. Without them a stop called KFC ticks off
  // KFC Express while its food is still behind the counter.
  assert.equal(hasGot(got, "KFC Express"), false);

  // Case is how a name is typed, not which counter it is.
  assert.equal(hasGot(got, "kfc"), true);

  // Putting one back, because the usual mistake is ticking the stop you
  // are standing in front of rather than the one you just left.
  assert.equal(withGot(got, "KFC", false), "");
  assert.equal(hasGot(withGot(got, "KFC", false), "KFC"), false);

  // Ticking twice is still one stop.
  assert.equal(withGot(withGot("", "KFC", true), "KFC", true), "|KFC|");

  const two = withGot(got, "Dominos Pizza", true);
  assert.deepEqual(gotList(two), ["KFC", "Dominos Pizza"]);
});

test("the run's progress is what was collected, not what was priced", () => {
  const counters = [{ restaurant: "KFC" }, { restaurant: "Dominos Pizza" }];
  const bags = [
    { orders: [{ status: "delivered" }] },
    { orders: [{ status: "delivered" }, { status: "paid" }] },
  ];

  const half = runProgress(counters, "|KFC|", bags);
  assert.equal(half.stops, 1);
  assert.equal(half.ofStops, 2);
  assert.equal(half.shopping, true);

  // A bag is dropped when everything in it is. One order still paid means
  // the bag is still in the boot.
  assert.equal(half.dropped, 1);
  assert.equal(half.ofBags, 2);

  const shopped = runProgress(counters, "|KFC|Dominos Pizza|", bags);
  assert.equal(shopped.shopping, false);
});

/*
 * Not every kitchen is on WhatsApp.
 *
 * Sending tonight's list into an inbox nobody reads is worse than not
 * sending it: the stop becomes a wait for food that was never started, by
 * somebody who believes it was.
 */
test("how a counter takes an order ahead is said, not guessed", () => {
  assert.equal(howToOrderAhead({ phone: "08011", orders_ahead: "whatsapp" }), "whatsapp");
  assert.equal(howToOrderAhead({ phone: "08011", orders_ahead: "call" }), "call");

  // Only ever ordered in person. Said out loud so nobody spends next week
  // wondering whether somebody forgot to fill the number in.
  assert.equal(howToOrderAhead({ phone: "08011", orders_ahead: "no" }), "none");

  // No number is no way to reach them, whatever anybody ticked.
  assert.equal(howToOrderAhead({ phone: "", orders_ahead: "whatsapp" }), "none");
  assert.equal(howToOrderAhead({ phone: "   ", orders_ahead: "call" }), "none");
  assert.equal(howToOrderAhead(undefined), "none");

  // Nobody has said yet. Offering both is honest about not knowing;
  // offering neither throws away a number that is probably good.
  assert.equal(howToOrderAhead({ phone: "08011", orders_ahead: "" }), "both");
  assert.equal(howToOrderAhead({ phone: "08011" }), "both");
});

/*
 * A quiet Tuesday tidies itself up.
 *
 * A scheduled run opens itself every week whether or not anybody wants it,
 * and the ones nobody ordered on used to sit in the board for ever, counted
 * among the jobs still open because nothing had ever said otherwise.
 */
test("a run that closed with nothing on it settles itself", () => {
  const closed = "2026-10-21T15:00:00Z";
  const after = new Date("2026-10-21T16:00:00Z").getTime();
  const before = new Date("2026-10-21T14:00:00Z").getTime();
  const run = { kind: "run" as const, settled_at: null, cut_off_at: closed };

  assert.equal(emptyAndDone(run, 0, after), true);

  // Still open for orders. Settling here closes the books on a run that is
  // about to take money.
  assert.equal(emptyAndDone(run, 0, before), false);

  // One order, even unpaid, is somebody who may still pay.
  assert.equal(emptyAndDone(run, 1, after), false);

  // Already settled, so there is nothing to do and nothing to overwrite.
  assert.equal(
    emptyAndDone({ ...run, settled_at: "2026-10-21T20:00:00Z" }, 0, after),
    false
  );

  // A same day car and a parcel trip are deleted when empty, not settled:
  // they are a container for one order and are worth nothing without it.
  assert.equal(emptyAndDone({ ...run, kind: "same_day" }, 0, after), false);
  assert.equal(emptyAndDone({ ...run, kind: "parcel" }, 0, after), false);

  // A run whose closing time never made sense is left alone rather than
  // settled on the strength of a date nobody can read.
  assert.equal(emptyAndDone({ ...run, cut_off_at: "soon" }, 0, after), false);
});

test("the message asks for the total, with sizes, and no prices", () => {
  const group = {
    restaurant: "Panarottis",
    lines: [
      { name: "Panarottis Special", choices: ["Large"], qty: 1, unitPrice: 28450, key: "a", paid: null, itemId: "x", recovered: 0, menuPrice: 28450, costPrice: 0 },
      { name: "Duo Pizza", choices: ["Monsterito"], qty: 1, unitPrice: 46300, key: "b", paid: null, itemId: "y", recovered: 0, menuPrice: 46300, costPrice: 0 },
    ],
    expectedFoodTotal: 74750,
  };

  const said = counterMessage(group, { shopName: "Sudu" });

  // The size is part of what to cook, not a note beside it. A kitchen
  // reading "Panarottis Special" and guessing the size is the expensive
  // way to find out it needed one.
  assert.match(said, /1 x Panarottis Special Large/);
  assert.match(said, /1 x Duo Pizza Monsterito/);

  // One question, asked plainly, and nothing about how the shop settles
  // up: that is the shop's business, and raising it in a message asking
  // for a price starts a conversation nobody wanted.
  assert.match(said, /confirm the total for the following:/);
  assert.match(said, /Thank you\./);
  assert.equal(/card|transfer|collection/i.test(said), false);

  // Still no prices. What the shop expects to pay invites an argument
  // about a figure nobody at that counter quoted.
  assert.equal(said.includes("28,450"), false);
  assert.equal(said.includes("74,750"), false);
  assert.equal(said.includes("\u20a6"), false);

  // An item with no choices reads as itself, with no empty brackets.
  const plain = counterMessage(
    { ...group, lines: [{ ...group.lines[0], choices: [] }] },
    { shopName: "Sudu" }
  );
  assert.match(plain, /1 x Panarottis Special\n/);
});

test("a counter is paid at the till unless somebody says otherwise", () => {
  assert.equal(paysAtCounter({ pay_by: "card" }), true);
  assert.equal(paysAtCounter({ pay_by: "transfer" }), false);
  assert.equal(paysAtCounter({ pay_by: "TRANSFER" }), false);

  // Unsaid is card. That is how it has always worked and it is the safe
  // way to be wrong: a driver who finds a counter already paid is mildly
  // surprised, while one who finds it is not is stuck with a bag she
  // cannot take.
  assert.equal(paysAtCounter({ pay_by: "" }), true);
  assert.equal(paysAtCounter({}), true);
  assert.equal(paysAtCounter(undefined), true);
});

/*
 * About one stop in ten ends with "we don't have that".
 *
 * The question then is not "call somebody", it is which of these people
 * ordered the thing that is gone. A counter line is grouped across orders
 * so it can be read out at a till, which is exactly what makes it useless
 * for ringing anybody.
 */
test("a sold out line knows who ordered it, by the same key it was grouped by", () => {
  const pizza = {
    restaurant: "Panarottis",
    name: "Panarottis Special",
    choices: ["Large"],
    unit_price_at_order: 28450,
  };

  // The same thing, written the other way round. An order is a set of
  // choices, not a sequence, so these are one line to cook and one line
  // to ring about.
  const samePizza = { ...pizza, choices: ["Large"] };

  const bags = [
    { name: "Temi", phone: "08011111111", lines: [{ ...pizza, qty: 1 }] },
    { name: "Ada", phone: "08022222222", lines: [{ ...samePizza, qty: 2 }] },
  ];

  const buyers = whoOrdered(bags);
  const key = counterKey(pizza);

  assert.equal(buyers[key].length, 2);
  assert.deepEqual(
    buyers[key].map((one) => `${one.name} x${one.qty}`),
    ["Temi x1", "Ada x2"]
  );

  // The key is the grouping's key, not a second opinion about it. If these
  // ever drift, somebody rings the wrong customer from a counter.
  assert.equal(counterKey(samePizza), key);

  // A different size is a different thing to cook and a different line.
  assert.equal(counterKey({ ...pizza, choices: ["Monsterito"] }) === key, false);

  // And a different counter, however identical the food.
  assert.equal(counterKey({ ...pizza, restaurant: "Dodo Pizza" }) === key, false);
});

test("one person ordering twice is one person to ring", () => {
  const bowl = {
    restaurant: "DO Bowls",
    name: "Dirty Jerk",
    choices: [],
    unit_price_at_order: 18550,
  };

  const buyers = whoOrdered([
    {
      name: "Temi",
      phone: "08011111111",
      lines: [
        { ...bowl, qty: 1 },
        { ...bowl, qty: 2 },
        // Bought for somebody else is a different conversation, so it
        // stays its own row: "Temi, for Ada" is not "Temi".
        { ...bowl, qty: 1, for_name: "Ada" },
      ],
    },
  ]);

  const key = counterKey(bowl);
  assert.equal(buyers[key].length, 2);
  assert.equal(buyers[key][0].qty, 3);
  assert.equal(buyers[key][0].forName, "");
  assert.equal(buyers[key][1].qty, 1);
  assert.equal(buyers[key][1].forName, "Ada");
});

/*
 * A run nobody ordered on is not waiting for anything.
 *
 * The profit page listed twenty three runs as still using estimates and
 * asked for real fuel figures on them. Several were from before the shop
 * had launched. They were empty: a scheduled run opens itself every week
 * whether or not anybody wants it, and the rule had been written as "no
 * costs entered" rather than "took money and no costs entered".
 */
test("only a run that took money can still be guessing", () => {
  // Took money, nobody has said what the car cost. A real guess.
  assert.equal(stillAGuess(3, 0), true);

  // Nobody ordered. There is no car, nothing to pay, and its profit is
  // zero however long anybody stares at it.
  assert.equal(stillAGuess(0, 0), false);

  // Costs are in, so it is not a guess whether or not anybody ordered.
  assert.equal(stillAGuess(3, 8000), false);
  assert.equal(stillAGuess(0, 8000), false);

  // Settled closes it whatever the costs say. A run can finish owing
  // nothing: a free delivery, a borrowed car, an evening where the only
  // order was walked across campus. Reading zero costs as "not told yet"
  // parks those in waiting for ever, and the only way out would be typing
  // a cost nobody paid.
  assert.equal(stillAGuess(3, 0, "2026-10-21T20:00:00Z"), false);
  assert.equal(stillAGuess(3, 0, null), true);
});

/*
 * A pause between wrong admin passwords.
 *
 * The customer's four digit PIN already had five tries and a quarter of an
 * hour's rest. The password that opens the whole shop had nothing, and
 * could be guessed as fast as a machine could ask.
 */
test("wrong passwords buy a pause, and it is short enough to survive", () => {
  // Nobody is slowed down for mistyping. Five is already more tries than
  // a person needs.
  assert.equal(pauseAfter(0), 0);
  assert.equal(pauseAfter(4), 0);

  // The fifth is the one that starts the wait. A minute is nothing to a
  // person and caps a machine at five tries a minute.
  assert.equal(pauseAfter(5), 60);
  assert.equal(pauseAfter(19), 60);

  // Nobody mistypes twenty times in a row, so past there it is not a
  // person. Still only five minutes: there is one admin, and locking her
  // out of her own board on a Saturday evening is the thing being avoided.
  assert.equal(pauseAfter(20), 300);
  assert.equal(pauseAfter(2000), 300);
});

test("the wait left is read from the clock, and a broken one never locks anybody out", () => {
  const now = new Date("2026-10-22T20:00:00Z").getTime();

  assert.equal(waitLeft("2026-10-22T20:00:30Z", now), 30);
  assert.equal(waitLeft("2026-10-22T20:01:00Z", now), 60);

  // Past is past.
  assert.equal(waitLeft("2026-10-22T19:59:00Z", now), 0);

  // Nothing set, and nonsense, both mean go ahead. A throttle that refuses
  // everybody because a value could not be read is worse than the guessing
  // it was built to stop.
  assert.equal(waitLeft(null, now), 0);
  assert.equal(waitLeft("", now), 0);
  assert.equal(waitLeft("not a date", now), 0);
});

test("the wait is said in whatever unit a person would say it in", () => {
  assert.equal(waitSaid(0), "");
  assert.equal(waitSaid(1), "Wait 1 second and try again.");
  assert.equal(waitSaid(45), "Wait 45 seconds and try again.");
  assert.equal(waitSaid(60), "Wait 1 minute and try again.");
  assert.equal(waitSaid(300), "Wait 5 minutes and try again.");
});

/*
 * One key for the board, another for everybody else.
 *
 * Customer and promoter cookies were signed with ADMIN_PASSWORD, so one
 * secret spanned two kinds of trust. Nothing was exploitable through it,
 * but changing the admin password silently signed out every customer in
 * the shop, and a security measure with a surprise attached is one nobody
 * takes.
 */
test("the signing key is its own, and falls back so nothing breaks on the way", () => {
  // Set, so it is used. This is the state after somebody fills it in.
  assert.equal(signingKey("a-long-random-string", "hunter2"), "a-long-random-string");

  // Unset, so the old key carries on. This is the whole reason the split
  // can ship without signing anybody out: every cookie already issued
  // still verifies, because the key is still the same value.
  assert.equal(signingKey(undefined, "hunter2"), "hunter2");
  assert.equal(signingKey("", "hunter2"), "hunter2");
  assert.equal(signingKey(null, "hunter2"), "hunter2");

  // Whitespace counts as unset. That is the shape a mistake takes in a
  // dashboard: a stray space, or a newline surviving a paste. Signing
  // every identity in the shop with " " is worse than carrying on.
  assert.equal(signingKey("   ", "hunter2"), "hunter2");
  assert.equal(signingKey("\n", "hunter2"), "hunter2");

  // Trimmed, so a pasted key with a trailing newline is the same key as
  // the one without it, rather than a silent sign-out on the next deploy.
  assert.equal(signingKey("  a-long-random-string\n", "hunter2"), "a-long-random-string");

  // Neither set is a shop that cannot sign anybody in, and it says so
  // rather than signing with an empty string.
  assert.throws(() => signingKey(undefined, undefined), /TOKEN_SECRET or ADMIN_PASSWORD/);
  assert.throws(() => signingKey("", "  "), /TOKEN_SECRET or ADMIN_PASSWORD/);
});

/*
 * Cost beside selling price.
 *
 * The menu held one price, so the shop's margin on food could only be
 * learned afterwards by typing a receipt into a run sheet.
 */
test("a selling price is the cost with the markup on, rounded the shop's way", () => {
  // Rounded up to the nearest fifty, not to the nearest. Rounding down is
  // the shop paying the difference, and on four hundred items that is real
  // money given away by a rule nobody chose.
  assert.equal(sellingFrom(2000, 15), 2300);
  // 1,826 with fifteen per cent on is 2,099.9, which rounds up to 2,100:
  // the figure Chicken Republic's spaghetti actually sells at, which is
  // what made it a plausible cost to work back to in the first place.
  assert.equal(sellingFrom(1826, 15), 2100);
  assert.equal(sellingFrom(1000, 15), 1150);

  // A markup of nothing is a real answer: sold at cost, rounded up.
  assert.equal(sellingFrom(1000, 0), 1000);
  assert.equal(sellingFrom(1010, 0), 1050);

  // Nothing in, nothing out. An item with no cost is not a free item.
  assert.equal(sellingFrom(0, 15), 0);

  // Nonsense markups fall back rather than pricing everything at zero.
  assert.equal(sellingFrom(2000, Number.NaN), 2300);
  assert.equal(sellingFrom(2000, -40), 2300);
});

test("working a cost back out is a starting point, not an answer", () => {
  // Exact where the arithmetic happens to be clean.
  assert.equal(costFrom(2300, 15), 2000);

  // And not where it is not. 2,100 works back to 1,826, which is not a
  // number a restaurant charges, which is exactly why these land
  // unconfirmed and wait for somebody with a receipt.
  assert.equal(costFrom(2100, 15), 1826);

  assert.equal(costFrom(0, 15), 0);
});

test("what the shop keeps, and the difference between none and not known", () => {
  assert.deepEqual(keptOn(2300, 2000), { kept: 300, share: 13 });
  assert.deepEqual(keptOn(2000, 2000), { kept: 0, share: 0 });

  // Sold under cost is a real thing to be told about, not clamped away.
  assert.deepEqual(keptOn(1800, 2000), { kept: -200, share: -11 });

  // No cost is not a margin of zero. A page reading "0% kept" over an item
  // nobody has priced is the kind of wrong that gets believed.
  assert.equal(keptOn(2300, null), null);
  assert.equal(keptOn(2300, undefined), null);
});

/*
 * The figure the person at the till actually needs.
 *
 * The run sheet said "the card should be" over the menu total, which is
 * the cost with the markup on. She would have paid six thousand against a
 * sheet asking for six thousand nine hundred, on every line, every run.
 */
test("a line costs its price without the markup, choices and all", () => {
  // A medium pizza selling at 6,900 cost 6,000 at the counter.
  assert.equal(lineCost(6900, 1, 15), 6000);
  assert.equal(lineCost(6900, 2, 15), 12000);

  // The division works on the whole line because the markup was applied to
  // the choices too: a large pepperoni's price is a large pepperoni's cost
  // with fifteen on. Nothing to apportion between the pizza and the size.
  assert.equal(lineCost(9200, 1, 15), 8000);

  // A counter marked up by nothing costs what it sells for, which is KFC:
  // the food earns the shop nothing and the delivery fee pays for the run.
  assert.equal(lineCost(64999, 1, 0), 64999);

  assert.equal(lineCost(6900, 0, 15), 0);
});

test("a receipt only ever teaches the cost upward", () => {
  // Dearer than expected is news, and next run's sheet should say so.
  assert.equal(raisedCost(6000, 6200), 6200);

  // Cheaper is a deal or a good mood on the day. Following it down would
  // drop what the shop expects to pay on the strength of one afternoon,
  // and next week the deal is over and the sheet is wrong in the direction
  // that costs money.
  assert.equal(raisedCost(6000, 4500), null);
  assert.equal(raisedCost(6000, 6000), null);

  // Nothing known is something learned, whatever the figure. This is how a
  // counter with no cost on it gets its first one.
  assert.equal(raisedCost(null, 4500), 4500);
  assert.equal(raisedCost(undefined, 6200), 6200);

  // Nothing paid is not a price of nothing: a blank box means the menu was
  // right, and it must never teach the shop that something is free.
  assert.equal(raisedCost(6000, 0), null);
  assert.equal(raisedCost(null, 0), null);
});

test("a paid order that shrinks owes the difference back", () => {
  // The case this was built for: a chicken pie the counter had sold out of
  // comes off a paid order of 14,400, and the 1,400 it cost is money the
  // shop is holding that is not its own.
  assert.equal(owedByShrinking("paid", 14400, 13000), 1400);

  // Every paid state owes it, not just the one called paid: an order can
  // be collected or delivered by the time somebody notices.
  assert.equal(owedByShrinking("delivered", 14400, 13000), 1400);
  assert.equal(owedByShrinking("collected", 5000, 4000), 1000);

  // Nothing has moved on an unpaid order, so nothing is owed. Editing a
  // pending order is just editing it.
  assert.equal(owedByShrinking("pending", 14400, 13000), 0);

  // A refunded or cancelled order is not owed a second refund.
  assert.equal(owedByShrinking("refunded", 14400, 13000), 0);
  assert.equal(owedByShrinking("cancelled", 14400, 13000), 0);

  // Growing is money the shop is owed, which is a conversation with the
  // customer and never a negative refund quietly cancelling a real one.
  assert.equal(owedByShrinking("paid", 13000, 14400), 0);
  assert.equal(owedByShrinking("paid", 14400, 14400), 0);
});

test("a refund says why, in the customer's own words where there are some", () => {
  assert.equal(refundSaid("Chicken pie was sold out", false), "Chicken pie was sold out");

  // Whitespace is not a reason.
  assert.match(refundSaid("   ", false), /could not be bought/);

  // The group case keeps its own wording, which is more specific than
  // anything the general one could say.
  assert.match(refundSaid("", true), /group got smaller/);

  // A typed reason beats the group wording too: somebody who bothered to
  // write one knows more than the rule does.
  assert.equal(refundSaid("Two people dropped out", true), "Two people dropped out");

  assert.equal(owesSomething(1400), true);
  assert.equal(owesSomething(0), false);
  assert.equal(owesSomething(null), false);
});

test("buying fewer than were ordered owes back only the ones not had", () => {
  // Two chicken pies ordered at 1,400 each, the counter had one. The
  // quantity goes to 1 and the order falls by exactly one pie, so one pie
  // is what comes back. The most common shape of this, and the one where
  // getting it wrong means handing back twice what is owed.
  assert.equal(owedByShrinking("paid", 14400, 13000), 1400);

  // Three down to one is two pies, not one and not three.
  assert.equal(owedByShrinking("paid", 15800, 13000), 2800);

  // None of them had is the whole line, which is the same rule and not a
  // special case: removing a line is just its quantity reaching nothing.
  assert.equal(owedByShrinking("paid", 15800, 13000 - 0), 2800);
});

test("the buying part of a run ends when the car leaves the counters", () => {
  // Still shopping: the receipt boxes and the collected button belong here.
  assert.equal(buyingDone("ordering"), false);
  assert.equal(buyingDone("closed"), false);
  assert.equal(buyingDone("at_counter"), false);

  // The car has left. Every receipt that will exist exists, so the stops
  // behind it are history and must stop asking to be filled in.
  assert.equal(buyingDone("on_the_road"), true);
  assert.equal(buyingDone("at_drop"), true);
  assert.equal(buyingDone("handed_out"), true);

  // Nonsense is not the end of the night: a stage this does not recognise
  // must leave the sheet working rather than shutting it.
  assert.equal(buyingDone(""), false);
  assert.equal(buyingDone("nonsense"), false);
});

test("a run's expected food cost is the counter's price, not the customer's", () => {
  // The run that prompted this: five lines of Chicken Republic selling for
  // 8,400, which is 7,304 at the till once the shop's 15 per cent comes
  // back off. The tile used to show 8,400, meaning the shop paid exactly
  // what it charged and made nothing at all on food.
  const lines = [
    { qty: 1, unitPrice: 2100 },
    { qty: 1, unitPrice: 1300 },
    { qty: 1, unitPrice: 700 },
    { qty: 1, unitPrice: 1400 },
    { qty: 1, unitPrice: 2900 },
  ];
  assert.equal(expectedFoodCost(lines), 7304);

  // A counter with its own markup is backed off by its own figure.
  assert.equal(expectedFoodCost([{ qty: 2, unitPrice: 1150 }], 15), 2000);

  // Nothing bought costs nothing, rather than throwing on an empty run.
  assert.equal(expectedFoodCost([]), 0);
});

test("a customer is told why in words, not in the driver's shorthand", () => {
  // The real one. "Needs refund" is a fine thing to write at a till and a
  // terrible thing to send to somebody waiting for dinner, and it went
  // straight through to her.
  const said = soldOutSaid("Chicken Pie", "Chicken Republic");
  assert.match(said, /Chicken Republic had sold out of the chicken pie/);
  assert.match(said, /money for it is on its way back/);
  assert.doesNotMatch(said, /Needs refund/);

  // No counter named still reads as a sentence rather than a gap.
  assert.match(soldOutSaid("Dodo Cubes", ""), /^The counter had sold out/);

  // Nothing known falls back to something true and plain, never to silence.
  assert.match(soldOutSaid("", ""), /could not be bought/);
  assert.match(soldOutSaid("   ", "Dominos"), /could not be bought/);
});

test("the bot's reading layer cannot invent anything that costs money", () => {
  // A model answer is never trusted as it stands. Everything below is a
  // thing a model could plausibly return and must not reach the shop.

  // Nonsense of the wrong shape reads as nothing at all, not as an error.
  assert.deepEqual(readIntent(null), NOTHING_READ);
  assert.deepEqual(readIntent("2 pies"), NOTHING_READ);
  assert.deepEqual(readIntent(42), NOTHING_READ);

  // A quantity nobody could mean is clamped rather than obeyed. Twenty
  // thousand chicken pies is a model slip, not an order.
  assert.equal(howMany(9000), MOST);
  assert.equal(howMany(-3), 1);
  assert.equal(howMany("two"), 1);
  assert.equal(howMany(null), 1);
  assert.equal(howMany(2.4), 2);

  // An order with nothing in it is not an order, whatever it calls itself.
  // Letting this through would open a basket on an empty sentence.
  assert.equal(readIntent({ kind: "order", wanted: [] }).kind, "other");

  // Fields keep only what was said, trimmed and bounded. A name that is
  // really a paragraph is a prompt injection attempt or a bug; either way
  // it is not a name.
  const long = readIntent({ kind: "greeting", name: "x".repeat(500) });
  assert.equal(long.name.length, 60);

  const read = readIntent({
    kind: "order",
    wanted: [
      { what: "  chicken pie  ", qty: 2 },
      { what: "", qty: 3 },
      { what: "shawarma", qty: "1" },
    ],
    name: " Naza ",
    phone: " 0800 000 0000 ",
    hostel: " Trezadel ",
    say: " Got it. ",
  });
  assert.equal(read.kind, "order");
  // The blank line is dropped rather than searched for.
  assert.deepEqual(read.wanted, [
    { what: "chicken pie", qty: 2 },
    { what: "shawarma", qty: 1 },
  ]);
  assert.equal(read.name, "Naza");
  assert.equal(read.phone, "0800 000 0000");
  assert.equal(read.hostel, "Trezadel");
});

test("a reading with nothing in it lets the shop's own rules answer", () => {
  assert.equal(worthActingOn(readIntent({ kind: "greeting", say: "Hi" })), false);
  assert.equal(worthActingOn(readIntent({ kind: "order", wanted: [{ what: "pie", qty: 1 }] })), true);
  // A number on its own is still worth acting on: it is how somebody
  // answers "what is your phone number".
  assert.equal(worthActingOn(readIntent({ kind: "other", phone: "0704" })), true);
});

test("the shop brief says only what is true tonight", () => {
  const open = shopBrief({
    shopName: "Sudu",
    counters: ["Chicken Republic", "KFC"],
    hostels: ["Trezadel", "Emerald"],
    nextRun: "tonight between 6pm and 7.30pm",
    cutOff: "4.30 pm",
    open: true,
  });
  assert.match(open, /next run is tonight between 6pm and 7\.30pm/);
  assert.match(open, /shuts at 4\.30 pm/);
  assert.match(open, /Chicken Republic, KFC/);
  // It is told in as many words that it does not price or confirm.
  assert.match(open, /never price|never pric/i);
  assert.doesNotMatch(open, /—/);

  // Nothing open must not be described as though something were.
  const shut = shopBrief({
    shopName: "Sudu",
    counters: [],
    hostels: [],
    nextRun: "",
    cutOff: "",
    open: false,
  });
  assert.match(shut, /Nothing is open/);
  assert.doesNotMatch(shut, /next run is/);
});

test("the reading model is the small one, and moving up is a setting", () => {
  // Unset is the ordinary case and must land somewhere sensible rather
  // than on whatever was most recently fashionable.
  assert.equal(botModel(undefined), "claude-haiku-5-5");
  assert.equal(botModel(""), "claude-haiku-5-5");
  assert.equal(botModel("   "), "claude-haiku-5-5");

  // Short names, because the person typing this into a dashboard at
  // midnight should not have to remember a version number.
  assert.equal(botModel("sonnet"), "claude-sonnet-5-5");
  assert.equal(botModel("Sonnet"), "claude-sonnet-5-5");
  assert.equal(botModel("opus"), "claude-opus-5-5");

  // A full id passes through, so a model released after this was written
  // can be used without changing the code.
  assert.equal(botModel("claude-opus-5-5"), "claude-opus-5-5");

  // Anything else falls back rather than failing: a typo in a dashboard
  // must not stop the bot reading anything at all.
  assert.equal(botModel("gpt-4"), "claude-haiku-5-5");
  assert.equal(botModel("nonsense"), "claude-haiku-5-5");
});

test("a sentence about a person is not searched against the menu", () => {
  /*
   * The bug this exists for.
   *
   * "Need to order for my son" went to the menu as written and came back
   * with Sonia tinned tomato, because "son" sits inside "Sonia". Somebody
   * who had just told us their child's name was asked which purée they
   * meant.
   */
  assert.equal(orderPart("Need to order for my son"), "");
  assert.equal(orderPart("I want to order something for my daughter"), "");
  assert.equal(orderPart("a gift for someone"), "");
  assert.equal(orderPart("surprise for my roommate"), "");
  assert.equal(orderPart("can i get a birthday gift"), "");
  assert.equal(orderPart("it's for Bola"), "");
  assert.equal(orderPart("order"), "");
  assert.equal(orderPart("hi"), "");
  assert.equal(orderPart(""), "");

  // The food survives, which is the whole point: stripping the manners
  // must never cost anybody their order.
  assert.equal(
    orderPart("2 chicken pie and a shawarma for my sister"),
    "2 chicken pie and a shawarma"
  );
  assert.equal(orderPart("please i need 1 bucket of chicken"), "1 bucket of chicken");
  assert.equal(orderPart("2 medium bbq pizza"), "2 medium bbq pizza");
  assert.equal(orderPart("jollof rice"), "jollof rice");
});

test("a gift is noticed rather than asked about", () => {
  // The orders the opening question existed to catch.
  assert.equal(looksLikeAGift("it's my friend's birthday"), true);
  assert.equal(looksLikeAGift("a gift for someone"), true);
  assert.equal(looksLikeAGift("send it to Ada in Emerald"), true);
  assert.equal(looksLikeAGift("for my sister"), true);
  assert.equal(looksLikeAGift("surprise for my roommate"), true);

  // Nine orders in ten, which must not be asked two extra questions.
  assert.equal(looksLikeAGift("2 chicken pie and a shawarma"), false);
  assert.equal(looksLikeAGift("what time is the run"), false);
  assert.equal(looksLikeAGift(""), false);

  // Said plainly, "for me" outranks a word that merely looks gifty: a
  // false gift costs two questions nobody wanted and asks a hungry
  // student whose birthday it is.
  assert.equal(looksLikeAGift("just for me, it's my birthday"), false);
  assert.equal(looksLikeAGift("for myself"), false);
});

test("a correction is allowed to overwrite, an aside is not", () => {
  // The real one: the block was read as Queen Mary and is being put
  // right. Nobody says sorry to a menu.
  assert.equal(isCorrection("sorry, naza, trezadel"), true);
  assert.equal(isCorrection("actually Trezadel"), true);
  assert.equal(isCorrection("no, Emerald"), true);
  assert.equal(isCorrection("I meant Trezadel"), true);
  assert.equal(isCorrection("oops wrong block"), true);

  // An ordinary order must never be allowed to move a block somebody
  // already gave, or a stray word relocates their dinner.
  assert.equal(isCorrection("2 chicken pie and a coke"), false);
  assert.equal(isCorrection("Trezadel"), false);
  assert.equal(isCorrection(""), false);
  // "Nothing else" starts with no but is not a correction of anything.
  assert.equal(isCorrection("nothing else thanks"), false);
});

test("a car of its own keeps its own ladder when an order is moved", () => {
  // The run ladder and the car ladder are different prices for different
  // trips. Moving an order onto a car used to reach for the run's, which
  // is how a 10,000 delivery became 6,000 while the customer was looking
  // at it.
  const carBands = [
    { maxItems: 3, fee: 6000 },
    { maxItems: 99, fee: 8000 },
  ];
  // Two items on the car ladder is 6,000, which is less than the 10,000
  // this order was quoted for an urgent slot. The dearer figure wins: the
  // shop moving its own car is not a reason to hand money back.
  const onLadder = sameDayFee(2, false, carBands, 4000);
  assert.equal(onLadder, 6000);
  assert.equal(Math.max(onLadder, 10000), 10000);

  // Where the ladder is dearer than what was charged, the ladder wins, so
  // adding items to a moved order still costs what it should.
  assert.equal(Math.max(sameDayFee(10, false, carBands, 4000), 6000), 8000);

  // The urgent extra is not re-applied on a move: it is charged for
  // ordering at an hour's notice, and a move is the shop rearranging
  // itself, not the customer asking for anything.
  assert.equal(sameDayFee(2, true, carBands, 4000), 10000);
  assert.equal(sameDayFee(2, false, carBands, 4000), 6000);
});

test("one question answers what a trip costs, whichever trip it is", () => {
  const run = [
    { maxItems: 3, fee: 4000 },
    { maxItems: 99, fee: 6000 },
  ];
  const car = [
    { maxItems: 3, fee: 6000 },
    { maxItems: 99, fee: 8000 },
  ];
  const ladders = { run, car, urgentExtra: 4000 };

  // A run uses the run's ladder.
  assert.equal(tripFee({ kind: "food" }, 2, ladders), 4000);
  assert.equal(tripFee({ kind: "food" }, 10, ladders), 6000);
  assert.equal(tripFee(null, 2, ladders), 4000);

  // A car uses the car's, which is the whole bug: asked the old way this
  // returned 4,000 for a trip that costs 6,000.
  assert.equal(tripFee({ kind: "same_day" }, 2, ladders), 6000);
  assert.equal(tripFee({ kind: "same_day" }, 10, ladders), 8000);

  // The urgent extra only where somebody asked for an urgent slot.
  assert.equal(tripFee({ kind: "same_day" }, 2, { ...ladders, urgent: true }), 10000);
  assert.equal(tripFee({ kind: "food" }, 2, { ...ladders, urgent: true }), 4000);

  // A run's flash price still beats its ladder, and a car has no flash.
  // A flash price moves the whole ladder down rather than replacing it,
  // so ten items on a 2,500 flash is 2,500 plus the gap to its band.
  assert.equal(tripFee({ kind: "food", flash_fee: 2500 }, 10, ladders), 4500);
  assert.equal(tripFee({ kind: "same_day", flash_fee: 2500 }, 10, ladders), 8000);

  assert.equal(isCar({ kind: "same_day" }), true);
  assert.equal(isCar({ kind: "food" }), false);
  assert.equal(isCar(null), false);
});

test("a near miss on the search is offered rather than left as nothing", () => {
  const shelf = [
    "Birthday Cake Remix",
    "Chicken Pie",
    "Pepperoni",
    "Assorted doughnuts",
    "Smokey jollof rice",
  ];

  // The real one. Seven letters of eight, and the shop has the thing.
  assert.deepEqual(didYouMean("birthdat", shelf, 1), ["Birthday Cake Remix"]);
  assert.deepEqual(didYouMean("chiken", shelf, 1), ["Chicken Pie"]);
  assert.deepEqual(didYouMean("peperoni", shelf, 1), ["Pepperoni"]);

  // Nothing like anything is nothing, not the least bad option. A search
  // for a thing the shop does not have must say so rather than offer a
  // doughnut and look as though it is not listening.
  assert.deepEqual(didYouMean("lawnmower", shelf), []);
  assert.deepEqual(didYouMean("", shelf), []);
  assert.deepEqual(didYouMean("pie", []), []);

  // A name is offered once however many times the shelf carries it.
  assert.deepEqual(didYouMean("chiken", ["Chicken Pie", "chicken pie"], 3), [
    "Chicken Pie",
  ]);
});

test("a suggestion is the word they typed, not the nearest thing in the shop", () => {
  // The real failure: "curta" offered an ECO Professional Styling Gel
  // Curl & Wave, because five letters sharing two bigrams with "Curl"
  // scored 0.57 and the floor was 0.55. On a long enough name there is
  // always some word that scores that against something.
  const shelf = [
    "ECO Professional Styling Gel Curl & Wave 236ml",
    "Chicken Pie",
    "Birthday Cake Remix",
  ];
  assert.deepEqual(didYouMean("curta", shelf), []);

  // And the ones that are genuinely a typo still come through.
  assert.deepEqual(didYouMean("birthdat", shelf, 1), ["Birthday Cake Remix"]);
  assert.deepEqual(didYouMean("chiken", shelf, 1), ["Chicken Pie"]);
});

test("a parcel route with no price is still a route", () => {
  /*
   * Four towns each way covers most of what gets asked for and none of what
   * does not: a pickup in Epe, a box plainly heavier than three kilos. Those
   * were a dead end on a page whose whole job is to say yes, so one route
   * carries no bands at all and asks for a quote instead.
   */
  const priced: ParcelRoute = {
    id: "sango-pau",
    label: "Sangotedo/Ajah to PAU",
    bands: [{ upTo: 3, fee: 4000 }],
    toPau: true,
    on: true,
    custom: false,
  };
  const quote: ParcelRoute = {
    id: "custom",
    label: "Somewhere else, or heavier than 3kg",
    bands: [],
    toPau: true,
    on: true,
    custom: true,
  };
  const half: ParcelRoute = {
    id: "pau-ikorodu",
    label: "PAU to Ikorodu",
    bands: [],
    toPau: false,
    on: true,
    custom: false,
  };

  // Offered, though it has no ladder behind it.
  assert.deepEqual(
    liveRoutes([priced, quote, half]).map((one) => one.id),
    ["sango-pau", "custom"]
  );
  // And kept out of every sum, because asking an empty ladder for its
  // cheapest rung answers infinity.
  assert.deepEqual(
    pricedRoutes([priced, quote, half]).map((one) => one.id),
    ["sango-pau"]
  );
  assert.equal(isCustom(quote), true);
  assert.equal(isCustom(priced), false);

  // "Somewhere else" is not a place. A front page reading "Sangotedo/Ajah
  // and Somewhere else" names a town that is not on any map.
  assert.equal(placesSaid([priced, quote]), "Sangotedo/Ajah");

  // A shop whose only live route is the unpriced one is still carrying
  // parcels: there is something somebody can ask for.
  assert.equal(
    parcelsFrom({ parcel_on: "on", parcel_routes: JSON.stringify([quote]) } as never).on,
    true
  );
  // One with nothing live at all is not.
  assert.equal(
    parcelsFrom({ parcel_on: "on", parcel_routes: JSON.stringify([half]) } as never).on,
    false
  );
});

test("a dish with an occasion in its name is not an occasion", () => {
  /*
   * "Birthday Cake Remix" is a tub of ice cream at Cold Stone. Somebody
   * pasted a basket with one in it and was asked whose birthday it was,
   * then handed a box for the recipient's first name, on an order they
   * were placing for themselves.
   */
  const dishes = ["Birthday Cake Remix Like It", "Gift Box Hamper Large"];

  assert.equal(looksLikeAGift("1 x Birthday Cake Remix Like It"), true);
  assert.equal(looksLikeAGift("1 x Birthday Cake Remix Like It", dishes), false);

  // The real thing still gets asked about, dishes or no dishes.
  assert.equal(looksLikeAGift("it is my sister's birthday", dishes), true);
  assert.equal(looksLikeAGift("a gift for someone", dishes), true);

  // A pasted cart is an order, whatever words are in the dish names.
  assert.equal(
    looksLikeABasket(
      "I want to order the below 1 × Chicken BBQ Medium × Original " +
        "× Dodo Pizza 1 × Pepperoni Original"
    ),
    true
  );
  assert.equal(looksLikeABasket("1 x jollof rice"), false);
  assert.equal(looksLikeABasket("2 chicken pie for my sister"), false);
  assert.equal(looksLikeABasket("2 chicken pie\n1 coke"), true);
  assert.equal(looksLikeABasket(""), false);
});

test("pointing at a list is not naming a dish", () => {
  /*
   * "I want to order the below" was searched against the menu and came
   * back with Yellow Pepper: "below" and "yellow" are a letter and a
   * shuffle apart, and a menu is all the search has to offer.
   */
  assert.equal(botIntentOf("I want to order the below"), "vague-order");
  assert.equal(botIntentOf("order the following"), "vague-order");
  assert.equal(botIntentOf("i want to order"), "vague-order");

  // A sentence with a real word in it is still an order to search for.
  assert.equal(botIntentOf("I want to order from Dominos"), "");
  assert.equal(botIntentOf("i want yellow pepper"), "");
});

test("a cart pasted in whole is read as its lines", () => {
  /*
   * Somebody ordering for a birthday has the list somewhere already: in a
   * group chat, or in a basket on another tab. Pasted here it arrives as
   * one line with no commas in it, because a browser runs a copied table
   * together, and the chat read it as one dish that matched nothing.
   *
   * The real paste, off a real order.
   */
  const paste =
    "I want to order the below 1 × Chicken BBQ Medium x Original × Dodo Pizza " +
    "1 × Pepperoni Original × Dodo Pizza Medium x " +
    "1 × Assorted doughnuts Half dozen (6) +₦9,700 x Krispy Kreme " +
    "1 × Birthday Cake Remix Like It +₦1,150 x Cold Stone Creamery " +
    "1 × Extra large value munch - fried rice & chicken in stew The Place " +
    "2 × Hamburger Meal Fries x Regular x Burger King Coca-Cola x";

  const lines = botSplitOrder(paste);
  assert.equal(lines.length, 6);

  // The run-up is not one of the lines: it names nothing.
  assert.equal(
    lines.some((one) => one.toLowerCase().includes("want to order")),
    false
  );
  // The count comes off the times sign and reads the way it reads
  // everywhere else.
  assert.equal(lines[0], "1 Chicken BBQ Medium x Original × Dodo Pizza");
  assert.equal(lines[5].startsWith("2 Hamburger Meal"), true);
  // The printed price is not a thing to search for, and not a number this
  // shop would take back in through a paste.
  assert.equal(
    lines.some((one) => one.includes("9,700") || one.includes("1,150")),
    false
  );
  // The counter stays on the line: the search scores the dish and the
  // counter together, and "Dodo Pizza" is most of what finds Pepperoni.
  assert.equal(lines[1].includes("Dodo Pizza"), true);

  // An ordinary message is not a cart and is left to the ordinary rules.
  assert.deepEqual(basketLines("I want 2 x chicken pie"), []);
  assert.deepEqual(basketLines("fish and chips"), []);
  assert.deepEqual(basketLines(""), []);
  // A real "x" inside a dish name is never a separator: this is the one
  // that turned Birthday Cake Remix Like It into "Birthday Cake Remi".
  assert.deepEqual(basketLines("Birthday Cake Remix Like It"), []);
  // Two counts with a times sign is a cart, however it was typed.
  assert.deepEqual(botSplitOrder("2 x chicken pie and 1 x coke"), [
    "2 chicken pie",
    "1 coke",
  ]);
  // And the comma rule still does what it always did.
  assert.deepEqual(botSplitOrder("2 chicken pie, 1 coke"), ["2 chicken pie", "1 coke"]);
});

test("ice cream rides along rather than making its own trip", () => {
  /*
   * Fantasy ice cream is small and the people who buy it buy a lot:
   * fifteen is one cool box, thirty is two. On the container ladder
   * fifteen prices as fifteen takeaway boxes, which is a number nobody
   * pays.
   */
  const steps = { first: 15, firstFee: 4000, step: 15, stepFee: 500 };

  assert.equal(feeByStep(1, steps), 4000);
  assert.equal(feeByStep(15, steps), 4000);
  // Part of a lot is a lot: sixteen needs the second cool box as surely as
  // thirty does, and charging sixteen as fifteen is giving the box away.
  assert.equal(feeByStep(16, steps), 4500);
  assert.equal(feeByStep(30, steps), 4500);
  assert.equal(feeByStep(31, steps), 5000);
  assert.equal(feeByStep(45, steps), 5000);
  assert.equal(feeByStep(0, steps), 0);
  assert.equal(feeByStep(30, null), 0);

  /*
   * The car is going for the pizzas. The ice cream is grabbed on the way
   * past, so the rest of the cart pays its own way and the ice cream
   * adds one step on top: the five hundred that is the ladder's own word
   * for "and these as well". Charging it a trip of its own on top of
   * theirs charges twice for one journey, and a cart with both in it
   * falls off a cliff.
   */
  // Three Domino's pizzas and fifteen ice creams: the pizzas, and five
  // hundred for the tubs.
  assert.equal(
    feeRidingAlong({ stepCount: 15, steps, otherFee: 5500 }),
    6000
  );
  // Eleven ice creams and one cake at four thousand: four and a half.
  assert.equal(
    feeRidingAlong({ stepCount: 11, steps, otherFee: 4000 }),
    4500
  );
  // However many there are. Eleven and sixty are the same answer, which
  // is the shop saying the ice cream was never what the trip was for.
  assert.equal(
    feeRidingAlong({ stepCount: 60, steps, otherFee: 4000 }),
    4500
  );
  // Alone in the cart it is the trip, so it pays the whole ladder.
  assert.equal(feeRidingAlong({ stepCount: 15, steps, otherFee: 0 }), 4000);
  assert.equal(feeRidingAlong({ stepCount: 30, steps, otherFee: 0 }), 4500);
  // Nothing priced this way leaves the ordinary fee exactly as it was.
  assert.equal(
    feeRidingAlong({ stepCount: 0, steps, otherFee: 7000 }),
    7000
  );
  assert.equal(
    feeRidingAlong({ stepCount: 30, steps: null, otherFee: 7000 }),
    7000
  );

  // Read back out of a row, and a row nobody can read is a thing
  // priced the ordinary way rather than a broken checkout.
  assert.deepEqual(parseStepFee(serialiseStepFee(steps)), steps);
  assert.equal(parseStepFee(""), null);
  assert.equal(parseStepFee("not json"), null);
  // A first lot of nothing would charge the same for one as for a
  // thousand; a step of nothing would divide by zero working out the lots.
  assert.equal(parseStepFee('{"first":0,"firstFee":4000,"step":15,"stepFee":500}'), null);
  assert.equal(parseStepFee('{"first":15,"firstFee":4000,"step":0,"stepFee":500}'), null);
});

test("a cost somebody wrote down beats the sum", () => {
  /*
   * The run sheet worked the counter price out backwards, by taking the
   * shop's markup off the selling price. Fantasy ice cream was put in at
   * 1,200 off the counter's own shelf and the sheet went on printing
   * 1,130, because 1,300 less fifteen per cent is 1,130 and nothing in the
   * sum had changed. Somebody stands at a till reading one number while it
   * asks for another.
   */
  const lines = [
    {
      id: "l1",
      order_id: "o1",
      menu_item_id: "ice",
      qty: 11,
      unit_price_at_order: 1300,
      name: "Fantasy Icecream",
      restaurant: "Sudu Shop",
      source: "",
      choices: [] as string[],
    },
  ] as never;

  // The sum, which is what it did before: 1,300 less fifteen per cent.
  const guessed = chargedByRestaurant(lines, [], { "Sudu Shop": 15 });
  assert.equal(guessed[0].charged, 11 * 1130);

  // The cost somebody typed in, which is what the counter will ask for.
  const known = chargedByRestaurant(
    lines,
    [],
    { "Sudu Shop": 15 },
    new Map([["ice", 1200]])
  );
  assert.equal(known[0].charged, 11 * 1200);

  // A receipt somebody actually typed beats both: it is the only figure
  // that is neither a sum nor a note about the world.
  const counted = chargedByRestaurant(
    lines,
    [{ line_key: counterKey(lines[0]), paid: 12_000 }],
    { "Sudu Shop": 15 },
    new Map([["ice", 1200]])
  );
  assert.equal(counted[0].charged, 12_000);
});

test("what goes on the card is the counters and the fare", () => {
  /*
   * Customers transfer into the shop's account. The counters are paid with
   * a card somebody else is holding, so before a run goes out the shop has
   * to move money onto it: what the counters will charge, plus the fare
   * for the trip. Whatever is left in the account is the shop's.
   */
  const table = parseFares(
    serialiseFares([
      { areas: ["sango"], amount: 3000 },
      { areas: ["lekki"], amount: 6000 },
      { areas: ["sango", "ajah"], amount: 5000 },
      { areas: ["sango", "lekki"], amount: 7000 },
    ])
  );

  // The table first, by the exact set of areas. A run stopping in two
  // places is its own trip with its own fare: adding the singles would be
  // charging for two journeys that were one.
  assert.deepEqual(fareFor(["sango"], table), { amount: 3000, exact: true });
  assert.deepEqual(fareFor(["lekki"], table), { amount: 6000, exact: true });
  assert.deepEqual(fareFor(["ajah", "sango"], table), { amount: 5000, exact: true });
  assert.deepEqual(fareFor(["lekki", "sango"], table), { amount: 7000, exact: true });
  // Order and repeats cannot change the answer.
  assert.deepEqual(fareFor(["sango", "sango", "ajah"], table), {
    amount: 5000,
    exact: true,
  });

  // Nobody has priced Ajah and Lekki together. The dearest leg it is made
  // of, said as a guess rather than left blank on the screen where the
  // money is decided.
  assert.deepEqual(fareFor(["ajah", "lekki"], table), { amount: 6000, exact: false });
  // Nothing priced at all is nothing to say.
  assert.deepEqual(fareFor(["sango"], []), { amount: 0, exact: false });
  assert.deepEqual(fareFor([], table), { amount: 0, exact: false });

  // The one figure that gets typed into a transfer.
  assert.equal(putOnCard({ counters: 50_000, fare: 3000 }), 53_000);
  assert.equal(putOnCard({ counters: 0, fare: 0 }), 0);

  // A row nobody can read is a shop with no fares typed in, which is how
  // it worked before anybody typed one.
  assert.deepEqual(parseFares("not json"), []);
  assert.deepEqual(parseFares(""), []);
  // A fare for no areas is not a trip. A fare of nought is: a drop made on
  // the way home costs nothing, and saying so beats leaving a guess.
  assert.deepEqual(parseFares('[{"areas":[],"amount":3000}]'), []);
  assert.deepEqual(parseFares('[{"areas":["sango"],"amount":0}]'), [
    { areas: ["sango"], amount: 0 },
  ]);
});

test("which kitchens is a question the chat can answer itself", () => {
  /*
   * "What restaurants do you deliver from" had no written answer, so the
   * near miss offered "Where do you deliver?" -- a different question,
   * about PAU -- and the chat answered it. Somebody who asked which
   * kitchens we buy from was told where we drive to.
   *
   * The counters open tonight are the one answer the chat already holds
   * and that can never go stale.
   */
  assert.equal(botIntentOf("What restaurants do you deliver from"), "menu");
  assert.equal(botIntentOf("which kitchens do you buy from"), "menu");
  assert.equal(botIntentOf("what counters are open"), "menu");
  assert.equal(botIntentOf("what is on the menu"), "menu");

  // A general word only. Naming one belongs in the search, and nothing on
  // any shelf is called a restaurant.
  assert.equal(botIntentOf("I want to order from Dominos"), "");
  assert.equal(botIntentOf("2 chicken pie"), "");
  // The one that started it: a different question, and still its own.
  assert.equal(botIntentOf("Where do you deliver?"), "");
  // And a dish whose name holds a word the rule nearly wanted.
  assert.equal(
    botIntentOf("Extra large value munch - fried rice & chicken in stew The Place"),
    ""
  );
});

test("a word that names a whole shelf is a question, not an answer", () => {
  /*
   * Somebody picked Domino's, was asked what they wanted, and said
   * "pizza". The chat said "Found it: Pizza Sauce Calzone" and added it.
   * Every word of that is true and none of it is what was asked for: at a
   * pizza place "pizza" is the name of the menu, not of a dish, and the
   * one it landed on won by being first in a long list of things with the
   * word in them.
   */
  const dominos = [
    "Pizza Sauce Calzone",
    "Margherita Pizza",
    "Hawaiian Pizza",
    "Pepperoni",
    "Cheesy Bread",
    "Zinger Burger",
  ].map((name, at) => ({ id: String(at), name }));

  const kind = botFind("pizza", dominos, 3);
  assert.equal(kind.how, "asking");
  // And the real pizzas are what it offers, not the calzone that merely
  // had the word first.
  assert.equal(kind.hits[0].name.includes("Pizza"), true);

  // One dish is still one dish. Nothing here is about being cautious with
  // a name somebody actually said.
  assert.equal(botFind("zinger", dominos, 3).how, "sure");
  assert.equal(botFind("calzone", dominos, 3).how, "sure");
  assert.equal(botFind("cheesy bread", dominos, 3).how, "sure");

  // A word on only one or two things is not a kind. "Pepperoni" here is
  // the dish, and asking about it would be the chat being unhelpful.
  assert.equal(botFind("pepperoni", dominos, 3).how, "sure");
});

test("a name is found without its apostrophe", () => {
  /*
   * "Dominos" found nothing, because the kitchen is called Domino's Pizza
   * and the apostrophe is in the shop's name rather than in anybody's
   * typing. Expecting it is the search asking to be told the answer
   * before it will give it.
   */
  const matches = (term: string, name: string) => bare(name).includes(bare(term));

  assert.equal(matches("dominos", "Domino's Pizza"), true);
  assert.equal(matches("domino", "Domino's Pizza"), true);
  assert.equal(matches("domino's", "Domino's Pizza"), true);
  // Spaces go too, so a name typed as one word still lands.
  assert.equal(matches("coldstone", "Cold Stone Creamery"), true);
  assert.equal(matches("burgerking", "Burger King"), true);
  assert.equal(matches("cold stone", "Cold Stone Creamery"), true);
  // And it is still a search, not a shrug: a different shop is a miss.
  assert.equal(matches("dominos", "Burger King"), false);
  assert.equal(matches("", "Domino's Pizza"), true);
  assert.equal(bare("  "), "");

  /*
   * The menu is four thousand rows, so it cannot be read and matched the
   * way ten kitchens can. It asks for the obvious spellings instead, and
   * the possessive is the one that matters.
   */
  assert.deepEqual(spellings("dominos").sort(), ["domino's", "dominos"]);
  assert.deepEqual(spellings("jay's").sort(), ["jay's", "jays"]);
  // Nothing clever on a word that needs nothing.
  assert.deepEqual(spellings("pizza"), ["pizza"]);
  // The characters that would break the query are not sent into it.
  assert.deepEqual(spellings("a,b(c)%"), ["a b c"]);
  assert.deepEqual(spellings("   "), []);
});

test("more than one is said twice", () => {
  /*
   * Two hamburger meals were ordered and one was bought, and the whole of
   * that mistake is a digit that looks exactly like every other digit on
   * the page. It costs twice: the customer is short a meal, and the shop
   * hands back money it has already paid at a counter.
   */
  assert.equal(inWords(2), "two");
  assert.equal(inWords(3), "three");
  assert.equal(inWords(10), "ten");
  // Past ten the digits read faster than the word, and nobody says
  // "seventeen" at a till quicker than they read 17.
  assert.equal(inWords(17), "17");
  assert.equal(inWords(1), "one");

  // The message to the counter carries it, because a message has no
  // colour to use. One of a thing stays quiet: a line that shouts on
  // every row is a line nobody reads.
  const group = {
    restaurant: "Burger King",
    lines: [
      {
        name: "Hamburger Meal",
        choices: [],
        qty: 2,
        unitPrice: 9150,
        key: "a",
        paid: null,
        itemId: "x",
        recovered: 0,
        menuPrice: 9150,
        costPrice: 0,
      },
      {
        name: "Coca-Cola",
        choices: [],
        qty: 1,
        unitPrice: 1500,
        key: "b",
        paid: null,
        itemId: "y",
        recovered: 0,
        menuPrice: 1500,
        costPrice: 0,
      },
    ],
    expectedFoodTotal: 19800,
  };

  const said = counterMessage(group, { shopName: "Sudu" });
  assert.match(said, /2 x Hamburger Meal \(TWO\)/);
  assert.equal(said.includes("Coca-Cola (ONE)"), false);
  assert.match(said, /1 x Coca-Cola/);
});

test("a choice is said with the question it answers", () => {
  assert.equal(saidPick({ group: "Size", name: "Regular" }), "Size: Regular");
  // Nothing to label it with: the bare word is still better than nothing.
  assert.equal(saidPick({ group: "", name: "Regular" }), "Regular");
  // No stuttering where the group is named after the choice.
  assert.equal(saidPick({ group: "Regular", name: "regular" }), "regular");
});

test("choices fall back to their bare names", () => {
  assert.deepEqual(saidPicks(undefined, ["Large", "Fries"]), ["Large", "Fries"]);
  assert.deepEqual(saidPicks([], ["Large"]), ["Large"]);
  assert.deepEqual(
    saidPicks(
      [
        { group: "Size", name: "Regular" },
        { group: "Side", name: "Fries" },
      ],
      ["Regular", "Fries"]
    ),
    ["Size: Regular", "Side: Fries"]
  );
});

test("a free choice is written out like a paid one", () => {
  // The whole bug: Regular cost nothing extra, so the run sheet said
  // nothing about it and somebody had to ring to ask which size it was.
  assert.equal(
    saidPicksLine(
      [
        { group: "Size", name: "Regular" },
        { group: "Drink", name: "Coca-Cola" },
      ],
      ["Regular", "Coca-Cola"]
    ),
    "Size: Regular, Drink: Coca-Cola"
  );
});

test("ice cream is the last stop whatever the run is arranged as", () => {
  const stops = [
    { restaurant: "Cold Stone Creamery" },
    { restaurant: "Burger King" },
    { restaurant: "The Place" },
  ];

  // Nobody has arranged it: alphabetical, but ice cream still last.
  assert.deepEqual(
    sortStops(stops, null, ["Cold Stone Creamery"]).map((one) => one.restaurant),
    ["Burger King", "The Place", "Cold Stone Creamery"]
  );

  // Arranged with ice cream first, which is exactly the mistake the rule
  // is there to catch.
  assert.deepEqual(
    sortStops(
      stops,
      ["Cold Stone Creamery", "The Place", "Burger King"],
      ["Cold Stone Creamery"]
    ).map((one) => one.restaurant),
    ["The Place", "Burger King", "Cold Stone Creamery"]
  );

  // Two that melt keep their own order at the end.
  assert.deepEqual(
    sortStops(
      [...stops, { restaurant: "Hans & Rene" }],
      ["Hans & Rene", "Cold Stone Creamery", "Burger King", "The Place"],
      ["Cold Stone Creamery", "Hans & Rene"]
    ).map((one) => one.restaurant),
    ["Burger King", "The Place", "Hans & Rene", "Cold Stone Creamery"]
  );

  // Nothing melts: the arrangement is the whole story, as before.
  assert.deepEqual(
    sortStops(stops, ["The Place", "Cold Stone Creamery", "Burger King"], []).map(
      (one) => one.restaurant
    ),
    ["The Place", "Cold Stone Creamery", "Burger King"]
  );
});

test("one driver: a car of its own waits while a run is out", () => {
  const today = "2026-10-24";

  // The boot is full and the car is pointed at PAU. She cannot drop that
  // lot and come back out for one bag.
  assert.equal(
    driverIsOut([{ stage: "on_the_road", run_date: today }], today),
    true
  );
  assert.equal(driverIsOut([{ stage: "at_drop", run_date: today }], today), true);

  // At the counters she is still shopping, and a counter she has not
  // reached is one more thing she can buy on the way. That hour is the
  // best hour of the evening to sell a car, not the worst.
  assert.equal(
    driverIsOut([{ stage: "at_counter", run_date: today }], today),
    false
  );

  // Closed is only a deadline. The food has not been fetched and she has
  // not gone anywhere.
  assert.equal(driverIsOut([{ stage: "closed", run_date: today }], today), false);
  assert.equal(driverIsOut([{ stage: "ordering", run_date: today }], today), false);

  // Back from the drop, free again.
  assert.equal(
    driverIsOut([{ stage: "handed_out", run_date: today }], today),
    false
  );

  // Another day's run is not what she is doing tonight.
  assert.equal(
    driverIsOut([{ stage: "on_the_road", run_date: "2026-10-23" }], today),
    false
  );

  // A parcel is its own trip on a day agreed with whoever sent it, and a
  // cancelled run is nothing at all.
  assert.equal(
    driverIsOut([{ stage: "on_the_road", run_date: today, kind: "parcel" }], today),
    false
  );
  assert.equal(
    driverIsOut(
      [{ stage: "on_the_road", run_date: today, status: "cancelled" }],
      today
    ),
    false
  );

  // A car of its own already out blocks the next one just the same: it is
  // still one person driving.
  assert.equal(
    driverIsOut([{ stage: "on_the_road", run_date: today, kind: "same_day" }], today),
    true
  );
});

test("a run out tonight shuts today's cars and not tomorrow's", () => {
  const today = "2026-10-24";
  const slots = [
    { date: today, label: "between 4pm and 6pm" },
    { date: today, label: "between 6pm and 8pm" },
    { date: "2026-10-25", label: "between 12pm and 3pm" },
  ];

  // Nobody out: every time stands.
  assert.deepEqual(carsStillDrivable(slots, false, today), slots);

  // Out with tonight's run: today goes, tomorrow stays. Tomorrow is a
  // different day and she is not driving tonight's run on it.
  assert.deepEqual(
    carsStillDrivable(slots, true, today).map((one) => one.date),
    ["2026-10-25"]
  );
});

test("a closed run still takes orders until it has been shopped", () => {
  const run = { kind: "run", stage: "closed", status: "closed" };
  assert.equal(takingLastMinute(run), true);
  assert.equal(takingLastMinute({ ...run, stage: "at_counter" }), true);

  // The boot is full and the car has gone. Nothing more can be added.
  assert.equal(takingLastMinute({ ...run, stage: "on_the_road" }), false);
  assert.equal(takingLastMinute({ ...run, stage: "handed_out" }), false);
  assert.equal(takingLastMinute({ ...run, status: "cancelled" }), false);

  // A car of its own is one person's trip and has nobody to be late for.
  assert.equal(takingLastMinute({ ...run, kind: "same_day" }), false);
});

test("a counter she has been to is behind her", () => {
  const every = [
    { id: "bk", name: "Burger King" },
    { id: "cr", name: "Chicken Republic" },
    { id: "dp", name: "Domino's Pizza" },
  ];

  // Nothing ticked yet: every counter is still on.
  const all = stillToGo({ onlyPlaces: "", everyPlace: every, got: [] });
  assert.equal(runCarries(all, ["bk", "cr", "dp"]), true);

  // Burger King is collected, so nothing from there can be ordered again
  // today. Chicken Republic is still ahead, which is the whole point.
  const after = stillToGo({ onlyPlaces: "", everyPlace: every, got: ["Burger King"] });
  assert.equal(runCarries(after, ["cr"]), true);
  assert.equal(runCarries(after, ["bk"]), false);
  assert.equal(runCarries(after, ["cr", "bk"]), false);
  assert.equal(anythingLeft(after), true);

  // A run kept to its own counters never widens: this one was never
  // stopping at Domino's, and a late order cannot send it there.
  const fussy = stillToGo({ onlyPlaces: "|bk|cr|", everyPlace: every, got: ["Burger King"] });
  assert.equal(runCarries(fussy, ["dp"]), false);
  assert.equal(runCarries(fussy, ["cr"]), true);

  // Everything ticked. An empty list reads as "anywhere" everywhere else,
  // so it must never be handed on as one.
  const done = stillToGo({
    onlyPlaces: "",
    everyPlace: every,
    got: ["Burger King", "Chicken Republic", "Domino's Pizza"],
  });
  assert.equal(anythingLeft(done), false);
});

test("a bag of ice goes on once, and leaves when the ice cream does", () => {
  const needs = new Set(["sundae"]);
  const bag = (itemId: string) => ({ menu_item_id: itemId, qty: 1 });

  // Nothing on ice: nothing added.
  assert.deepEqual(withIce([{ menu_item_id: "pizza", qty: 2 }], needs, "ice", bag), [
    { menu_item_id: "pizza", qty: 2 },
  ]);

  // Ten tubs and one tub need the same bag, and it is one bag.
  const many = withIce([{ menu_item_id: "sundae", qty: 10 }], needs, "ice", bag);
  assert.deepEqual(many, [
    { menu_item_id: "sundae", qty: 10 },
    { menu_item_id: "ice", qty: 1 },
  ]);

  // Already there: never a second one.
  assert.equal(withIce(many, needs, "ice", bag).length, 2);

  // The shop has not said which item the bag is. Nothing is added, and
  // nothing is refused either.
  assert.deepEqual(withIce([{ menu_item_id: "sundae", qty: 1 }], needs, "", bag), [
    { menu_item_id: "sundae", qty: 1 },
  ]);

  // Out of the delivery count: the bag is the shop's answer to a problem
  // the order created, not another thing somebody asked for.
  assert.deepEqual(withoutIce(many, "ice"), [{ menu_item_id: "sundae", qty: 10 }]);
});

test("today's run is the one with food in it", () => {
  const today = "2026-10-24";
  const run = (one: Partial<RunToPick> & { cut_off_at: string }) => ({
    run_date: today,
    stage: "closed" as const,
    orderCount: 0,
    ...one,
  });

  // Two runs today, one of them empty. The empty one is the one day's run
  // nobody can work on, and it was the one the button kept opening.
  const empty = run({ cut_off_at: "2026-10-24T10:00:00Z", orderCount: 0 });
  const real = run({ cut_off_at: "2026-10-24T14:00:00Z", orderCount: 6 });
  assert.equal(runToWorkOn([empty, real], today), real);
  assert.equal(runToWorkOn([real, empty], today), real);

  // Both have food: the one further along is the one being worked on.
  const shopping = run({ cut_off_at: "2026-10-24T14:00:00Z", orderCount: 2, stage: "at_counter" });
  const waiting = run({ cut_off_at: "2026-10-24T10:00:00Z", orderCount: 3 });
  assert.equal(runToWorkOn([waiting, shopping], today), shopping);

  // Neither has food: the one closing soonest.
  const early = run({ cut_off_at: "2026-10-24T10:00:00Z" });
  const late = run({ cut_off_at: "2026-10-24T18:00:00Z" });
  assert.equal(runToWorkOn([late, early], today), early);

  // Nothing today: the soonest day after it, and the same question again
  // within that day.
  const tomorrowEmpty = { ...run({ cut_off_at: "2026-10-25T09:00:00Z" }), run_date: "2026-10-25" };
  const tomorrowReal = {
    ...run({ cut_off_at: "2026-10-25T16:00:00Z", orderCount: 4 }),
    run_date: "2026-10-25",
  };
  const later = { ...run({ cut_off_at: "2026-10-28T16:00:00Z", orderCount: 9 }), run_date: "2026-10-28" };
  assert.equal(runToWorkOn([later, tomorrowEmpty, tomorrowReal], today), tomorrowReal);

  assert.equal(runToWorkOn([], today), null);
});

test("a day's costs are typed once and shared, never doubled", () => {
  // One fare for one drive, across a run carrying four bags and a car
  // carrying two. What the parts come to is what was typed.
  const split = splitDayCosts(
    { fuel: 0, transport: 9000, driver: 0, other: 0 },
    [
      { id: "run", bags: 4 },
      { id: "car", bags: 2 },
    ]
  );
  assert.deepEqual(
    split.map((one) => one.transport),
    [6000, 3000]
  );
  assert.equal(
    split.reduce((sum, one) => sum + one.transport, 0),
    9000
  );

  // The odd naira goes to the one carrying most of the evening, so
  // nothing is lost to rounding.
  const odd = shareOut(7000, [2, 1]);
  assert.deepEqual(odd, [4667, 2333]);
  assert.equal(odd[0] + odd[1], 7000);

  // Nothing carrying anything yet: split evenly rather than dropped.
  assert.deepEqual(shareOut(4000, [0, 0]), [2000, 2000]);

  // Nothing typed is nothing shared.
  assert.deepEqual(shareOut(0, [3, 1]), [0, 0]);

  // Added back up, which is what the boxes open on.
  assert.deepEqual(
    dayCostSoFar([
      { fuel: 100, transport: 6000, driver: 0, other: 50 },
      { fuel: 200, transport: 3000, driver: 0, other: 0 },
    ]),
    { fuel: 300, transport: 9000, driver: 0, other: 50 }
  );
});

test("a run stops taking last minute orders once its hour has gone", () => {
  const today = "2026-10-24";
  const window = { from: 15, to: 15 };

  // Quarter past four, for a run that was landing by half past three.
  // The stage is a tap somebody has to remember; the clock is not.
  assert.equal(
    windowGone({ hours: window, hourNow: 16, runDate: today, today }),
    true
  );

  // Two o'clock, still to come.
  assert.equal(
    windowGone({ hours: window, hourNow: 14, runDate: today, today }),
    false
  );

  // Tomorrow's run has not had its window whatever the hour is.
  assert.equal(
    windowGone({ hours: window, hourNow: 23, runDate: "2026-10-25", today }),
    false
  );

  // Yesterday's is gone whatever it says.
  assert.equal(
    windowGone({ hours: null, hourNow: 1, runDate: "2026-10-23", today }),
    true
  );

  // Nothing readable in the wording leaves the stage as the only answer:
  // a run nobody can time is better offered than wrongly shut.
  assert.equal(
    windowGone({ hours: null, hourNow: 23, runDate: today, today }),
    false
  );
});

test("a settled run is finished, whatever its stage says", () => {
  const run = { kind: "run", stage: "at_counter", status: "closed" };

  assert.equal(takingLastMinute({ ...run, settled_at: null }), true);

  // She ticked the bags off, confirmed the counter prices and pressed
  // Settle. The stage sat at "at the counter" because moving it on is a
  // different tap, and the front page went on selling the night.
  assert.equal(
    takingLastMinute({ ...run, settled_at: "2026-10-24T16:00:00Z" }),
    false
  );
});

test("a car before the run is a different trip, a car at its hour is not", () => {
  // The run lands between half past three and five.
  const runs = { "2026-10-25": 15 };
  const slots = [
    { date: "2026-10-25", hour: 12 },
    { date: "2026-10-25", hour: 13 },
    { date: "2026-10-25", hour: 14 },
    { date: "2026-10-25", hour: 15 },
    { date: "2026-10-25", hour: 17 },
  ];

  // Lunch is a trip she can make and be back from. Three o'clock and
  // after is the same drive, two and a half thousand naira dearer.
  assert.deepEqual(
    carsBeforeTheRun(slots, runs).map((one) => one.hour),
    [12, 13, 14]
  );

  // A day with no run keeps every hour it had.
  assert.equal(carsBeforeTheRun(slots, {}).length, slots.length);

  // A run whose wording held no readable hour counts as all day, so
  // nothing is offered beside it: one car fewer beats a trip nobody can
  // drive.
  assert.deepEqual(carsBeforeTheRun(slots, { "2026-10-25": 0 }), []);
});

test("picking a day: a run wins its day, a car fills the gaps", () => {
  // Sunday's run has closed, there is no Monday or Tuesday run, and the
  // next one is Wednesday. This is the evening that started all of it: a
  // lady wanted her food that night and was quietly given Wednesday.
  const runs = [
    { id: "wed", runDate: "2026-10-28" },
    { id: "thu", runDate: "2026-10-29" },
  ];
  const slots = [
    { at: "2026-10-25T18:00:00.000Z", date: "2026-10-25" },
    { at: "2026-10-25T19:00:00.000Z", date: "2026-10-25" },
    { at: "2026-10-26T12:00:00.000Z", date: "2026-10-26" },
    // The same night a run is going. The run gets there just as soon and
    // costs thousands less, so there is nothing to choose between them.
    { at: "2026-10-28T18:00:00.000Z", date: "2026-10-28" },
  ];

  const days = daysOnOffer({ runs, slots });

  assert.deepEqual(
    days.map((one) => [one.date, one.runId, one.at !== null]),
    [
      // Today, by car, because no run is left.
      ["2026-10-25", null, true],
      // Tomorrow, by car, because the week has no Monday run.
      ["2026-10-26", null, true],
      // Wednesday, on the run. The car window that night is not offered.
      ["2026-10-28", "wed", false],
      ["2026-10-29", "thu", false],
    ]
  );

  // The first window of a day is the one kept, not the last.
  assert.equal(days[0].at, "2026-10-25T18:00:00.000Z");
});

test("picking a day: the first run of a day wins it", () => {
  // An afternoon run and a night run on one Saturday. Runs arrive in
  // cut-off order, so the afternoon one comes first and is the earlier food.
  const days = daysOnOffer({
    runs: [
      { id: "afternoon", runDate: "2026-10-31" },
      { id: "night", runDate: "2026-10-31" },
    ],
    slots: [],
  });
  assert.deepEqual(days.map((one) => one.runId), ["afternoon"]);
});

test("picking a day: what a day is called", () => {
  const spell = (date: string) => `spelled ${date}`;
  assert.equal(daySaid("2026-10-25", "2026-10-25", spell), "Today");
  assert.equal(daySaid("2026-10-26", "2026-10-25", spell), "Tomorrow");
  assert.equal(daySaid("2026-10-28", "2026-10-25", spell), "spelled 2026-10-28");
  // Across a month end, where adding a day is the easiest thing to get wrong.
  assert.equal(daySaid("2026-11-01", "2026-10-31", spell), "Tomorrow");
  assert.equal(dayAfter("2026-12-31"), "2027-01-01");
  assert.equal(dayAfter("not a date"), "");
});

test("picking a day: putting the dropdown back where the page moved it", () => {
  const days = daysOnOffer({
    runs: [{ id: "wed", runDate: "2026-10-28" }],
    slots: [{ at: "2026-10-25T18:00:00.000Z", date: "2026-10-25" }],
  });

  // Soonest is what the page opens on, which here is today by car.
  assert.equal(soonestDay(days)?.date, "2026-10-25");

  // A car time selected elsewhere on the page finds its day.
  assert.equal(
    dayOfChoice(days, { runId: "wed", at: "2026-10-25T18:00:00.000Z" })?.date,
    "2026-10-25"
  );
  // And with no time set, the run does.
  assert.equal(dayOfChoice(days, { runId: "wed", at: "" })?.date, "2026-10-28");
  // A run that has closed under somebody matches nothing, rather than
  // leaving the dropdown pointing at a day that is no longer on offer.
  assert.equal(dayOfChoice(days, { runId: "gone", at: "" }), null);
  assert.equal(soonestDay([]), null);
});

test("picking a day: the page opens on today, then tomorrow", () => {
  const slots = [
    { at: "2026-10-25T18:00:00.000Z", date: "2026-10-25" },
    { at: "2026-10-26T12:00:00.000Z", date: "2026-10-26" },
  ];

  // A run three days out is cheaper, and it is still not the answer to
  // "when can I eat". Today goes first because today is on offer.
  assert.equal(
    soonestDay(daysOnOffer({ runs: [{ id: "wed", runDate: "2026-10-28" }], slots }))
      ?.date,
    "2026-10-25"
  );

  // Nothing today: tomorrow.
  assert.equal(
    soonestDay(
      daysOnOffer({
        runs: [{ id: "wed", runDate: "2026-10-28" }],
        slots: slots.filter((one) => one.date !== "2026-10-25"),
      })
    )?.date,
    "2026-10-26"
  );

  // Nothing either day: the next day something goes, which is the run.
  const far = soonestDay(
    daysOnOffer({ runs: [{ id: "wed", runDate: "2026-10-28" }], slots: [] })
  );
  assert.equal(far?.date, "2026-10-28");
  // And it opens on the run rather than on a time, which is what tells the
  // checkout to charge a run's fee.
  assert.equal(far?.runId, "wed");
  assert.equal(far?.at, null);
});

test("a car of its own only goes where it can go that day", () => {
  // Ajah takes a car, but only on the day the shop is already going that
  // way. Switched on without days, somebody could buy a Monday car to Ajah
  // that nobody was ever going to drive.
  const ajah = { id: "ajah", sameDay: true, sameDayDays: "6" };
  const lekki = { id: "lekki", sameDay: true, sameDayDays: "" };
  const ikoyi = { id: "ikoyi", sameDay: false, sameDayDays: "" };
  const home = { id: "", sameDay: false, sameDayDays: "" };

  const sat = "2026-10-31";
  const mon = "2026-10-26";

  assert.equal(carGoesOn([ajah], sat, opensOn), true);
  assert.equal(carGoesOn([ajah], mon, opensOn), false);

  // No days set is every day, so an area nobody has touched is unchanged.
  assert.equal(carGoesOn([lekki], mon, opensOn), true);

  // An area that cannot take a car at all is still no, whatever the day.
  assert.equal(carGoesOn([ikoyi], sat, opensOn), false);

  // One car fetches the whole cart, so the strictest area decides. Lekki
  // is fine on a Monday and Ajah is not, and they travel together.
  assert.equal(carGoesOn([lekki, ajah], mon, opensOn), false);
  assert.equal(carGoesOn([lekki, ajah], sat, opensOn), true);

  // Home is always drivable: the shop is in it.
  assert.equal(carGoesOn([home], mon, opensOn), true);
  assert.equal(carGoesOn([], mon, opensOn), true);
  // And home riding along with a far area does not rescue it.
  assert.equal(carGoesOn([home, ajah], mon, opensOn), false);
});

test("changing an order: whose it is to change", () => {
  const fine = { status: "pending", shares: 1, stillOpen: true };
  assert.equal(whyNotChangeable(fine), "");

  // Paid is the shop's job: what comes back is a refund, not a smaller sum.
  assert.match(whyNotChangeable({ ...fine, status: "paid" }), /paid for/);
  assert.match(whyNotChangeable({ ...fine, status: "delivered" }), /paid for/);

  // One car, several people, one fee between them. Moving one part moves
  // everybody's share, which is a conversation rather than a stepper.
  assert.match(whyNotChangeable({ ...fine, shares: 3 }), /shared delivery/);

  // Past the cut-off the food is bought.
  assert.match(whyNotChangeable({ ...fine, stillOpen: false }), /closed/);
});

test("changing an order: what the lines become", () => {
  const lines = [
    { id: "rice", qty: 1 },
    { id: "chicken", qty: 2 },
    { id: "drink", qty: 1 },
  ];

  // The case this was built for: one pack of rice becomes two.
  const two = applyWanted(lines, [{ lineId: "rice", qty: 2 }]);
  assert.deepEqual(two.keep.find((one) => one.id === "rice"), { id: "rice", qty: 2 });
  assert.deepEqual(two.drop, []);
  // Everything it was not asked about is left exactly as it was.
  assert.equal(two.keep.length, 3);
  assert.equal(two.keep.find((one) => one.id === "chicken")?.qty, 2);

  // Nought takes the line off.
  const gone = applyWanted(lines, [{ lineId: "drink", qty: 0 }]);
  assert.deepEqual(gone.drop, ["drink"]);
  assert.equal(gone.keep.length, 2);

  // A stuck thumb on a stepper does not order ninety packs of rice.
  assert.equal(
    applyWanted(lines, [{ lineId: "rice", qty: 900 }]).keep[0].qty,
    MOST_OF_ONE
  );
  // Nor does a number that is not one.
  assert.deepEqual(applyWanted(lines, [{ lineId: "rice", qty: NaN }]).drop, ["rice"]);
  assert.deepEqual(applyWanted(lines, [{ lineId: "rice", qty: -4 }]).drop, ["rice"]);
  // A half is a whole: half a pack of rice is not a thing anybody sells.
  assert.equal(applyWanted(lines, [{ lineId: "rice", qty: 2.7 }]).keep[0].qty, 2);

  // A line the order does not have is not invented.
  assert.equal(applyWanted(lines, [{ lineId: "nothing", qty: 5 }]).keep.length, 3);
});

test("changing an order: whether it is worth doing anything", () => {
  const lines = [
    { id: "rice", qty: 1 },
    { id: "chicken", qty: 2 },
  ];

  assert.equal(somethingChanged(lines, []), false);
  // The same numbers sent back is not a change, however it was typed.
  assert.equal(
    somethingChanged(lines, [{ lineId: "rice", qty: 1 }, { lineId: "chicken", qty: 2 }]),
    false
  );
  assert.equal(somethingChanged(lines, [{ lineId: "rice", qty: 2 }]), true);
  assert.equal(somethingChanged(lines, [{ lineId: "rice", qty: 0 }]), true);

  // Taking everything out is a cancellation, which lives somewhere else.
  assert.equal(emptiesIt(lines, [{ lineId: "rice", qty: 0 }]), false);
  assert.equal(
    emptiesIt(lines, [{ lineId: "rice", qty: 0 }, { lineId: "chicken", qty: 0 }]),
    true
  );
  assert.equal(emptiesIt([], []), false);
});

test("the chat knows when somebody is asking about their own order", () => {
  // The sentences people actually type.
  for (const said of [
    "where is my order",
    "Where is my order?",
    "wheres my food",
    "my order has not arrived",
    "my delivery is late",
    "can i track my order",
    "whats the status of my order",
    "my food hasnt arrived",
    "how far with my order",
    "i am still waiting for my order",
  ]) {
    assert.equal(botIntentOf(said), "mine", said);
  }

  // Questions about the shop, which already have written answers and must
  // not be turned into a sign-in.
  for (const said of [
    "where do you deliver",
    "how much is delivery",
    "what time do you deliver",
    "do you deliver to ikoyi",
  ]) {
    assert.notEqual(botIntentOf(said), "mine", said);
  }

  // "Where is my delivery" carries the word delivery, and is not a
  // question about what one costs.
  assert.equal(botIntentOf("where is my delivery"), "mine");
  assert.equal(botIntentOf("how much is delivery"), "fees");

  // Ordinary ordering is not this.
  assert.notEqual(botIntentOf("i want to order jollof"), "mine");
  assert.notEqual(botIntentOf("2 chicken pie"), "mine");
});

test("the chat answers questions about which days it delivers", () => {
  // Sunday 25 Oct. There is no Monday or Tuesday run, which is the week
  // that caused all of this.
  const today = "2026-10-25";
  const runs = [
    {
      said: "Wednesday, 28 Oct",
      runDate: "2026-10-28",
      window: "Between 5pm and 7pm",
      closes: "3:00 pm",
    },
    {
      said: "Thursday, 29 Oct",
      runDate: "2026-10-29",
      window: "Between 5pm and 7pm",
      closes: "4:30 pm",
    },
  ];
  // The window comes off the hours admin set for that day. Nobody picks a
  // time: they pick a day, and this is when it lands.
  const cars = [
    { date: "2026-10-25", window: "Between 4pm and 7pm" },
    { date: "2026-10-26", window: "Between 12pm and 3pm" },
  ];
  const money = (amount: number) => `N${amount}`;
  const shop = {
    runs,
    cars,
    today,
    feeFrom: 4000,
    carFrom: 6500,
    farther: ["Lekki", "Ajah", "Ikoyi"],
    money,
  };

  // Which day is being asked about.
  assert.equal(dayAsked("when is the next run"), "next");
  assert.equal(dayAsked("are you delivering today"), "today");
  assert.equal(dayAsked("can you deliver tomorrow"), "tomorrow");
  assert.deepEqual(dayAsked("do you deliver on saturday"), { weekday: 6 });
  assert.deepEqual(dayAsked("are you running mon"), { weekday: 1 });

  // Not every sentence with a day in it is this question.
  assert.equal(dayAsked("2 jollof rice"), null);
  assert.equal(dayAsked("where is my order today"), null);
  assert.equal(dayAsked("i want chicken today"), null);

  const next = sayWhen({ ...shop, asked: "next" });
  const now = sayWhen({ ...shop, asked: "today" });
  const wed = sayWhen({ ...shop, asked: { weekday: 3 } });
  const sat = sayWhen({ ...shop, asked: { weekday: 6 } });

  /*
   * Not one word of the shop's own vocabulary.
   *
   * Nobody at PAU knows what a run is, and nobody needs to: whether the
   * shop is already driving that evening or making the trip for one order
   * is the shop's business, and the only part the customer sees is the
   * price.
   */
  for (const said of [next, now, wed, sat]) {
    assert.ok(!/\brun\b/i.test(said), said);
    assert.ok(!/\bcar of its own\b/i.test(said), said);
    assert.ok(!/\bscheduled\b/i.test(said), said);
  }

  // Soonest first, and today beats a cheaper Wednesday: "when do you
  // deliver next" is a question about time.
  /*
   * A day the shop is not already driving reads exactly like one it is:
   * a window and a price. Nobody is asked to pick a time.
   */
  assert.match(now, /^Yes, today, between 4pm and 7pm\./);
  assert.match(now, /starts at N6500/);
  assert.ok(!/pick the time/.test(now), now);

  assert.match(next, /^We are delivering today, between 4pm and 7pm\./);

  // Wednesday is a day the shop is already driving: the window and the
  // cut-off, at the cheaper floor.
  assert.match(wed, /^Yes, on Wednesday, between 5pm and 7pm\./);
  assert.match(wed, /Orders close 3:00 pm/);
  assert.match(wed, /starts at N4000/);

  // A figure is never said as though it were the price everywhere.
  assert.match(wed, /more if the food comes from Lekki, Ajah or Ikoyi/);

  /*
   * A day with nothing on it says so, and nothing more.
   *
   * Saturday is past everything the shop has on, so there is nothing to
   * offer instead. Pointing at Wednesday here would be answering a
   * question about next weekend with a day that has already gone.
   */
  assert.equal(sat, "Not on Saturday, sorry.");

  // But where something IS going after the day they asked about, it is
  // offered rather than leaving them with a flat no.
  const mon = sayWhen({ ...shop, asked: { weekday: 1 }, cars: [] });
  assert.match(mon, /^Not tomorrow, sorry\./);
  assert.match(mon, /soonest is Wednesday, 28 Oct, between 5pm and 7pm/);

  // Nothing going at all is a sentence about the shop, not about a day.
  assert.equal(sayWhen({ ...shop, asked: "today", runs: [], cars: [] }), "");
  assert.equal(sayWhen({ ...shop, asked: null }), "");

  // A shop with no areas costing extra does not trail off into a comma.
  const plain = sayWhen({ ...shop, asked: { weekday: 3 }, farther: [] });
  assert.match(plain, /starts at N4000\.$/);

  // The window never reads as a label dropped into a sentence.
  for (const said of [next, now, wed, sat]) {
    assert.ok(!/ Between /.test(said), said);
  }
});

test("the chat counts days the way a calendar does", () => {
  assert.equal(dayAfter("2026-10-31"), "2026-11-01");
  assert.equal(dayAfter("2026-12-31"), "2027-01-01");
  assert.equal(dayAfter("not a date"), "");

  // Sunday 25 Oct 2026. Asking for Sunday is today, not next week.
  assert.equal(nextOn(0, "2026-10-25"), "2026-10-25");
  assert.equal(nextOn(1, "2026-10-25"), "2026-10-26");
  assert.equal(nextOn(6, "2026-10-25"), "2026-10-31");
});

test("asking whether a kitchen is on gets a yes and the next question", () => {
  const kitchens = [
    { id: "d", name: "Domino's Pizza" },
    { id: "c", name: "Chicken Republic" },
    { id: "b", name: "Burger King" },
  ];
  const asked = (said: string) => botKitchenAsked(said, kitchens);

  // The question this exists for, in the shapes people type it.
  assert.equal(asked("can i order from dominos")?.id, "d");
  assert.equal(asked("Can I order from Domino's?")?.id, "d");
  assert.equal(asked("do you have chicken republic")?.id, "c");
  assert.equal(asked("is burger king available")?.id, "b");
  assert.equal(asked("do you deliver from dominos")?.id, "d");

  /*
   * An order is not an enquiry.
   *
   * "2 dodo pizza" names a kitchen and is somebody ordering. Sent here it
   * would be answered with "yes, what would you like", and they would
   * have to type it a second time.
   */
  assert.equal(asked("2 dominos pizza"), null);
  assert.equal(asked("two chicken republic wraps"), null);
  assert.equal(asked("dominos pepperoni"), null);

  // Two kitchens is a comparison, which is a different conversation.
  assert.equal(asked("dominos or burger king?"), null);

  // Nothing named, nothing to answer.
  assert.equal(asked("can i order"), null);
  assert.equal(asked("can i order from pizza hut"), null);
  assert.equal(botKitchenAsked("can i order from dominos", []), null);
});

test("a place we do not buy from is named back, not searched as a dish", () => {
  // The question, and the name to say back to them.
  assert.equal(botPlaceAsked("can i order from pizza hut"), "pizza hut");
  assert.equal(botPlaceAsked("Can I order from KFC?"), "kfc");
  assert.equal(botPlaceAsked("do you deliver from shoprite"), "shoprite");
  assert.equal(botPlaceAsked("can you get me something from the mall"), "the mall");

  // Not a place: ourselves, or nothing worth saying back.
  assert.equal(botPlaceAsked("can i order from you"), "");
  assert.equal(botPlaceAsked("can i order"), "");

  // Not an ordering question at all. "From" is in half of everything.
  assert.equal(botPlaceAsked("is the chicken from today"), "");
  assert.equal(botPlaceAsked("where are you"), "");

  // Fillers do not end up in the name read back to them.
  assert.equal(botPlaceAsked("can i order from kfc today please"), "kfc");
});

test("a misspelled kitchen is still ours, and is never offered as a favour", () => {
  const kitchens = [
    { id: "d", name: "Domino's Pizza" },
    { id: "c", name: "Chicken Republic" },
    { id: "k", name: "Krispy Kreme" },
    { id: "b", name: "Burger King" },
  ];

  /*
   * The thing that would be worst to get wrong.
   *
   * Somebody types "Domino" and is told we do not buy from them and
   * offered to have it fetched as a favour, when it is on the menu. Every
   * one of these has to come back as ours.
   */
  for (const said of [
    "can i order from domino",
    "can i order from dominos",
    "can i order from dominoes",
    "can i order from Domino's",
    "do you have chiken republic",
    "can i order from krispy kream",
    "do you have burgerking",
    "do you deliver from burger kings",
  ]) {
    assert.ok(botKitchenAsked(said, kitchens) !== null, said);
  }

  // And a place that really is not ours comes back as one, so the chat
  // can offer to go and buy it rather than searching the sentence.
  for (const said of ["can i order from pizza hut", "do you deliver from kfc"]) {
    assert.equal(botKitchenAsked(said, kitchens), null, said);
    assert.notEqual(botPlaceAsked(said), "", said);
  }
});

test("what to suggest instead is about the same food, not the first four", () => {
  // What each one sells, as it is tagged in admin.
  const TAGS: Record<string, string> = {
    "Burger King": "burger, chicken",
    "Chicken Republic": "chicken, burger",
    "Cold Stone Creamery": "ice cream",
    "Dodo Pizza": "pizza",
    "Domino's Pizza": "pizza, ice cream",
    KFC: "chicken, burger",
    "Krispy Kreme": "doughnut, coffee",
    Panarottis: "pizza",
    "Scoop'd Ice Cream": "ice cream",
  };

  // The shop's real counters, names and all.
  const kitchens = [
    "Burger King",
    "Chicken Republic",
    "Cold Stone Creamery",
    "Custom order",
    "DO Bowls",
    "Dodo Pizza",
    "Domino's Pizza",
    "KFC",
    "Krispy Kreme",
    "Local Market",
    "Market Square",
    "Panarottis",
    "Pharmacy",
    "Scoop'd Ice Cream",
    "Skincare",
    "Sudu Shop",
  ].map((name, at) => ({ id: String(at), name, tags: TAGS[name] ?? "" }));
  const names = (place: string) =>
    botInsteadOf(place, kitchens).map((one) => one.name);

  // Pizza Hut is pizza, and all three of ours are offered. Panarottis has
  // no pizza in its name, which is why the short list of names exists.
  assert.deepEqual(names("pizza hut"), [
    "Dodo Pizza",
    "Domino's Pizza",
    "Panarottis",
  ]);

  /*
   * What a counter sells is tagged, not guessed from its name.
   *
   * No name could ever say that Burger King does chicken or that
   * Domino's has an ice cream section, and Panarottis says nothing about
   * pizza. Asked about KFC, all three chicken places come back.
   */
  assert.deepEqual(names("mcdonalds"), [
    "Burger King",
    "Chicken Republic",
    "KFC",
  ]);
  assert.deepEqual(names("an ice cream place"), [
    "Cold Stone Creamery",
    "Domino's Pizza",
    "Scoop'd Ice Cream",
  ]);

  // An untagged counter still answers off its name, so one added tonight
  // and tagged tomorrow is not invisible in between.
  assert.deepEqual(
    botInsteadOf("pizza hut", [{ id: "x", name: "Mama's Pizza" }]).map(
      (one) => one.name
    ),
    ["Mama's Pizza"]
  );

  /*
   * Never a counter that is not a restaurant.
   *
   * Custom order is a real row and the holder for things we go and buy,
   * so offering it here would answer "can I order from Pizza Hut" with
   * "you could order from Custom order". The shop's shelf, the markets,
   * the pharmacy and skincare are the same kind of wrong.
   */
  for (const place of ["pizza hut", "mcdonalds", "somewhere nobody knows"]) {
    const said = names(place);
    for (const no of [
      "Custom order",
      "Sudu Shop",
      "Local Market",
      "Market Square",
      "Pharmacy",
      "Skincare",
    ]) {
      assert.ok(!said.includes(no), `${place} offered ${no}`);
    }
  }

  // Where the kind is not clear, a few restaurants, capped.
  assert.equal(names("that place by the gate").length, 4);

  // The kind itself, read off a name.
  assert.equal(botKindOf("Pizza Hut"), "pizza");
  assert.equal(botKindOf("Panarottis"), "pizza");
  assert.equal(botKindOf("Scoop'd Ice Cream"), "ice cream");
  assert.equal(botKindOf("Sudu Shop"), "");

  // A shop with nothing but shelves suggests nobody rather than a stall.
  assert.deepEqual(botInsteadOf("pizza hut", [{ id: "s", name: "Sudu Shop" }]), []);
});

test("a shelf page says which shelf it is, and only a real one", () => {
  const facets = {
    shelves: [{ name: "Cleansers" }, { name: "Korean Skin Care" }],
    brands: [{ name: "CeraVe" }],
  };
  const seo = (asked: Record<string, string>) =>
    shelfSeo({ path: "/skincare", shopName: "Skincare", asked, facets });

  // The bare counter keeps the card its layout writes.
  assert.equal(seo({}).title, null);
  assert.equal(seo({}).canonical, "/skincare");

  // A real shelf is a page of its own, and says so.
  const cleansers = seo({ shelf: "Cleansers" });
  assert.equal(cleansers.canonical, "/skincare?shelf=Cleansers");
  assert.ok(cleansers.title?.startsWith("Cleansers"));
  assert.equal(cleansers.noindex, false);

  // Spelled however they typed it, answered as the shop spells it.
  assert.equal(seo({ shelf: "cleansers" }).canonical, "/skincare?shelf=Cleansers");

  // A space in the name survives the round trip.
  assert.equal(
    seo({ shelf: "Korean Skin Care" }).canonical,
    "/skincare?shelf=Korean%20Skin%20Care"
  );

  // A brand is the half people search for, so it wins over the shelf.
  assert.equal(
    seo({ shelf: "Cleansers", brand: "CeraVe" }).canonical,
    "/skincare?brand=CeraVe"
  );

  // A shelf nobody has: the same page, not a page of its own.
  assert.equal(seo({ shelf: "Nonsense" }).canonical, "/skincare");

  // Sorting and paging are the same shelf in a different order.
  assert.equal(
    seo({ shelf: "Cleansers", sort: "cheap", page: "3" }).canonical,
    "/skincare?shelf=Cleansers"
  );
  assert.equal(seo({ sort: "cheap" }).canonical, "/skincare");

  // A search somebody typed is never a page worth listing.
  const searched = seo({ q: "cerave" });
  assert.equal(searched.noindex, true);
  assert.equal(searched.canonical, "/skincare");
});

test("easter lands where the almanac says", () => {
  // Three years from three different centuries' rules, so a transcription
  // slip in the computus shows up rather than hiding in one of them.
  assert.equal(easterSunday(2026), "2026-04-05");
  assert.equal(easterSunday(2027), "2027-03-28");
  assert.equal(easterSunday(2030), "2030-04-21");
});

test("mothering sunday is three weeks before easter", () => {
  assert.equal(motheringSunday(2027), "2027-03-07");
  assert.equal(mothersDayMay(2027), "2027-05-09");
});

test("a feast page is about the next one, not the one that has been", () => {
  // The day itself still counts: somebody ordering on the morning of the
  // 14th wants that day, not next year's.
  assert.equal(nextOf(valentines, "2027-02-14"), "2027-02-14");
  assert.equal(nextOf(valentines, "2027-02-15"), "2028-02-14");
  assert.equal(nextOf(valentines, "2026-10-28"), "2027-02-14");
});

test("a car is only offered when it is properly sooner than the run", () => {
  // The case that started this: an hour earlier, for more money.
  assert.equal(worthACar("between 5pm and 7pm", "between 4pm and 7pm"), false);
  // Lunchtime against an evening run, which is the whole point of a car.
  assert.equal(worthACar("between 5pm and 7pm", "between 12pm and 3pm"), true);
  assert.equal(worthACar("between 5pm and 7pm", "between 3pm and 5pm"), true);
  // No sooner at all, or later.
  assert.equal(worthACar("between 5pm and 7pm", "between 5pm and 7pm"), false);
  assert.equal(worthACar("between 4pm and 6pm", "between 6pm and 8pm"), false);
  // Written in some way this cannot read: offer it rather than silently
  // taking the choice away.
  assert.equal(worthACar("tonight", "between 12pm and 3pm"), true);
  assert.equal(worthACar("between 5pm and 7pm", "ask us"), true);
});

test("a window says when it starts", () => {
  assert.equal(windowStart("between 12pm and 3pm"), 12);
  assert.equal(windowStart("Between 4:30pm and 6pm"), 16.5);
  assert.equal(windowStart("between 9am and 11am"), 9);
  assert.equal(windowStart("sometime"), null);
});

test("the other way is only offered when it is worth taking", () => {
  const run = {
    runId: "r1",
    at: "",
    when: "Between 5pm and 7pm, today",
    said: "between 5pm and 7pm today",
    onARun: true,
  };
  const carJustEarlier = {
    runId: "",
    at: "x",
    when: "Between 4pm and 7pm, today",
    said: "between 4pm and 7pm today",
    onARun: false,
  };
  const carMuchEarlier = { ...carJustEarlier, when: "Between 12pm and 3pm, today" };

  // An hour, for a dearer trip: not worth saying.
  assert.equal(otherWorthSaying(run, carJustEarlier), null);
  // Lunch at lunchtime against an evening run: say it.
  assert.equal(otherWorthSaying(run, carMuchEarlier), carMuchEarlier);
  // The cheaper way is always worth saying, whatever the hours.
  assert.equal(otherWorthSaying(carJustEarlier, run), run);
  // Nothing to offer, or the same thing twice.
  assert.equal(otherWorthSaying(run, null), null);
  assert.equal(otherWorthSaying(run, { ...carMuchEarlier, said: run.said }), null);
});
