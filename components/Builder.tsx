"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import ItemSheet from "./ItemSheet";
import Thumb from "./Thumb";
import { cartCount, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { AisleShop } from "@/lib/products";
import type { ItemView } from "@/lib/view";

type Step = "shop" | "dish" | "drink" | "added";
type Dish = AisleShop["items"][number];

/**
 * A few taps from "I do not know" to food in the cart.
 *
 * Which place, then which dish with the most ordered at the top, then the
 * usual sheet for size and drink. Everything it shows comes from the menu,
 * so a new counter or dish appears here with no change to this.
 */
export default function Builder({ aisle, onClose }: { aisle: string; onClose: () => void }) {
  const [shops, setShops] = useState<AisleShop[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<Step>("shop");
  const [shop, setShop] = useState<AisleShop | null>(null);
  const [open, setOpen] = useState<{ item: ItemView; shop: AisleShop; drink?: boolean } | null>(null);
  const [drinks, setDrinks] = useState<AisleShop[]>([]);
  const [loading, setLoading] = useState("");
  const cart = useCart();
  const before = useRef(0);

  useEffect(() => {
    let live = true;
    fetch(`/api/builder?aisle=${encodeURIComponent(aisle)}`)
      .then((r) => r.json())
      .then((d) => live && setShops(d.shops ?? []))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [aisle]);

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

  async function pick(dish: Dish, from: AisleShop, drink = false) {
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
    setOpen({
      drink,
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

  const dots: Step[] = ["shop", "dish", "drink", "added"];
  const back = () => {
    if (step === "dish") {
      setStep("shop");
    } else if (step === "drink" || step === "added") setStep("dish");
  };

  const list = shop?.items ?? [];
  const popular = list.filter((d) => d.orderedCount > 0).slice(0, 3);
  const top = popular.length > 0 ? popular : list.slice(0, 3);
  const rest = list.filter((d) => !top.includes(d));

  const card = (dish: Dish, from: AisleShop, tag?: string, drink = false) => (
    <button
      key={dish.id}
      type="button"
      onClick={() => pick(dish, from, drink)}
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
              className={`h-2 rounded-full ${one === step ? "w-6 bg-brand" : "w-2 bg-ink/20"}`}
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

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-5">
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
            <div className="grid grid-cols-2 gap-3">
              {top.map((dish, at) => card(dish, shop, "★ Most ordered"))}
              {rest.map((dish) => card(dish, shop))}
            </div>
          </div>
        )}

        {step === "drink" && shop && (
          <div className="mx-auto max-w-lg space-y-3">
            <h2 className="font-display text-3xl font-black uppercase leading-none">
              Add a drink?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(drinks.find((one) => one.id === shop.id)?.items ?? [])
                .slice(0, 8)
                .map((dish) => card(dish, shop, undefined, true))}
            </div>
            <button type="button" onClick={() => setStep("added")} className="btn-quiet w-full">
              No thanks
            </button>
          </div>
        )}

        {step === "added" && (
          <div className="mx-auto max-w-lg space-y-4 pt-6 text-center">
            <p
              className="mx-auto flex size-24 items-center justify-center rounded-full border-2 border-ink bg-brand text-5xl font-black text-white shadow-[3px_3px_0_0_#111]"
              aria-hidden
            >
              ✓
            </p>
            <h2 className="font-display text-3xl font-black uppercase leading-none">
              In your cart
            </h2>
            <Link href="/cart" className="btn-primary block w-full" onClick={onClose}>
              Go to cart
            </Link>
            <button type="button" onClick={() => setStep("dish")} className="btn-quiet w-full">
              + Add more from {shop?.name}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("shop");
              }}
              className="btn-quiet w-full"
            >
              Another place
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
                const mine = open?.item.groups.some((g) => /drink/i.test(g.name)) ?? false;
                const has = (drinks.find((one) => one.id === open?.shop.id)?.items.length ?? 0) > 0;
                setStep(!open?.drink && !mine && has ? "drink" : "added");
              }
            }, 0);
          }}
        />
      )}
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
