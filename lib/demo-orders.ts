import { key } from "./pricing";
import type { ChangeLineData, SwapTarget } from "./change-data";
import type { OptionGroupView } from "./view";

/**
 * Sample orders for the demo pages.
 *
 * Nothing here is read from or written to the shop. The shapes are the real
 * ones (a pizza asking size and crust, a combo asking a drink, a half and
 * half priced by its halves), and the figures are sample ones, so somebody
 * can press every button and see what a customer would see.
 */
export type DemoOrder = {
  slug: string;
  title: string;
  blurb: string;
  total: number;
  lines: ChangeLineData[];
};

let n = 0;
const id = (prefix: string) => `${prefix}-${(n += 1)}`;

const opt = (name: string, priceDelta = 0, available = true) => ({
  id: id("o"),
  name,
  priceDelta,
  available,
});

const group = (
  name: string,
  options: ReturnType<typeof opt>[],
  required = true,
  maxSelect = 1
): OptionGroupView => ({ id: id("g"), name, required, maxSelect, options });

/* ------------------------------ Domino's ------------------------------ */

const SIZE = ["Medium 12\"", "Large 14\"", "Chairman 16\""];
const crust = () => group("Crust", [opt("Hand Tossed"), opt("Thin Crust")]);
const dominosPizza = (name: string, base: number, large: number, chairman: number): SwapTarget => ({
  id: id("item"),
  name,
  base,
  groups: [
    group("Size", [opt(SIZE[0]), opt(SIZE[1], large), opt(SIZE[2], chairman)]),
    crust(),
  ],
});

const pizzas = [
  dominosPizza("Margherita", 10900, 5050, 14700),
  dominosPizza("Pepperoni", 11300, 5050, 14450),
  dominosPizza("BBQ Chicken", 11850, 5150, 15500),
  dominosPizza("Chicken Supreme", 11850, 5150, 15500),
  dominosPizza("Extravaganza", 12400, 6550, 17600),
  dominosPizza("Veggie Supreme", 10900, 5050, 14700),
];

/** A half is the real pizza at the size asked, so its price follows the menu. */
const half = (name: string, target: SwapTarget) => ({
  ...opt(name),
  asItem: {
    base: target.base,
    delta: {
      [key("Size", SIZE[0])]: 0,
      [key("Size", SIZE[1])]: target.groups[0].options[1].priceDelta,
      [key("Size", SIZE[2])]: target.groups[0].options[2].priceDelta,
    },
  },
});

const halfGroup = (title: string) =>
  ({
    id: id("g"),
    name: title,
    required: true,
    maxSelect: 1,
    dearest: true,
    options: pizzas.map((one) => half(one.name, one)),
  }) as OptionGroupView;

function halfAndHalf(): ChangeLineData {
  const sizeGroup = group("Size", [opt(SIZE[0]), opt(SIZE[1]), opt(SIZE[2])]);
  const first = halfGroup("First half");
  const second = halfGroup("Second half");
  const crustGroup = crust();
  const pick = (g: OptionGroupView, name: string) => g.options.find((o) => o.name === name)!.id;
  return {
    id: id("line"),
    itemId: id("item"),
    name: "Half & Half",
    restaurant: "Domino's Pizza",
    qty: 1,
    unitPrice: 11850,
    choices: "Medium 12\", Hand Tossed, BBQ Chicken, Chicken Supreme",
    base: 9900,
    chosenIds: [
      sizeGroup.options[0].id,
      crustGroup.options[0].id,
      pick(first, "BBQ Chicken"),
      pick(second, "Chicken Supreme"),
    ],
    groups: [sizeGroup, crustGroup, first, second],
    category: "Pizzas",
    swaps: pizzas,
  };
}

function plainPizza(name: string, size: number, crustAt: number, qty = 1): ChangeLineData {
  const target = pizzas.find((one) => one.name === name)!;
  const sizeGroup = group("Size", [
    opt(SIZE[0]),
    opt(SIZE[1], target.groups[0].options[1].priceDelta),
    opt(SIZE[2], target.groups[0].options[2].priceDelta),
  ]);
  const crustGroup = crust();
  const add = sizeGroup.options[size].priceDelta;
  return {
    id: id("line"),
    itemId: target.id,
    name,
    restaurant: "Domino's Pizza",
    qty,
    unitPrice: target.base + add,
    choices: `${SIZE[size]}, ${crustGroup.options[crustAt].name}`,
    base: target.base,
    chosenIds: [sizeGroup.options[size].id, crustGroup.options[crustAt].id],
    groups: [sizeGroup, crustGroup],
    category: "Pizzas",
    swaps: pizzas.filter((one) => one.name !== name),
  };
}

const drinkTargets = (names: string[], price = 1050): SwapTarget[] =>
  names.map((name) => ({ id: id("item"), name, base: price, groups: [] }));

function drink(name: string, restaurant: string, price: number, qty: number, pool: string[]): ChangeLineData {
  return {
    id: id("line"),
    itemId: id("item"),
    name,
    restaurant,
    qty,
    unitPrice: price,
    choices: "",
    base: price,
    chosenIds: [],
    groups: [],
    category: "Drinks",
    swaps: drinkTargets(pool.filter((one) => one !== name), price),
  };
}

/* --------------------------- Chicken Republic --------------------------- */

const DRINKS = ["Pepsi", "Coke", "Fanta", "Sprite", "7UP", "Mirinda", "Teem", "Malt (+₦300)"];

function crCombo(name: string, base: number, qty = 1): ChangeLineData {
  const sizeGroup = group("Size", [opt("Regular"), opt("Large", 1200)]);
  const drinkGroup = group(
    "Drink",
    DRINKS.map((one, at) => opt(one, at === DRINKS.length - 1 ? 300 : 0))
  );
  const sideGroup = group("Side", [opt("Jollof rice"), opt("Fried rice"), opt("Chips"), opt("Coleslaw")]);
  return {
    id: id("line"),
    itemId: id("item"),
    name,
    restaurant: "Chicken Republic",
    qty,
    unitPrice: base,
    choices: "Regular, Pepsi, Jollof rice",
    base,
    chosenIds: [sizeGroup.options[0].id, drinkGroup.options[0].id, sideGroup.options[0].id],
    groups: [sizeGroup, drinkGroup, sideGroup],
    category: "Citizens meals",
    swaps: [],
  };
}

function crWings(): ChangeLineData {
  const spice = group("Spice", [opt("Mild"), opt("Hot"), opt("Extra hot")]);
  return {
    id: id("line"),
    itemId: id("item"),
    name: "Spicy Chicken Wings (6 pcs)",
    restaurant: "Chicken Republic",
    qty: 1,
    unitPrice: 4300,
    choices: "Hot",
    base: 4300,
    chosenIds: [spice.options[1].id],
    groups: [spice],
    category: "Fried chicken",
    swaps: [],
  };
}

/* --------------------------------- KFC --------------------------------- */

function kfcStreetwise(): ChangeLineData {
  const chicken = group("Chicken", [opt("Hot & Crispy"), opt("Original Recipe")]);
  const side = group("Side", [opt("Rice"), opt("Fries"), opt("Coleslaw"), opt("Beans")]);
  const drink1 = group("Drink 1", [opt("Pepsi"), opt("7UP")]);
  const drink2 = group("Drink 2", [opt("Pepsi"), opt("7UP")]);
  return {
    id: id("line"),
    itemId: id("item"),
    name: "Streetwise 2 Combo",
    restaurant: "KFC",
    qty: 1,
    unitPrice: 6900,
    choices: "Hot & Crispy, Rice, Pepsi, 7UP",
    base: 6900,
    chosenIds: [chicken.options[0].id, side.options[0].id, drink1.options[0].id, drink2.options[1].id],
    groups: [chicken, side, drink1, drink2],
    category: "Deal",
    swaps: [],
  };
}

/* ------------------------------ Cold Stone ------------------------------ */

function coldStone(): ChangeLineData {
  const cup = group("Cup size", [opt("Like it", 0), opt("Love it", 1800), opt("Gotta have it", 3600)]);
  const toppings = group(
    "Toppings",
    ["Oreo", "Brownie bites", "Sprinkles", "Caramel", "Strawberries", "Peanuts", "Chocolate chips", "Marshmallow"].map(
      (one) => opt(one, 600)
    ),
    false,
    3
  );
  const waffle = group("Waffle", [opt("No waffle"), opt("Waffle cone", 500), opt("Waffle bowl", 900)], false);
  return {
    id: id("line"),
    itemId: id("item"),
    name: "Birthday Cake Remix",
    restaurant: "Cold Stone Creamery",
    qty: 1,
    unitPrice: 5400,
    choices: "Love it, Oreo, Sprinkles",
    base: 3600,
    chosenIds: [cup.options[1].id, toppings.options[0].id, toppings.options[2].id],
    groups: [cup, toppings, waffle],
    category: "Signature creations",
    swaps: [],
  };
}

/* -------------------------------- Orders -------------------------------- */

const POOL = ["7UP", "Aquafina", "Mirinda Orange", "Pepsi", "Pepsi Lite", "Supa Komando", "Teem Bitter Lemon"];

export function demoOrders(): DemoOrder[] {
  n = 0;
  return [
    {
      slug: "half-and-half",
      title: "One Half & Half",
      blurb:
        "The simplest case: one kitchen, one item. It skips straight to what to change. Try the size, the two halves, or swap it for a whole pizza.",
      total: 15850,
      lines: [halfAndHalf()],
    },
    {
      slug: "pizza-and-drinks",
      title: "Pizza with a drink on the side",
      blurb:
        "A pizza, two Pepsis sold on their own, and bread. The drinks change in one tap ('Pick a different drink').",
      total: 21450,
      lines: [
        plainPizza("Pepperoni", 1, 0),
        drink("Pepsi", "Domino's Pizza", 1050, 2, POOL),
        {
          id: id("line"),
          itemId: id("item"),
          name: "Breadsticks",
          restaurant: "Domino's Pizza",
          qty: 1,
          unitPrice: 4500,
          choices: "",
          base: 4500,
          chosenIds: [],
          groups: [],
          category: "Bread",
          swaps: [
            { id: id("item"), name: "Cheesy Bread", base: 5300, groups: [] },
            { id: id("item"), name: "Cinnastix", base: 4500, groups: [] },
          ],
        },
      ],
    },
    {
      slug: "chicken-republic-combo",
      title: "Chicken Republic combos",
      blurb:
        "Meals that ask a size, a drink and a side. Each question is its own row, so changing the drink from Pepsi to Coke is one tap.",
      total: 17900,
      lines: [crCombo("Refuel Max Meal", 6800), crCombo("Citizens Meal", 5400), crWings()],
    },
    {
      slug: "kfc-deal",
      title: "KFC deal with two drinks",
      blurb: "A deal with a chicken choice, a side and two separate drinks.",
      total: 10900,
      lines: [kfcStreetwise()],
    },
    {
      slug: "three-kitchens",
      title: "Three kitchens in one order",
      blurb: "More than one kitchen, so it asks which kitchen first, then the item, then what to change.",
      total: 30600,
      lines: [plainPizza("Margherita", 0, 1), crCombo("Refuel Max Meal", 6800), kfcStreetwise()],
    },
    {
      slug: "pick-up-to-three",
      title: "Toppings: pick up to three",
      blurb: "A choice where several answers are allowed (up to three toppings), with a Done button.",
      total: 9400,
      lines: [coldStone()],
    },
    {
      slug: "remove-one-of-five",
      title: "Five items, remove one",
      blurb: "Several items from one kitchen. Open one and tap 'Take it off'. The last item can't be removed.",
      total: 38400,
      lines: [
        crCombo("Refuel Max Meal", 6800, 2),
        crCombo("Citizens Meal", 5400, 1),
        crWings(),
        drink("Pepsi", "Chicken Republic", 1050, 3, POOL),
        drink("Eva Water", "Chicken Republic", 700, 1, ["Eva Water", "Coke", "Sprite"]),
      ],
    },
  ];
}
