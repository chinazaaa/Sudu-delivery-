"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import ItemSheet from "./ItemSheet";
import Thumb from "./Thumb";
import { cartCount, cartSubtotal, setQty, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { AisleShop } from "@/lib/products";
import type { ItemView } from "@/lib/view";

/** When a counter's food arrives: green when it is today, amber when it is not. */
function DayPill({ delivery }: { delivery?: { said: string; today: boolean } }) {
  if (!delivery) return null;
  return (
    <span
      className={`inline-block rounded-full border-2 px-2.5 py-0.5 text-xs font-bold ${
        delivery.today
          ? "border-green-700/40 bg-green-100 text-green-900"
          : "border-amber-700/40 bg-amber-100 text-amber-900"
      }`}
    >
      {delivery.said}
    </span>
  );
}

type Offer = "chicken" | "rice" | "soup" | "swallow";
const UPSELL_KINDS_ASKED: Offer[] = ["chicken", "rice", "soup", "swallow"];

type Step = "shop" | "dish" | "more" | "drink" | "added";
type Dish = AisleShop["items"][number];

/**
 * A few taps from "I do not know" to food in the cart.
 *
 * Which place, then which dish with the most ordered at the top, then the
 * usual sheet for size and drink. Everything it shows comes from the menu,
 * so a new counter or dish appears here with no change to this.
 */
export default function Builder({
  kind,
  onClose,
}: {
  kind: { label: string; tile?: string; aisle?: string; q?: string; category?: string };
  onClose: () => void;
}) {
  const aisle = kind.label;
  const [shops, setShops] = useState<AisleShop[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<Step>("shop");
  const [shop, setShop] = useState<AisleShop | null>(null);
  const [open, setOpen] = useState<{ item: ItemView; shop: AisleShop; via?: "dish" | "more" | "drink" } | null>(null);
  // What goes with the dish just added: chicken with rice, rice with chicken.
  const [pairs, setPairs] = useState<Record<string, AisleShop[]>>({});
  const [offer, setOffer] = useState<Offer | "">("");
  const [drinks, setDrinks] = useState<AisleShop[]>([]);
  const [loading, setLoading] = useState("");
  const [cheapest, setCheapest] = useState(false);
  const [last, setLast] = useState<Dish | null>(null);
  // Everything added in this visit, so the last screen shows the lot.
  const [added, setAdded] = useState<Dish[]>([]);
  const cart = useCart();
  const before = useRef(0);
  // When each counter in the cart next delivers, so a late one can be said.
  const [days, setDays] = useState<Record<string, { said: string; today: boolean }>>({});
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (step !== "added") return;
    const ids = [...new Set(cart.map((line) => line.restaurantId))];
    if (ids.length === 0) return;
    fetch(`/api/shop-days?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? {}))
      .catch(() => {});
    // The cart's own makeup is what matters, not each tick of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cart.length]);

  // Each step opens at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [step, shop, offer]);

  useEffect(() => {
    let live = true;
    const asked = new URLSearchParams();
    if (kind.tile) asked.set("tile", kind.tile);
    if (kind.aisle) asked.set("aisle", kind.aisle);
    if (kind.q) asked.set("q", kind.q);
    if (kind.category) asked.set("category", kind.category);
    fetch(`/api/builder?${asked.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const found: AisleShop[] = d.shops ?? [];
        setShops(found);
        // One place sells it, so there is nothing to choose between.
        if (found.length === 1) {
          setShop(found[0]);
          setStep("dish");
        }
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [kind.tile, kind.aisle, kind.q, kind.category]);

  useEffect(() => {
    let live = true;
    for (const kindName of UPSELL_KINDS_ASKED) {
      fetch(`/api/builder?upsell=${kindName}`)
        .then((r) => r.json())
        .then((d) => live && setPairs((was) => ({ ...was, [kindName]: d.shops ?? [] })))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, []);

  // Drinks are offered after the food, so they are fetched while somebody
  // is still choosing it.
  useEffect(() => {
    let live = true;
    fetch(`/api/builder?aisle=${encodeURIComponent("Drinks")}`)
      .then((r) => r.json())
      .then((d) => live && setDrinks(d.shops ?? []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function pick(dish: Dish, from: AisleShop, via: "dish" | "more" | "drink" = "dish") {
    setLoading(dish.id);
    let groups: ItemView["groups"] = [];
    try {
      const reply = await fetch(`/api/item/${dish.id}/choices`);
      groups = ((await reply.json()) as { groups?: ItemView["groups"] }).groups ?? [];
    } catch {
      /* A dish with no choices adds in one tap anyway. */
    }
    setLoading("");
    before.current = cartCount(cart);
    setLast(dish);
    setOpen({
      via,
      shop: from,
      item: {
        id: dish.id,
        href: dish.href,
        name: dish.name,
        price: dish.price,
        available: true,
        imageUrl: dish.imageUrl,
        description: dish.description,
        categoryId: null,
        containerPct: dish.containerPct,
        orderedCount: dish.orderedCount,
        groups,
      },
    });
  }

  const drinkOn = (from: AisleShop) =>
    (drinks.find((one) => one.id === from.id)?.items.length ?? 0) > 0;
  const dots: Step[] = ["shop", "dish", "drink", "added"];
  // "Add chicken?" shares the dot with "Add a drink?": both are the extras.
  const back = () => {
    if (step === "dish") {
      if ((shops?.length ?? 0) === 1) return onClose();
      setStep("shop");
    } else if (step === "more" || step === "drink" || step === "added") setStep("dish");
  };

  // Swallow (eba, pounded yam) is what goes with a soup, offered after one,
  // so it is not listed beside the soups as though it were a meal.
  const swallowIds = new Set((pairs.swallow ?? []).flatMap((one) => one.items.map((d) => d.id)));
  const list = (shop?.items ?? []).filter((d) => !swallowIds.has(d.id));
  const popular = list.filter((d) => d.orderedCount > 0).slice(0, 3);
  const lead = cheapest ? [] : list.filter((d) => d.featured);
  const top = cheapest ? [] : lead.length > 0 ? lead : popular.length > 0 ? popular : list.slice(0, 3);
  // What is most ordered (or what the tile leads with) comes first; the rest
  // follow cheapest first, so the next thing down is always the least to spend.
  const rest = [...list]
    .sort((a, b) => a.price - b.price)
    .filter((d) => !top.includes(d));

  const card = (dish: Dish, from: AisleShop, tag?: string, via: "dish" | "more" | "drink" = "dish") => (
    <button
      key={dish.id}
      type="button"
      onClick={() => pick(dish, from, via)}
      className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white text-left shadow-[3px_3px_0_0_#111]"
    >
      <span className="block aspect-[4/3] w-full">
        <Thumb src={dish.imageUrl} name={dish.name} category={aisle} rounded="rounded-none" />
      </span>
      {tag && (
        <span className="absolute left-2 top-2 rounded-full border-2 border-ink bg-yellow-300 px-2 py-0.5 text-xs font-extrabold">
          {tag}
        </span>
      )}
      <span className="flex min-w-0 flex-col items-start gap-1.5 p-2.5">
        <span className="text-sm font-bold leading-tight">{dish.name}</span>
        <span className="whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-sm font-extrabold text-white">
          {loading === dish.id ? "…" : `${dish.varies ? "from " : ""}${naira(dish.price)}`}
        </span>
      </span>
    </button>
  );

  const body = (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <div className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <button
          type="button"
          onClick={back}
          disabled={step === "shop"}
          aria-label="Back"
          className="size-9 rounded-full border-2 border-ink text-lg font-bold disabled:opacity-0"
        >
          ←
        </button>
        <div className="flex flex-1 justify-center gap-1.5" aria-hidden>
          {dots.map((one) => (
            <span
              key={one}
              className={`h-2 rounded-full ${
                one === step || (one === "drink" && step === "more") ? "w-6 bg-brand" : "w-2 bg-ink/20"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="size-9 rounded-full border-2 border-ink text-lg font-bold"
        >
          ×
        </button>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 pb-10 pt-5">
        {step === "shop" && (
          <div className="mx-auto max-w-lg space-y-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">
              Where from?
            </h2>
            {failed && <p className="text-sm font-semibold text-brand-dark">Could not load. Try again.</p>}
            {shops === null && !failed && <p className="text-muted">Loading…</p>}
            {shops?.length === 0 && <p className="text-muted">Nothing on sale here right now.</p>}
            <div className="grid grid-cols-2 gap-3">
              {shops?.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => {
                    setShop(one);
                    setStep("dish");
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-ink p-4 shadow-[3px_3px_0_0_#111]"
                  style={{ background: one.brandHex ? `${one.brandHex}22` : "#fff" }}
                >
                  <span className="block size-20 overflow-hidden rounded-full border-2 border-ink bg-white">
                    <Thumb src={one.logoUrl} name={one.name} rounded="rounded-full" />
                  </span>
                  <span className="text-center font-extrabold leading-tight">{one.name}</span>
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-sm font-extrabold text-white">
                    from {naira(one.from)}
                  </span>
                  <DayPill delivery={one.delivery} />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "dish" && shop && (
          <div className="mx-auto max-w-lg space-y-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">
              {shop.name}
            </h2>
            <DayPill delivery={shop.delivery} />
            <div className="flex gap-2">
              {[
                [false, "Most ordered"],
                [true, "Cheapest"],
              ].map(([value, label]) => (
                <button
                  key={String(label)}
                  type="button"
                  onClick={() => setCheapest(value as boolean)}
                  className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${
                    cheapest === value ? "bg-ink text-shell" : "bg-white"
                  }`}
                >
                  {label as string}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {top.map((dish) => card(dish, shop, lead.length > 0 ? undefined : "★ Most ordered"))}
              {rest.map((dish) => card(dish, shop))}
            </div>
          </div>
        )}

        {step === "more" && shop && offer !== "" && (
          <div className="mx-auto max-w-lg space-y-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">
              Add {offer}?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[...(pairs[offer]?.find((one) => one.id === shop.id)?.items ?? [])]
                .sort((a, b) => a.price - b.price)
                .slice(0, 6)
                .map((dish) => card(dish, shop, undefined, "more"))}
            </div>
            <button type="button" onClick={() => setStep(drinkOn(shop) ? "drink" : "added")} className="btn-quiet w-full">
              No thanks
            </button>
          </div>
        )}

        {step === "drink" && shop && (
          <div className="mx-auto max-w-lg space-y-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">
              Add a drink?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[...(drinks.find((one) => one.id === shop.id)?.items ?? [])]
                .sort((a, b) => a.price - b.price)
                .slice(0, 8)
                .map((dish) => card(dish, shop, undefined, "drink"))}
            </div>
            <button type="button" onClick={() => setStep("added")} className="btn-quiet w-full">
              No thanks
            </button>
          </div>
        )}

        {step === "added" && (
          <div className="mx-auto max-w-lg space-y-4 pt-2">
            <ul className="max-h-[42vh] space-y-2 overflow-y-auto rounded-2xl border-2 border-ink bg-white p-3 shadow-[3px_3px_0_0_#111]">
              {cart.map((line) => (
                <li key={line.key} className="flex items-center gap-3">
                  <span className="block size-12 shrink-0 overflow-hidden rounded-lg">
                    <Thumb src={line.imageUrl} name={line.name} category={aisle} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold leading-tight">{line.name}</span>
                    <span className="block text-xs text-muted">
                      {line.restaurantName} · {naira(line.unitPrice * line.qty)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="One less"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      className="size-7 rounded-full border-2 border-ink text-base font-bold leading-none"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm font-bold">{line.qty}</span>
                    <button
                      type="button"
                      aria-label="One more"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      className="size-7 rounded-full border-2 border-ink bg-ink text-base font-bold leading-none text-shell"
                    >
                      +
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {(() => {
              const late = cart.filter((line) => days[line.restaurantId] && !days[line.restaurantId].today);
              const early = cart.filter((line) => days[line.restaurantId]?.today);
              if (late.length === 0 || early.length === 0) return null;
              const names = [...new Set(late.map((line) => line.restaurantName))];
              const said = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
              const day = days[late[0].restaurantId].said.replace("Next delivery ", "");
              return (
                <div className="rounded-2xl border border-brand/30 bg-brand-tint px-4 py-2.5">
                  <p className="text-sm font-bold text-brand-dark">
                    {said} only comes {day}. The rest could come today.
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-brand-dark">
                    <button
                      type="button"
                      onClick={() => late.forEach((line) => setQty(line.key, 0))}
                      className="underline"
                    >
                      Take out {said}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        late.forEach((line) => setQty(line.key, 0));
                        setStep("shop");
                      }}
                      className="underline"
                    >
                      Switch to another restaurant
                    </button>
                  </div>
                </div>
              );
            })()}
            <p className="text-center text-sm font-semibold text-muted">
              In your cart: {cartCount(cart)} {cartCount(cart) === 1 ? "item" : "items"} ·{" "}
              {naira(cartSubtotal(cart))}
            </p>
            <Link
              href="/cart"
              className="btn-primary flex w-full items-center justify-center text-lg"
              onClick={onClose}
            >
              Go to cart →
            </Link>
            <button type="button" onClick={() => setStep("dish")} className="btn-quiet w-full">
              + Add more from {shop?.name}
            </button>
            <button type="button" onClick={() => setStep("shop")} className="btn-quiet w-full">
              Pick another restaurant
            </button>
          </div>
        )}
      </div>

      {open && (
        <ItemSheet
          item={open.item}
          restaurant={{ id: open.shop.id, name: open.shop.name }}
          onClose={() => {
            setOpen(null);
            // The sheet adds to the cart and closes: more in the bag than
            // before means something was added.
            setTimeout(() => {
              const now = Number(
                JSON.parse(window.localStorage.getItem("sudu_cart_v1") ?? "[]").reduce(
                  (sum: number, l: { qty: number }) => sum + l.qty,
                  0
                )
              );
              if (now > before.current) {
                if (last) setAdded((was) => (was.some((d) => d.id === last.id) ? was : [...was, last]));
                const via = open?.via ?? "dish";
                const here = open?.shop;
                const mine = open?.item.groups.some((g) => /drink/i.test(g.name)) ?? false;
                const canDrink = !!here && drinkOn(here) && !mine;
                // Chicken with rice, rice with chicken, from the same place, and
                // only once: a combo that already has both is not asked.
                const name = (open?.item.name ?? "").toLowerCase();
                const hasRice = /rice|jollof/.test(name);
                const hasChicken = /chicken/.test(name);
                const inKind = (kind: Offer) =>
                  (pairs[kind] ?? []).some((one) => one.items.some((d) => d.id === open?.item.id));
                const asks: Offer | "" =
                  via !== "dish" || (hasRice && hasChicken)
                    ? ""
                    : hasRice
                      ? "chicken"
                      : hasChicken || inKind("chicken")
                        ? "rice"
                        : inKind("soup")
                          ? "swallow"
                          : inKind("swallow")
                            ? "soup"
                            : "";
                const food = asks !== "" && !!here && ((pairs[asks]?.find((one) => one.id === here.id)?.items.length ?? 0) > 0);
                if (via === "dish" && food) {
                  setOffer(asks);
                  setStep("more");
                } else {
                  setStep(via !== "drink" && canDrink ? "drink" : "added");
                }
              }
            }, 0);
          }}
        />
      )}
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
