"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Taking an order for somebody who said what they wanted on WhatsApp.
 *
 * Find them, and the shop opens signed in as them: search, cart, choices,
 * offers, order again, checkout, every rule exactly as she would meet it.
 * The first go at this was a form in admin, and it was a second, poorer
 * shop with half a picker and no sizes. The real one already works.
 *
 * Their PIN is not involved and is never shown. A PIN only ever goes to
 * the number it belongs to, and this needs none: the admin password is
 * what was checked.
 */
export default function TakeAnOrder({
  orderAs,
}: {
  orderAs: (form: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<
    { phone: string; name: string; hostel: string }[]
  >([]);
  const [looking, setLooking] = useState(false);
  const box = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const at = setTimeout(() => box.current?.focus(), 40);
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", escape);
    return () => {
      clearTimeout(at);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setFound([]);
      setLooking(false);
      return;
    }
    let alive = true;
    setLooking(true);
    const soon = setTimeout(() => {
      void fetch(`/api/admin/customers?q=${encodeURIComponent(needle)}`)
        .then((reply) => reply.json() as Promise<{ found?: typeof found }>)
        .then((said) => {
          if (!alive) return;
          setFound(said.found ?? []);
          setLooking(false);
        })
        .catch(() => {
          if (!alive) return;
          setFound([]);
          setLooking(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(soon);
    };
  }, [query]);

  // A number typed in full is an answer in itself: somebody new, or
  // somebody whose name is spelt differently here from how it was said.
  const digits = query.replace(/[^\d+]/g, "");
  const asTyped = /^(?:\+?234|0)\d{10}$/.test(digits) ? digits : "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-admin">
        Take an order
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-2xl border-2 border-ink bg-paper p-4 shadow-lift"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-extrabold">Who is it for?</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-muted"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-muted">
              The shop opens signed in as them, so you can search, add to the
              cart and check out the way they would. Their PIN is not needed
              and is never shown.
            </p>

            <input
              ref={box}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Her name, or her number"
              className="field"
              aria-label="Find the customer"
            />

            {query.trim().length >= 2 && found.length === 0 && !looking && (
              <p className="text-sm text-muted">
                {asTyped === ""
                  ? "Nobody by that. Try their number."
                  : "Nobody by that number yet. Taking an order will start them off."}
              </p>
            )}

            <ul className="space-y-1.5">
              {found.map((one) => (
                <li key={one.phone}>
                  <form action={orderAs}>
                    <input type="hidden" name="phone" value={one.phone} />
                    <button
                      type="submit"
                      className="flex w-full items-baseline justify-between gap-3 rounded-xl bg-shell px-3 py-2.5 text-left text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {one.name || "No name"}
                        </span>
                        <span className="block text-xs text-muted">
                          {one.phone}
                          {one.hostel ? ` · ${one.hostel}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-brand">
                        Order as them →
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            {/* A number nobody has ordered on yet. The shop can still take
                it: placing the order is what makes them a customer, exactly
                as it is on the website. */}
            {asTyped !== "" && !found.some((one) => one.phone === asTyped) && (
              <form action={orderAs} className="border-t border-black/5 pt-2">
                <input type="hidden" name="phone" value={asTyped} />
                <button type="submit" className="btn-admin w-full">
                  Take an order on {asTyped}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
