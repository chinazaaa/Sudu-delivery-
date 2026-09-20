"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import { useRouter } from "next/navigation";
import { saveLink } from "@/app/admin/actions";

type Option = { id: string; name: string; priceDelta: number };
type Group = {
  id: string;
  name: string;
  required: boolean;
  maxSelect: number;
  options: Option[];
};
type Dish = {
  id: string;
  name: string;
  restaurant: string;
  price: number;
  groups: Group[];
};

/**
 * A question worth answering here rather than leaving to the note.
 *
 * Anything that moves the price has to be settled when the link is made, or
 * the basket says one figure and the order charges another. Anything that
 * does not, a crust or which drink, is better left to the person eating it,
 * and the link tells them to say so in the note.
 */
function costs(group: Group): boolean {
  return group.required || group.options.some((option) => option.priceDelta !== 0);
}

/**
 * Making a link to send.
 *
 * A search rather than a wall of checkboxes: a hundred and fifty dishes are
 * on the menu and whoever is making this already has one in mind. What is
 * picked stays on screen whatever is typed, or saving after a search would
 * quietly drop everything the search hid.
 */
type Picked = { id: string; qty: number; options: string[] };

export default function LinkBuilder({
  dishes,
  runs,
  slots,
  saved,
  editing,
}: {
  dishes: Dish[];
  runs: { id: string; label: string }[];
  slots: { at: string; label: string }[];
  /** What this link already says, when the run has closed or the window has
   *  passed and so is not in the lists any more. Kept as its own option so
   *  opening an edit does not quietly move it. */
  saved?: { value: string; label: string } | null;
  /** A link being changed rather than made. Everything comes back filled in,
   *  and saving keeps the same address, so whatever was already sent to
   *  people goes on working. */
  editing?: {
    id: string;
    label: string;
    lines: { id: string; qty: number; options: string[] }[];
    alternatives: { id: string; qty: number; options: string[] }[];
    when: string;
    fee: number | null;
    coupon: string;
    paymentLink: string;
    note: string;
  } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(editing));
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Picked[]>(editing?.lines ?? []);
  // What somebody can have instead of it. The same shape, so a size or a
  // flavour is settled on these too.
  const [instead, setInstead] = useState<Picked[]>(editing?.alternatives ?? []);
  const [otherQuery, setOtherQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState(false);

  const needle = query.trim().toLowerCase();
  const found =
    needle.length < 2
      ? []
      : dishes
          .filter(
            (dish) =>
              !picked.some((one) => one.id === dish.id) &&
              (dish.name.toLowerCase().includes(needle) ||
                dish.restaurant.toLowerCase().includes(needle))
          )
          .slice(0, 8);

  const named = (id: string) => dishes.find((dish) => dish.id === id);
  /** What a line costs, the chosen options included, exactly as the order
   *  will price it. */
  const lineTotal = (one: { id: string; qty: number; options: string[] }) => {
    const dish = named(one.id);
    if (!dish) return 0;
    const extras = dish.groups
      .flatMap((group) => group.options)
      .filter((option) => one.options.includes(option.id))
      .reduce((sum, option) => sum + option.priceDelta, 0);
    return (dish.price + extras) * one.qty;
  };

  const food = picked.reduce((sum, one) => sum + lineTotal(one), 0);

  /**
   * An alternative may cost the same or less, never more.
   *
   * Less is honest: they pay for what they take, and the total on the page
   * goes down when they pick it. More is not a swap, it is an upsell hidden
   * inside a basket somebody has already agreed to, and the figure they were
   * reading would go up under their thumb. Anybody wanting the dearer thing
   * can ask, and the button for that is right there.
   */
  const mispriced = instead.filter((one) => lineTotal(one) > food);

  /** Questions that must be answered before this link can be sent. */
  const unanswered = [...picked, ...instead].filter((one) => {
    const dish = named(one.id);
    if (!dish) return false;
    return dish.groups.some(
      (group) =>
        group.required && !group.options.some((option) => one.options.includes(option.id))
    );
  });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-5">
        Make a link
      </button>
    );
  }

  return (
    <form
      action={async (form: FormData) => {
        setProblem("");
        setDone(false);
        setBusy(true);
        try {
          const result = await saveLink(form);
          if (!result.ok) {
            setProblem(result.error ?? "Could not save that.");
            return;
          }
          setInstead([]);
          if (editing) {
            // Out of the edit and back to the list. The refresh is the half
            // that was missing: leaving the address behind does not re-read
            // the page, so the list came back showing what it was showing
            // before, and saving again looked like the only way to make it
            // take.
            router.replace("/admin/links");
            router.refresh();
            return;
          }
          setPicked([]);
          setQuery("");
          setDone(true);
          // The link that was just made is not in the list until the page is
          // read again.
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="card space-y-4"
    >
      {editing && <input type="hidden" name="link_id" value={editing.id} />}
      {editing && (
        <p className="text-sm font-bold text-brand-dark">
          Changing a link that is already out. Saving keeps the same address, so
          whatever you have sent people goes on working.
        </p>
      )}

      <div>
        <label className="label" htmlFor="label">
          Title
        </label>
        <input
          id="label"
          name="label"
          defaultValue={editing?.label ?? ""}
          placeholder="Domino's meatball deal"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          They see this at the top of the page, above the food, so write it for
          them rather than for yourself.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="dish">
          The food
        </label>
        <input
          id="dish"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Start typing a dish or a restaurant"
          className="field"
        />

        {found.length > 0 && (
          <ul className="mt-2 space-y-1">
            {found.map((dish) => (
              <li key={dish.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked((was) => [
                      ...was,
                      {
                        id: dish.id,
                        qty: 1,
                        // A question with one answer answers itself.
                        options: dish.groups
                          .filter((group) => group.required && group.options.length === 1)
                          .map((group) => group.options[0].id),
                      },
                    ]);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-left text-sm"
                >
                  <span>
                    <span className="font-semibold">{dish.name}</span>
                    <span className="block text-xs text-muted">{dish.restaurant}</span>
                  </span>
                  <span className="font-bold">{naira(dish.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked.length > 0 && (
          <ul className="mt-3 space-y-2">
            {picked.map((one) => {
              const dish = named(one.id);
              if (!dish) return null;
              return (
                <li key={one.id} className="space-y-2 rounded-xl bg-shell px-3 py-2 text-sm">
                  <input type="hidden" name="item_id" value={one.id} />
                  <input type="hidden" name={`qty_${one.id}`} value={one.qty} />
                  <input
                    type="hidden"
                    name={`options_${one.id}`}
                    value={one.options.join(",")}
                  />
                  <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-semibold">{dish.name}</span>
                    <span className="block text-xs text-muted">{dish.restaurant}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((was) =>
                          was.map((item) =>
                            item.id === one.id
                              ? { ...item, qty: Math.max(1, item.qty - 1) }
                              : item
                          )
                        )
                      }
                      className="size-7 rounded-full border border-black/10"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold">{one.qty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((was) =>
                          was.map((item) =>
                            item.id === one.id ? { ...item, qty: item.qty + 1 } : item
                          )
                        )
                      }
                      className="size-7 rounded-full border border-black/10"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((was) => was.filter((item) => item.id !== one.id))
                      }
                      className="text-xs font-semibold text-muted"
                    >
                      Remove
                    </button>
                  </span>
                  </div>

                  {/* The questions that move the price, answered here. A
                      basket that skipped the size would say one figure and
                      the order would charge another. */}
                  {dish.groups.filter(costs).map((group) => (
                    <div key={group.id} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-muted">{group.name}</span>
                      {group.options.map((option) => {
                        const on = one.options.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              setPicked((was) =>
                                was.map((item) =>
                                  item.id !== one.id
                                    ? item
                                    : {
                                        ...item,
                                        options: on
                                          ? item.options.filter((id) => id !== option.id)
                                          : [
                                              // One answer to a one-answer
                                              // question: picking a second
                                              // size replaces the first.
                                              ...item.options.filter(
                                                (id) =>
                                                  group.maxSelect > 1 ||
                                                  !group.options.some((other) => other.id === id)
                                              ),
                                              option.id,
                                            ],
                                      }
                                )
                              )
                            }
                            className={`chip text-xs ${
                              on ? "border-brand bg-brand-tint text-brand-dark" : "border-black/10 bg-white"
                            }`}
                          >
                            {option.name}
                            {option.priceDelta !== 0 && ` +${naira(option.priceDelta)}`}
                          </button>
                        );
                      })}
                      {group.required &&
                        !group.options.some((option) => one.options.includes(option.id)) && (
                          <span className="text-xs font-semibold text-brand-dark">
                            pick one
                          </span>
                        )}
                    </div>
                  ))}

                  {/* Anything that does not move the price is better left to
                      the person eating it, and the link says so. */}
                  {dish.groups.some((group) => !costs(group)) && (
                    <p className="text-xs text-muted">
                      {dish.groups
                        .filter((group) => !costs(group))
                        .map((group) => group.name)
                        .join(" and ")}{" "}
                      is left to them, and the link tells them to say so in the note.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {picked.length > 0 && (
          <p className="mt-2 text-sm font-bold">Food: {naira(food)}</p>
        )}
        {unanswered.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-brand-dark">
            Answer every question above first. A size or a flavour that changes
            the price has to be settled here, or the basket says one figure and
            the order charges another.
          </p>
        )}
      </div>

      {picked.length > 0 && (
        <div>
          <label className="label" htmlFor="other">
            Or they can have
          </label>
          <input
            id="other"
            value={otherQuery}
            onChange={(event) => setOtherQuery(event.target.value)}
            placeholder="Another dish at the same price"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Offered on the page as a swap, so somebody who wanted the chicken
            does not close the tab. It can cost {naira(food)} or less, never
            more: they pay for what they take, and a basket that gets dearer
            when you look at it is not one anybody agreed to.
          </p>

          {otherQuery.trim().length >= 2 && (
            <ul className="mt-2 space-y-1">
              {dishes
                .filter(
                  (dish) =>
                    !instead.some((one) => one.id === dish.id) &&
                    !picked.some((one) => one.id === dish.id) &&
                    (dish.name.toLowerCase().includes(otherQuery.trim().toLowerCase()) ||
                      dish.restaurant.toLowerCase().includes(otherQuery.trim().toLowerCase()))
                )
                .slice(0, 8)
                .map((dish) => (
                  <li key={dish.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setInstead((was) => [
                          ...was,
                          {
                            id: dish.id,
                            qty: picked[0]?.qty ?? 1,
                            options: dish.groups
                              .filter((group) => group.required && group.options.length === 1)
                              .map((group) => group.options[0].id),
                          },
                        ]);
                        setOtherQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-left text-sm"
                    >
                      <span>
                        <span className="font-semibold">{dish.name}</span>
                        <span className="block text-xs text-muted">{dish.restaurant}</span>
                      </span>
                      <span className="font-bold">{naira(dish.price)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}

          {instead.length > 0 && (
            <ul className="mt-3 space-y-2">
              {instead.map((one) => {
                const dish = named(one.id);
                if (!dish) return null;
                const total = lineTotal(one);
                return (
                  <li key={one.id} className="space-y-2 rounded-xl bg-shell px-3 py-2 text-sm">
                    <input type="hidden" name="alt_id" value={one.id} />
                    <input type="hidden" name={`qty_${one.id}`} value={one.qty} />
                    <input
                      type="hidden"
                      name={`options_${one.id}`}
                      value={one.options.join(",")}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-semibold">{dish.name}</span>
                        <span className="block text-xs text-muted">{dish.restaurant}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`font-bold ${
                            total > food ? "text-brand-dark" : "text-mint"
                          }`}
                        >
                          {naira(total)}
                          {total < food && (
                            <span className="ml-1 text-xs font-semibold text-muted">
                              {naira(food - total)} less
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setInstead((was) => was.filter((item) => item.id !== one.id))
                          }
                          className="text-xs font-semibold text-muted"
                        >
                          Remove
                        </button>
                      </span>
                    </div>

                    {dish.groups.filter(costs).map((group) => (
                      <div key={group.id} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-muted">{group.name}</span>
                        {group.options.map((option) => {
                          const on = one.options.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                setInstead((was) =>
                                  was.map((item) =>
                                    item.id !== one.id
                                      ? item
                                      : {
                                          ...item,
                                          options: on
                                            ? item.options.filter((id) => id !== option.id)
                                            : [
                                                ...item.options.filter(
                                                  (id) =>
                                                    group.maxSelect > 1 ||
                                                    !group.options.some((other) => other.id === id)
                                                ),
                                                option.id,
                                              ],
                                        }
                                  )
                                )
                              }
                              className={`chip text-xs ${
                                on
                                  ? "border-brand bg-brand-tint text-brand-dark"
                                  : "border-black/10 bg-white"
                              }`}
                            >
                              {option.name}
                              {option.priceDelta !== 0 && ` +${naira(option.priceDelta)}`}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}

          {mispriced.length > 0 && (
            <p className="mt-2 text-xs font-semibold text-brand-dark">
              {mispriced
                .map((one) => named(one.id)?.name)
                .filter(Boolean)
                .join(", ")}{" "}
              costs more than {naira(food)}. Change the size until it does not,
              or take it out: a basket cannot get dearer while somebody is
              reading it.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="when">
          When does it go
        </label>
        <select
          id="when"
          name="when"
          className="field"
          defaultValue={editing?.when ?? ""}
        >
          <option value="">Whichever run is open when they tap it</option>
          {saved &&
            saved.value !== "" &&
            !slots.some((slot) => slot.at === saved.value) &&
            !runs.some((run) => `run:${run.id}` === saved.value) && (
              <option value={saved.value}>{saved.label} (as saved)</option>
            )}
          {slots.length > 0 && (
            <optgroup label="A car of its own">
              {slots.map((slot) => (
                <option key={slot.at} value={slot.at}>
                  {slot.label}
                </option>
              ))}
            </optgroup>
          )}
          {runs.length > 0 && (
            <optgroup label="On a run">
              {runs.map((run) => (
                <option key={run.id} value={`run:${run.id}`}>
                  {run.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fee">
            Delivery on this one
          </label>
          <input
            id="fee"
            name="fee"
            inputMode="numeric"
            defaultValue={editing?.fee ?? ""}
            placeholder="Leave empty for the usual"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Empty leaves the bands and whatever offer is on. A number here is
            what they pay, and 0 means free.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="coupon">
            Code applied for them
          </label>
          <input
            id="coupon"
            name="coupon"
            defaultValue={editing?.coupon ?? ""}
            placeholder="Optional"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Nobody has to be told to type it. One offer applies at a time, so a
            code on food a promotion already prices is refused.
          </p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="payment_link">
          Card link
        </label>
        <input
          id="payment_link"
          name="payment_link"
          defaultValue={editing?.paymentLink ?? ""}
          placeholder="Optional. Paste the payment link"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          Goes onto the order when somebody picks card, so they pay without
          messaging you.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="note">
          A line for them
        </label>
        <input
          id="note"
          name="note"
          defaultValue={editing?.note ?? ""}
          placeholder="Beef can be swapped for chicken, just say so"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          Shows above the basket. Worth saying what can be changed: somebody
          who wants the chicken instead will take the beef or close the tab
          unless they are told they can ask. There is a button under the form
          that opens WhatsApp with this basket written out.
        </p>
      </div>

      {problem !== "" && <p className="text-sm font-semibold text-brand-dark">{problem}</p>}
      {done && (
        <p className="text-sm font-semibold text-mint">
          Made. It is in the list below, with the address to copy.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={
            busy || picked.length === 0 || unanswered.length > 0 || mispriced.length > 0
          }
          className="btn-primary px-5"
        >
          {busy ? "Saving…" : editing ? "Save the changes" : "Make the link"}
        </button>
        <button
          type="button"
          onClick={() => (editing ? router.replace("/admin/links") : setOpen(false))}
          className="text-sm font-semibold text-muted"
        >
          {editing ? "Leave it as it was" : "Not now"}
        </button>
      </div>
    </form>
  );
}
