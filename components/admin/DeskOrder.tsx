"use client";

import { useEffect, useState } from "react";
import ActionButton from "@/components/ActionButton";
import { naira } from "@/lib/money";

/**
 * An order somebody placed on WhatsApp, typed in by the shop.
 *
 * The only way to make an order from admin was to convert a cart somebody
 * had already built on the site, which is no use at all for the orders that
 * never touch the site: she says what she wants in a chat, and somebody
 * here has to put it on a run.
 *
 * Deliberately the smallest thing that works. The basket is item and
 * quantity; sizes, flavours and anything agreed in the chat are added on
 * the order's own page afterwards, with the same box that has always done
 * it. A second half-built picker here would be two places to keep right.
 */
export type Picked = {
  id: string;
  name: string;
  shop: string;
  price: number;
  qty: number;
};

export default function DeskOrder({
  place,
  going,
  hostels,
  known,
}: {
  place: (form: FormData) => void;
  /** The runs still taking orders, and the times a car could go. */
  going: { value: string; label: string; car: boolean }[];
  hostels: string[];
  /** Who this is for, where the number was recognised, and what they had
   *  last time. Null before a number has been looked up. */
  known: {
    phone: string;
    name: string;
    hostel: string;
    orders: number;
    last: { at: string; lines: Picked[] } | null;
  } | null;
}) {
  const [lines, setLines] = useState<Picked[]>([]);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Omit<Picked, "qty">[]>([]);
  const [name, setName] = useState(known?.name ?? "");
  const [hostel, setHostel] = useState(known?.hostel ?? "");

  // A different number looked up is a different person: whatever was typed
  // for the last one must not follow them.
  useEffect(() => {
    setName(known?.name ?? "");
    setHostel(known?.hostel ?? "");
    setLines([]);
  }, [known?.phone, known?.name, known?.hostel]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setFound([]);
      return;
    }
    let alive = true;
    const soon = setTimeout(() => {
      void fetch(`/api/admin/catalogue?q=${encodeURIComponent(needle)}`)
        .then((reply) => reply.json() as Promise<{ found?: Omit<Picked, "qty">[] }>)
        .then((said) => {
          if (alive) setFound(said.found ?? []);
        })
        .catch(() => {
          if (alive) setFound([]);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(soon);
    };
  }, [query]);

  const add = (one: Omit<Picked, "qty">) => {
    setLines((now) =>
      now.some((line) => line.id === one.id)
        ? now.map((line) =>
            line.id === one.id ? { ...line, qty: line.qty + 1 } : line
          )
        : [...now, { ...one, qty: 1 }]
    );
    setQuery("");
    setFound([]);
  };

  const setQty = (id: string, qty: number) =>
    setLines((now) =>
      qty <= 0
        ? now.filter((line) => line.id !== id)
        : now.map((line) => (line.id === id ? { ...line, qty } : line))
    );

  const food = lines.reduce((all, line) => all + line.price * line.qty, 0);

  return (
    <form action={place} className="space-y-4">
      <input type="hidden" name="phone" value={known?.phone ?? ""} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.map((line) => ({ id: line.id, qty: line.qty })))}
      />

      <section className="card space-y-3">
        <h2 className="text-lg font-extrabold">Who it is for</h2>
        {known === null ? (
          <p className="text-sm text-muted">
            Find them by their number first, above.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {known.orders > 0
                ? `${known.phone} · ${known.orders} order${known.orders === 1 ? "" : "s"} before`
                : `${known.phone} · nobody by this number yet, so this starts them off`}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="desk-name">Their name</label>
                <input
                  id="desk-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="desk-hostel">Their block</label>
                {hostels.length > 0 ? (
                  <select
                    id="desk-hostel"
                    name="hostel"
                    value={hostel}
                    onChange={(event) => setHostel(event.target.value)}
                    className="field"
                  >
                    <option value="">Pick the block</option>
                    {hostels.map((one) => (
                      <option key={one} value={one}>
                        {one}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="desk-hostel"
                    name="hostel"
                    value={hostel}
                    onChange={(event) => setHostel(event.target.value)}
                    className="field"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-extrabold">What they want</h2>
          {/* What they had last time, in one tap. Most of what gets ordered
              in a chat is the thing they ordered before. */}
          {known?.last && known.last.lines.length > 0 && (
            <button
              type="button"
              onClick={() => setLines(known.last!.lines)}
              className="chip border-black/10 bg-white py-1.5 text-xs"
            >
              Bring back their last order ({known.last.at})
            </button>
          )}
        </div>

        <div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Spaghetti, a cake, anything on the menu"
            className="field"
            aria-label="Search the menu"
          />
          {query.trim().length >= 2 && found.length === 0 && (
            <p className="mt-2 text-sm text-muted">
              Nothing matches. Add it as a product first, on Restaurants under
              Sudu, and it will be here.
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {found.map((one) => (
              <li key={one.id}>
                <button
                  type="button"
                  onClick={() => add(one)}
                  className="flex w-full items-baseline justify-between gap-3 rounded-xl bg-shell px-3 py-2 text-left text-sm"
                >
                  <span>
                    <span className="font-semibold">{one.name}</span>
                    <span className="text-muted"> · {one.shop}</span>
                  </span>
                  <span className="font-mono">{naira(one.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-muted">Nothing in it yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-shell px-3 py-2 text-sm"
              >
                <span className="min-w-0 grow">
                  <span className="font-semibold">{line.name}</span>
                  <span className="text-muted"> · {line.shop}</span>
                </span>
                <input
                  inputMode="numeric"
                  value={String(line.qty)}
                  onChange={(event) =>
                    setQty(line.id, Number(event.target.value.replace(/\D/g, "")) || 0)
                  }
                  className="field w-16 py-1.5 text-sm"
                  aria-label={`How many ${line.name}`}
                />
                <span className="w-24 text-right font-mono">
                  {naira(line.price * line.qty)}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(line.id, 0)}
                  className="text-xs font-semibold text-brand"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <p className="text-sm text-muted">
            Food {naira(food)}. Delivery is worked out when it is placed, off
            the same ladder every other order uses.
          </p>
        )}

        <div>
          <label className="label" htmlFor="desk-note">
            Anything they said
          </label>
          <input
            id="desk-note"
            name="note"
            placeholder="No pepper, call when you are outside"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Sizes and flavours are added on the order itself once it exists,
            with the same box that has always done it.
          </p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-extrabold">When it goes</h2>
        <select name="going" defaultValue="" className="field">
          <option value="" disabled>
            Pick a run, or a car of its own
          </option>
          {going.map((one) => (
            <option key={one.value} value={one.value}>
              {one.label}
            </option>
          ))}
        </select>
        {going.length === 0 && (
          <p className="text-sm font-semibold text-brand-dark">
            Nothing is open. Open a run first, on Runs.
          </p>
        )}

        <ActionButton
          className="btn-primary w-full py-3"
          done="Placed ✓"
          disabled={known === null || lines.length === 0 || going.length === 0}
        >
          Place it for them
        </ActionButton>
        <p className="text-xs text-muted">
          It arrives unpaid, like any other order, and is tagged as taken by
          us rather than as a website order: the door counts are about how
          each way of ordering is working, and this one is a person typing.
        </p>
      </section>
    </form>
  );
}
