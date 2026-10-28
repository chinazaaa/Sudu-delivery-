import { db } from "./supabase";
import { priceLines, type PricedLine } from "./orders";
import { openBatches } from "./batches";
import { clockLabel, runDateLabel } from "./time";
import { SLOT_LABEL } from "./config";
import { cartOf, isTimed, type Box, type BoxLine, type Occasion } from "./boxes";

/** How far ahead a box looks. A games night really is planned a fortnight
 *  out, which is further than the shop offers for an ordinary dinner. */
export const BOX_DAYS = 14;

/**
 * One way of getting a box here, with what it costs that way.
 *
 * Always a run. A box used to be offered a car of its own as well, at a
 * second price, and nobody took it: a box is planned food, and somebody
 * who planned their food is not in the hurry that a car is for. The field
 * stays because an order still records which it was.
 */
export type WhenOption = {
  /** What a form sends back to say which one they picked. */
  key: string;
  runId: string;
  at: string;
  date: string;
  /** "Saturday, 26 Sept" */
  day: string;
  /** "between 12pm and 3pm" */
  window: string;
  onARun: boolean;
  fee: number;
};

export type BoxLineView = {
  id: string;
  name: string;
  restaurant: string;
  choices: string[];
  qty: number;
  total: number;
  /** Three at most, chosen by the shop. Not the menu: the moment a box can
   *  be anything it is a menu again. */
  swaps: { name: string; restaurant: string; choices: string[]; delta: number }[];
};

export type BoxView = {
  id: string;
  name: string;
  blurb: string;
  serves: string;
  imageUrl: string;
  isExtra: boolean;
  lines: BoxLineView[];
  /** What is in it, written out, where it is sold as one package. Empty on
   *  every other box, which lists its lines instead. */
  contents: string[];
  /** What the food comes to as the shop packed it. A swap moves it by its
   *  own delta, which the page can do without asking the server again. */
  food: number;
  runFee: number;
  carFee: number;
  /** What to suggest when this box's "want it changed?" is empty. */
  customHint: string;
};

/**
 * A box drawn out, priced off the menu as it is right now.
 *
 * Never off a number somebody typed when the box was made. A Domino's price
 * rise in October would otherwise have the shop selling at a loss without
 * anybody noticing.
 */
export async function boxView(box: Box): Promise<BoxView | null> {
  return (await boxViews([box]))[0] ?? null;
}

/**
 * Several boxes at once.
 *
 * One occasion is three boxes and each box used to cost three round trips
 * to a database in London, which is nine on a page that draws three cards.
 * Every box on a page is priced off the same menu, so they are asked for
 * together and cut apart here.
 */
export async function boxViews(boxes: Box[]): Promise<BoxView[]> {
  if (boxes.length === 0) return [];

  // A swap that points at an item which no longer exists must cost that one
  // swap and nothing more. It used to cost the entire shelf: swaps are
  // priced alongside the box, one missing item failed the whole pricing
  // call, and every box on the page came back empty under "Nothing is packed
  // for this one yet". A shelf with five boxes on it said the shop had
  // nothing, because one alternative flavour had been deleted.
  const alive = await livingItems(
    boxes.flatMap((box) => box.lines.flatMap((line) => line.swaps.map((s) => s.menu_item_id)))
  );

  const asked = boxes.map((box) => {
    const wanted = cartOf(box);
    const swapCarts = box.lines.flatMap((line) =>
      line.swaps
        .filter((swap) => alive.has(swap.menu_item_id))
        .map((swap) => ({
          menu_item_id: swap.menu_item_id,
          option_ids: swap.option_ids,
          qty: 1,
        }))
    );
    return {
      box: {
        ...box,
        lines: box.lines.map((line) => ({
          ...line,
          swaps: line.swaps.filter((swap) => alive.has(swap.menu_item_id)),
        })),
      },
      wanted,
      swapCarts,
    };
  });

  const priced = await priceLines(asked.flatMap((one) => [...one.wanted, ...one.swapCarts]));
  if ("error" in priced) {
    // Said out loud rather than swallowed. An empty shelf and a shelf the
    // shop could not price look identical from the outside, and the last
    // time these were told apart it was by reading the database by hand.
    console.error("boxViews could not price a shelf:", priced.error);
    return [];
  }

  const names = await restaurantNames(
    priced.lines.map((one) => one.item.restaurant_id)
  );

  const views: BoxView[] = [];
  let cursor = 0;
  for (const { box, wanted, swapCarts } of asked) {
    const packed = priced.lines.slice(cursor, cursor + wanted.length);
    cursor += wanted.length;
    const swapped = priced.lines.slice(cursor, cursor + swapCarts.length);
    cursor += swapCarts.length;

    const view = one(box, packed, swapped, names);
    if (view) views.push(view);
  }
  // Cheapest first, dearest last, whatever order they were typed in. A
  // shelf is a ladder and somebody reads it from the bottom rung: a N35,000
  // box sitting under a N60,000 one reads as a mistake, and worse, it hides
  // the cheap way in from the person who needed it.
  //
  // Sorted on the price rather than on a stored position, because the price
  // is worked out off today's menu. A box that gets dearer moves up the
  // shelf by itself, and nobody has to remember to drag it.
  //
  // Extras keep to the end regardless. They ride along with a box rather
  // than being one, so a N2,100 box of doughnuts is not the first rung.
  return views.sort((a, b) => {
    if (a.isExtra !== b.isExtra) return a.isExtra ? 1 : -1;
    return a.food + a.runFee - (b.food + b.runFee);
  });
}

function one(
  box: Box,
  packed: PricedLine[],
  swapped: PricedLine[],
  names: Map<string, string>
): BoxView | null {
  let at = 0;
  const lines: BoxLineView[] = box.lines.map((line, index) => {
    const here = packed[index];
    const mine = swapped.slice(at, at + line.swaps.length);
    at += line.swaps.length;

    return {
      id: line.id,
      // What the shop called this line, where it called it anything. A box
      // offering any large pizza should say that, not name the one pizza
      // the price happens to be taken from.
      name: line.as || here.item.name,
      // The kitchen goes with the name: "any large pizza" is still only
      // from one of them, and which one is the thing somebody checks.
      restaurant: names.get(here.item.restaurant_id) ?? "",
      choices: here.options.map((one) => one.name),
      qty: line.qty,
      total: here.unitPrice * line.qty,
      swaps: mine.map((one) => ({
        name: one.item.name,
        restaurant: names.get(one.item.restaurant_id) ?? "",
        choices: one.options.map((option) => option.name),
        // Per unit and times the quantity, because swapping one of two
        // pizzas swaps both: a box is one decision, not a per-slice one.
        delta: (one.unitPrice - here.unitPrice) * line.qty,
      })),
    };
  });

  return {
    id: box.id,
    name: box.name,
    blurb: box.blurb,
    serves: box.serves,
    imageUrl: box.image_url,
    isExtra: box.is_extra,
    lines,
    contents: box.contents,
    food: lines.reduce((sum, line) => sum + line.total, 0),
    runFee: box.run_fee,
    carFee: box.car_fee,
    customHint: box.custom_hint,
  };
}

/**
 * Which of these items are still on the menu at all.
 *
 * Asked before pricing rather than discovered during it, because the pricing
 * call is all or nothing and a box is not worth failing over an alternative
 * nobody picked.
 */
async function livingItems(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Set();
  const { data, error } = await db()
    .from("menu_items")
    .select("id, available")
    .in("id", unique);
  // A database that cannot answer must not silently strip every swap, so the
  // benefit of the doubt goes to the swap and pricing decides.
  if (error) return new Set(unique);

  // Sold out counts as gone, not only deleted.
  //
  // This asked whether the row existed and nothing else, which is a
  // different question from whether it can be bought today. A swap pointing
  // at something ticked unavailable in admin sailed through here, went to
  // the pricing call with the box, and the pricing call quite correctly
  // refused the lot: "Margherita is unavailable today". boxViews turns an
  // error into no boxes at all, so one sold-out alternative flavour emptied
  // an entire shelf, and the Food boxes page said the shop had nothing.
  //
  // It is the same bug the comment above this function describes being
  // fixed once already. That fix only covered the deleted ones.
  return new Set(
    (data ?? [])
      .filter((row: any) => row.available !== false)
      .map((row: any) => row.id as string)
  );
}

async function restaurantNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await db().from("restaurants").select("id, name").in("id", unique);
  return new Map((data ?? []).map((row: any) => [row.id as string, row.name as string]));
}

/**
 * Every way this box could get to them, soonest first.
 *
 * Only things the shop has actually agreed to: runs that exist. Offering a
 * Tuesday nobody is going to drive is worse than not mentioning Tuesday,
 * and a box in a car of its own is one of those: it is not offered.
 *
 * A timed occasion narrows this to one row and then to none, because a match
 * has a whistle and nothing after it is any use.
 */
export async function whenOptions(
  occasion: Occasion,
  box: Box,
  now: Date = new Date()
): Promise<WhenOption[]> {
  // Far enough to reach the thing itself. A fortnight is right for a games
  // night nobody has dated yet, and wrong for a match three weeks out that
  // already has a run under it: the horizon would hide the very run the
  // occasion was pinned to.
  const days = isTimed(occasion)
    ? Math.max(
        BOX_DAYS,
        Math.ceil(
          (new Date(occasion.happens_at ?? "").getTime() - now.getTime()) / 86_400_000
        ) + 1
      )
    : BOX_DAYS;

  const runs = (await openBatches(days)).filter((one) => !one.full);

  const onRuns: WhenOption[] = runs.map((run) => ({
    key: `run:${run.id}`,
    runId: run.id,
    at: "",
    date: run.run_date,
    day: runDateLabel(run.run_date),
    window: run.delivery_window_text || SLOT_LABEL[run.slot],
    onARun: true,
    fee: box.run_fee,
  }));

  if (!isTimed(occasion)) {
    return onRuns.sort(byWhen);
  }

  // A time everybody shares. It rides the run the shop put the occasion on,
  // up to the cut-off, and after that there is nothing, said plainly: a box
  // is not sent in a car of its own.
  const happens = new Date(occasion.happens_at ?? "").getTime();
  const closes = new Date(occasion.closes_at ?? "").getTime();

  if (Number.isFinite(closes) && now.getTime() < closes) {
    /*
     * Nothing pinned is not the same as nothing going.
     *
     * Pinning a run to an occasion is what a match needs: there is one car
     * that gets there before the whistle and the rest are no use. A date
     * three weeks out is a different shape. Matriculation is on the 7th,
     * ordering was open until the evening of the 6th, every run between
     * now and then could carry it, and the page said "Nothing can get
     * there in time any more. Everything on the menu is still going out
     * though" with its own shelf full of boxes underneath.
     *
     * So an unpinned occasion offers every run that lands by the day
     * itself. The shop's own cut-off is the fence, and it is already set
     * to the evening before.
     */
    const pinned = onRuns.find((one) => one.runId === occasion.batch_id);
    if (!pinned && occasion.batch_id === null) {
      const day = (occasion.happens_at ?? "").slice(0, 10);
      const inTime =
        day === "" ? onRuns : onRuns.filter((one) => one.date <= day);
      return inTime.sort(byWhen);
    }
    if (pinned) {
      // Said against the whistle rather than as a window.
      //
      // The run's own wording is right for a run: "between 3:30pm and
      // 5:30pm" is what the shop promises anybody ordering dinner. On a
      // match it reads as a risk, because half of that window is after
      // kick-off, and somebody buying food for a 4:30 match should not have
      // to work out whether 5:30 counts. This run is the one the shop put
      // the occasion on, so it is the run that gets there in time; what was
      // missing was saying so. A collection has no whistle and keeps the
      // window it always had.
      return [
        {
          ...pinned,
          window: Number.isFinite(happens)
            ? `Before ${occasion.when_word}, ${clockLabel(occasion.happens_at ?? "")}`
            : pinned.window,
        },
      ];
    }
  }

  return [];
}

const byWhen = (a: WhenOption, b: WhenOption): number =>
  (a.date === b.date ? (a.onARun ? -1 : 1) : a.date < b.date ? -1 : 1);

/**
 * What the cheapest box on each occasion comes to, delivery in it.
 *
 * The list page lives or dies on this number. "Games night" is a category;
 * "Games night, from ₦32,900 with delivery" is an offer, and the difference
 * is whether anybody taps.
 *
 * Worked out in two queries for the whole page rather than by pricing every
 * box properly, because a list does not need swaps, restaurants or choices,
 * and asking for them would put a round trip on every card.
 */
export async function cheapestBoxes(
  boxes: { id: string; occasion_id: string; run_fee: number; is_extra: boolean; lines: BoxLine[] }[]
): Promise<Map<string, number>> {
  const meals = boxes.filter((one) => !one.is_extra && one.lines.length > 0);
  if (meals.length === 0) return new Map();

  const itemIds = [...new Set(meals.flatMap((b) => b.lines.map((l) => l.menu_item_id)))];
  const optionIds = [...new Set(meals.flatMap((b) => b.lines.flatMap((l) => l.option_ids)))];

  const [items, options] = await Promise.all([
    db().from("menu_items").select("id, price_food, available").in("id", itemIds),
    optionIds.length > 0
      ? db().from("item_options").select("id, price_delta").in("id", optionIds)
      : Promise.resolve({ data: [] as { id: string; price_delta: number }[] }),
  ]);

  const price = new Map(
    (items.data ?? []).map((row: any) => [row.id as string, Number(row.price_food ?? 0)])
  );
  const gone = new Set(
    (items.data ?? []).filter((row: any) => row.available === false).map((row: any) => row.id as string)
  );
  const delta = new Map(
    (options.data ?? []).map((row: any) => [row.id as string, Number(row.price_delta ?? 0)])
  );

  const cheapest = new Map<string, number>();
  for (const box of meals) {
    // A box with something off the menu in it is not a price anybody can be
    // quoted, so it is left out of the "from" rather than quoted wrong.
    if (box.lines.some((line) => gone.has(line.menu_item_id) || !price.has(line.menu_item_id))) {
      continue;
    }

    const food = box.lines.reduce(
      (sum, line) =>
        sum +
        line.qty *
          ((price.get(line.menu_item_id) ?? 0) +
            line.option_ids.reduce((on: number, id: string) => on + (delta.get(id) ?? 0), 0)),
      0
    );

    const total = food + box.run_fee;
    const now = cheapest.get(box.occasion_id);
    if (now === undefined || total < now) cheapest.set(box.occasion_id, total);
  }
  return cheapest;
}
