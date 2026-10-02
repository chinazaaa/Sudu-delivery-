import PageHeader from "@/components/admin/PageHeader";
import { requestList } from "@/lib/requests";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { naira } from "@/lib/money";
import { markRequest, shelveRequest } from "./actions";
import Link from "next/link";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Every counter the shop keeps, for the "put it on" dropdown. */
async function shelfList(): Promise<{ id: string; name: string }[]> {
  try {
    const { data } = await db().from("restaurants").select("id, name").order("name");
    return (data ?? []) as { id: string; name: string }[];
  } catch {
    // Without the list there is no dropdown and the rest of the page is
    // exactly as useful as it was before any of this existed.
    return [];
  }
}

/** Where each of these products lives now, by id. */
async function shelfOfItems(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  try {
    const { data } = await db()
      .from("menu_items")
      .select("id, restaurant_id")
      .in("id", ids);
    return new Map(
      ((data ?? []) as { id: string; restaurant_id: string }[]).map((one) => [
        one.id,
        one.restaurant_id,
      ])
    );
  } catch {
    return new Map();
  }
}

const STATUS: Record<string, string> = {
  new: "Waiting on you",
  quoted: "Priced, waiting on them",
  done: "Bought and delivered",
  dropped: "Not going ahead",
};

/**
 * What people have asked for that the shop does not carry.
 *
 * Read it for the pattern as much as for the list. Three people asking for
 * the same power bank in a fortnight is a product; one person asking for a
 * wedding cake is an afternoon's work and nothing more. The point of
 * writing them down is being able to tell those apart.
 */
export default async function RequestsPage() {
  const [asks, settings, shelves] = await Promise.all([
    requestList(),
    safeSettings(),
    // Where a request can be put. Every counter the shop keeps, so a power
    // bank goes to the shop and a bag of rice to the market.
    shelfList(),
  ]);
  const waiting = asks.filter((one) => one.status === "new");

  // The shop first, because that is where nearly everything asked for
  // belongs and nobody should have to go looking for it in a dropdown.
  const shopFirst = [...shelves].sort((one, two) => {
    const ours = (name: string) => (/^sudu/i.test(name) ? 0 : 1);
    return ours(one.name) - ours(two.name) || one.name.localeCompare(two.name);
  });
  const shelfName = (id: string) => shelves.find((one) => one.id === id)?.name ?? "the menu";

  // Which shelf each already-made product ended up on, so the card can name
  // it and link at it. Read now rather than stored on the request, because
  // a product can be moved and a request remembering where it used to be
  // would send somebody to the wrong page.
  const itemShelf = await shelfOfItems(
    asks.map((one) => one.menu_item_id).filter((one): one is string => Boolean(one))
  );

  return (
    <div>
      <PageHeader
        title="Asked for"
        detail="Things people wanted that are not on the menu."
      />

      {asks.length === 0 && (
        <div className="card text-sm text-muted">
          Nobody has asked for anything yet. The page is at /custom-order, and
          it is on the front page and wherever a search finds nothing.
        </div>
      )}

      {waiting.length > 0 && (
        <p className="mb-3 text-sm font-bold text-brand-dark">
          {waiting.length} waiting on you.
        </p>
      )}

      <ul className="space-y-3">
        {asks.map((ask) => {
          // Their own words, back to them, so nobody retypes the thing they
          // already said. Sent by hand: it opens WhatsApp and stops there.
          const reply = whatsappLink(
            ask.phone,
            `Hi ${ask.name.split(" ")[0]}, about the ${ask.wanted.slice(0, 60)} ` +
              "you asked Sudu for: "
          );

          return (
            <li key={ask.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{ask.wanted}</p>
                  <p className="text-sm text-muted">
                    {ask.name} · {ask.phone}
                    {ask.hostel ? ` · ${ask.hostel}` : ""}
                  </p>
                  {ask.budget && (
                    <p className="text-sm text-muted">
                      Would pay: {ask.budget}
                    </p>
                  )}
                  {ask.note && <p className="text-sm text-muted">{ask.note}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    ask.status === "new"
                      ? "bg-brand-tint text-brand-dark"
                      : ask.status === "done"
                        ? "bg-mint/10 text-mint"
                        : "bg-black/5 text-muted"
                  }`}
                >
                  {STATUS[ask.status] ?? ask.status}
                  {ask.quoted ? ` · ${naira(ask.quoted)}` : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                {reply && (
                  <a
                    href={reply}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-quiet px-3 py-2 text-sm"
                  >
                    Message them
                  </a>
                )}

                <form action={markRequest} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={ask.id} />
                  <div className="w-28">
                    <label className="label" htmlFor={`quoted-${ask.id}`}>
                      Priced at
                    </label>
                    <input
                      id={`quoted-${ask.id}`}
                      name="quoted"
                      inputMode="numeric"
                      defaultValue={ask.quoted ?? ""}
                      placeholder="0"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <button
                    name="status"
                    value="quoted"
                    className="btn-quiet px-3 py-2 text-sm"
                  >
                    Priced
                  </button>
                  <button
                    name="status"
                    value="done"
                    className="btn-primary px-3 py-2 text-sm"
                  >
                    Done
                  </button>
                  <button
                    name="status"
                    value="dropped"
                    className="btn-quiet px-3 py-2 text-sm"
                  >
                    Drop
                  </button>
                </form>
              </div>

              {/* From an ask to a thing somebody can buy, without leaving
                  the page. Reading this list for the pattern is the point of
                  it, and walking to another part of admin to retype the name
                  is where that stopped being worth doing. */}
              {ask.menu_item_id && itemShelf.has(ask.menu_item_id) ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-mint/10 px-3 py-2">
                  <span className="text-sm font-semibold text-mint">
                    On {shelfName(itemShelf.get(ask.menu_item_id)!)}.
                  </span>
                  <Link
                    href={`/admin/menu/${itemShelf.get(ask.menu_item_id)!}#item-${ask.menu_item_id}`}
                    className="btn-quiet px-3 py-1.5 text-sm"
                  >
                    Edit it
                  </Link>
                  <Link
                    href={`/admin/links?start=${ask.menu_item_id}`}
                    className="btn-quiet px-3 py-1.5 text-sm"
                  >
                    Make a checkout link
                  </Link>
                </div>
              ) : (
                shopFirst.length > 0 && (
                  <form
                    action={shelveRequest}
                    className="flex flex-wrap items-end gap-2 border-t border-black/5 pt-3"
                  >
                    <input type="hidden" name="id" value={ask.id} />
                    <div>
                      <label className="label" htmlFor={`shelf-${ask.id}`}>
                        Put it on
                      </label>
                      <select
                        id={`shelf-${ask.id}`}
                        name="restaurant_id"
                        className="field w-auto py-2 text-sm"
                      >
                        {shopFirst.map((one) => (
                          <option key={one.id} value={one.id}>
                            {one.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="label" htmlFor={`shelf-price-${ask.id}`}>
                        For
                      </label>
                      <input
                        id={`shelf-price-${ask.id}`}
                        name="quoted"
                        inputMode="numeric"
                        defaultValue={ask.quoted ?? ""}
                        placeholder="0"
                        className="field py-2 text-sm"
                      />
                    </div>
                    <button className="btn-primary px-3 py-2 text-sm">
                      Add to the shop
                    </button>
                    <p className="w-full text-xs text-muted">
                      Their words become the name and this becomes the price.
                      No picture, no description: it goes on with an Edit
                      button beside it so you can finish it off.
                    </p>
                  </form>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
