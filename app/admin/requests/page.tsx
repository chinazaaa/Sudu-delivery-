import PageHeader from "@/components/admin/PageHeader";
import { requestList, fromTheChat, isAQuestion } from "@/lib/requests";
import { faqFromRequest } from "../faq/actions";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { naira } from "@/lib/money";
import {
  addRequest,
  linkRequestToOrder,
  markRequest,
  settleRequest,
  shelveRequest,
  unlinkRequestOrder,
} from "./actions";
import ActionButton from "@/components/ActionButton";
import SaveButton from "@/components/SaveButton";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { hostelNames } from "@/lib/hostels";

export const dynamic = "force-dynamic";

/** What to call the thing they attached, off its extension. */
function attachmentKind(path: string): string {
  const end = path.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(end)) return "a picture";
  if (end === "pdf") return "a PDF";
  if (["doc", "docx"].includes(end)) return "a Word document";
  if (["ppt", "pptx"].includes(end)) return "a presentation";
  return "a file";
}

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

/** Finished with no money through this page: nothing left to settle. */
const isClosed = (status: string): boolean =>
  status === "converted" || status === "dropped";

const STATUS: Record<string, string> = {
  new: "Waiting on you",
  quoted: "Priced, waiting on them",
  done: "Bought and delivered",
  // They went and placed it as an ordinary order, so it is finished and
  // its money is counted on that order. Counting it here as well would be
  // the same naira twice.
  converted: "Ordered on the website",
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
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const show = (await searchParams).show === "questions" ? "questions" : "";
  const [all, settings, shelves, blocks] = await Promise.all([
    requestList(),
    safeSettings(),
    // Where a request can be put. Every counter the shop keeps, so a power
    // bank goes to the shop and a bag of rice to the market.
    shelfList(),
    hostelNames(),
  ]);
  /*
   * Two different jobs on one page.
   *
   * Nearly everything here is something to go and buy. The chat added a
   * second kind: somebody with a question, which is answered rather than
   * bought, and answered once rather than every time. They are worth
   * reading as their own list, so there is a cut for them.
   */
  const questions = all.filter((one) => isAQuestion(one.note));
  /*
   * Custom orders, and only those, unless the chat's cut is asked for.
   *
   * "Everything" used to mean both, so a page about things to go and buy
   * opened on a list with questions mixed into it and the count at the top
   * answered neither.
   */
  const ordersAsked = all.filter((one) => !isAQuestion(one.note));
  const asks = show === "questions" ? questions : ordersAsked;
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
    all.map((one) => one.menu_item_id).filter((one): one is string => Boolean(one))
  );

  // The number of the order an ask became, where it became one. Read rather
  // than stored, for the same reason as the shelf above: an order's number
  // is the order's to keep, and a copy of it here would be a second place
  // for it to be wrong.
  const becameIds = [
    ...new Set(all.map((one) => one.order_id).filter((one): one is string => Boolean(one))),
  ];
  const { data: becameRows } =
    becameIds.length > 0
      ? await db().from("orders").select("id, order_no").in("id", becameIds)
      : { data: [] };
  const orderNo = new Map(
    ((becameRows ?? []) as { id: string; order_no: number | null }[]).map((one) => [
      one.id,
      one.order_no,
    ])
  );

  return (
    <div>
      <PageHeader
        title="Custom orders"
        detail="Everything people have asked us to find for them, however it came in: the website, the chat, or a phone call you write down yourself."
      />

      {/* The cut, and the way to the answers. A question answered here is
          answered once; turned into a chat answer it is answered for
          ever, and the two pages are one job. */}
      <div className="mb-3.5 flex flex-wrap gap-2">
        <Link
          href="/admin/requests"
          aria-current={show === "" ? "page" : undefined}
          className={`pill-admin ${show === "" ? "pill-admin-on" : ""}`}
        >
          Custom orders
          <span className="font-mono opacity-60">{ordersAsked.length}</span>
        </Link>
        {/* The chat's own cut, and only when it has caught something.
            A question is answered rather than bought, so it is a different
            job and does not belong in the count above. */}
        {questions.length > 0 && (
          <Link
            href="/admin/requests?show=questions"
            aria-current={show === "questions" ? "page" : undefined}
            className={`pill-admin ${show === "questions" ? "pill-admin-on" : ""}`}
          >
            Questions from the chat
            <span className="font-mono opacity-60">{questions.length}</span>
          </Link>
        )}
      </div>

      {/*
        Taken on the phone, written down here.

        The form on the website catches what people type. The order that
        proved this was worth building came in on a call: somebody asked an
        assistant where to get an ice cream, rang up, and had it typed in
        as an ordinary order afterwards. Nothing recorded that she had
        asked for anything at all, so the one list meant to say what people
        want never knew it happened.
      */}
      <details className="card mb-3.5 p-3.5 sm:p-4">
        <summary className="cursor-pointer text-sm font-bold">
          Write one down
        </summary>
        <form action={addRequest} className="mt-3 space-y-2.5">
          <div>
            <label className="label" htmlFor="add_wanted">
              What they asked for
            </label>
            <input
              id="add_wanted"
              name="wanted"
              required
              className="field w-full py-2 text-sm"
              placeholder="A tub of Fantasy ice cream"
            />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <input
              name="name"
              className="field py-2 text-sm"
              placeholder="Their name"
            />
            <input
              name="phone"
              inputMode="tel"
              className="field py-2 text-sm"
              placeholder="Their number"
            />
            {/* The blocks as the shop has them, not as somebody spells
                them at half past six. A typed block is a block the run
                sheet will not group. */}
            <select name="hostel" defaultValue="" className="field py-2 text-sm">
              <option value="">Their block</option>
              {blocks.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          </div>
          <input
            name="budget"
            className="field w-full py-2 text-sm"
            placeholder="A limit, if they gave one"
          />
          <input
            name="note"
            className="field w-full py-2 text-sm"
            placeholder="Anything else worth keeping"
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="converted" value="1" className="size-4" />
            They have already ordered it
          </label>
          <p className="hint">
            Tick that where it became an ordinary order. It closes straight
            away and no money is counted here, because the money is on that
            order and counting it twice is how the books go wrong.
          </p>
          <SaveButton look="btn-admin btn-admin-sm">Write it down</SaveButton>
        </form>
      </details>

      {asks.length === 0 && (
        <div className="card text-sm text-muted">
          {show === "questions"
            ? "Nothing the chat could not answer. When somebody asks it something it has no answer for, it takes the question and it lands here with their number."
            : "Nothing asked for yet. The form is at /custom-order, it is on the front page and wherever a search finds nothing, and anything taken on the phone can be written down above."}
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
                  {/* Which door they came through, said out loud. It
                      changes what you open with: somebody who filled in
                      the form has already seen the shop, somebody who
                      asked the chat was mid-order when they hit the gap. */}
                  {fromTheChat(ask.note) && (
                    <span
                      className={`tag mt-1 ${
                        isAQuestion(ask.note)
                          ? "bg-amber/20 text-amber-deep"
                          : "bg-brand-tint text-brand-dark"
                      }`}
                    >
                      {/* A question is not a shopping list, and the answer
                          is a sentence rather than a price. Said on the
                          card so nobody opens it looking for something to
                          go and buy. */}
                      {isAQuestion(ask.note) ? "Question from the chat" : "From the chat"}
                    </span>
                  )}
                  <p className="text-sm text-muted">
                    {ask.name} · {ask.phone}
                    {ask.hostel ? ` · ${ask.hostel}` : ""}
                  </p>
                  {ask.budget && (
                    <p className="text-sm text-muted">
                      Not over: {ask.budget}
                    </p>
                  )}
                  {ask.note && !fromTheChat(ask.note) && (
                    <p className="text-sm text-muted">{ask.note}</p>
                  )}
                  {/* A signed link, good for an hour, because the bucket
                      is private: an unsubmitted project at a public
                      address is a plagiarism risk we would have made
                      ourselves. No thumbnail, because half of these are
                      now documents rather than photographs. */}
                  {ask.file_path !== "" && (
                    <p className="mt-1">
                      <a
                        href={`/admin/requests/${ask.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-brand underline"
                      >
                        They attached {attachmentKind(ask.file_path)}
                      </a>
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    ask.status === "new"
                      ? "bg-brand-tint text-brand-dark"
                      : ask.status === "done" || ask.status === "converted"
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

                {/* Only while there is something left to decide. Once the
                    money is counted the ask is done, and four buttons that
                    set it to what it already is read as broken: you press
                    Done and the page comes back exactly as it was. */}
                {!ask.money_id && !isClosed(ask.status) && (
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
                  <ActionButton
                    name="status"
                    value="quoted"
                    className="btn-quiet px-3 py-2 text-sm"
                    busy="…"
                    done="Priced ✓"
                  >
                    Priced
                  </ActionButton>
                  <ActionButton
                    name="status"
                    value="done"
                    className="btn-primary px-3 py-2 text-sm"
                    busy="…"
                    done="Done ✓"
                  >
                    Done
                  </ActionButton>
                  {/* They went and placed it themselves. Finished, with
                      nothing to count here: the money is on that order,
                      and counting it twice is the one mistake this page
                      could make that the books would carry. */}
                  <ActionButton
                    name="status"
                    value="converted"
                    className="btn-quiet px-3 py-2 text-sm"
                    busy="…"
                    done="Filed ✓"
                  >
                    They ordered it
                  </ActionButton>
                  <ActionButton
                    name="status"
                    value="dropped"
                    className="btn-quiet px-3 py-2 text-sm"
                    busy="…"
                    done="Dropped ✓"
                  >
                    Drop
                  </ActionButton>
                </form>
                )}
              </div>

              {/*
                * A question, answered once and then answered for ever.
                *
                * This is how the chat's own list of answers is meant to
                * grow. Somebody asked it something it had never heard of,
                * it took the question and handed it to a person, and that
                * person has just answered them on WhatsApp. Typing the
                * answer here once means the next person asking it is
                * answered in a second, by a chat that still cannot invent
                * anything: it only ever says the words written here.
                *
                * Only on the questions. A request to go and buy a Caesar
                * salad from Debonairs is not a thing to answer for ever.
                */}
              {isAQuestion(ask.note) && (
                <details className="border-t border-black/5 pt-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Make this a chat answer
                  </summary>
                  <form action={faqFromRequest} className="mt-3 space-y-3">
                    <input type="hidden" name="request_id" value={ask.id} />
                    <div>
                      <label className="label" htmlFor={`faq-q-${ask.id}`}>
                        The question
                      </label>
                      <input
                        id={`faq-q-${ask.id}`}
                        name="question"
                        defaultValue={ask.wanted}
                        required
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`faq-a-${ask.id}`}>
                        What the chat should say
                      </label>
                      <textarea
                        id={`faq-a-${ask.id}`}
                        name="answer"
                        rows={3}
                        required
                        placeholder="The same thing you just told them."
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`faq-k-${ask.id}`}>
                        Other ways people ask it
                      </label>
                      <input
                        id={`faq-k-${ask.id}`}
                        name="keywords"
                        placeholder="comma separated"
                        className="field"
                      />
                      <p className="hint mt-1">
                        This is what makes it get found. Nobody types the
                        question twice the same way.
                      </p>
                    </div>
                    <ActionButton className="btn-primary px-3 py-2 text-sm" busy="Saving…" done="Saved ✓">
                      Save it and mark this done
                    </ActionButton>
                  </form>
                </details>
              )}

              {/* Bought it for her and that is the end of it. Most asks are
                  a one-off for one person and will never be on a menu, so
                  making a product and an order to hold the money is two
                  records that are not true kept for one number that is. */}
              {/*
                Closed, with nothing to count.
                
                "They ordered it" and "Drop" both finish an ask without any
                money passing through here, and the boxes for counting it
                stayed on screen underneath regardless, so pressing either
                changed a badge and left the card still asking to be
                settled. There was no way to tell a finished one from one
                waiting on you.
              */}
              {!ask.money_id && isClosed(ask.status) ? (
                <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-black/[0.04] px-3 py-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold">
                    {ask.status === "converted" ? (
                      <>
                        Finished. It went out as an ordinary order, so the money
                        is on that order and none is counted here.
                        {/* Which order, where somebody has said. The card
                            used to stop at "an ordinary order", which left
                            the one question this list exists to answer, did
                            asking for it come to anything, a matter of going
                            and looking for it. */}
                        {ask.order_id && (
                          <>
                            {" "}
                            <Link
                              href={`/admin/orders/${ask.order_id}`}
                              className="underline"
                            >
                              {orderNo.get(ask.order_id)
                                ? `Order #${orderNo.get(ask.order_id)}`
                                : "Open the order"}
                            </Link>
                            .
                          </>
                        )}
                      </>
                    ) : (
                      "Not going ahead. Nothing to count."
                    )}
                  </p>
                  {/* Two different undos, and only one of them makes
                      sense on a card that already names an order.

                      Putting back an ask that became an order says the
                      order never happened, which is a thing somebody means
                      about once: the order was cancelled, or it was never
                      this ask's. Typing the wrong number into the box
                      above is the thing somebody does constantly, and the
                      only way out of it was to reopen the whole ask, chase
                      nothing for a while and finish it again. */}
                  {ask.order_id && (
                    <form action={unlinkRequestOrder} className="shrink-0">
                      <input type="hidden" name="id" value={ask.id} />
                      <ActionButton className="btn-quiet px-3 py-2 text-sm" busy="…" done="Unlinked ✓">
                        Wrong order
                      </ActionButton>
                    </form>
                  )}
                  <form action={markRequest} className="shrink-0">
                    <input type="hidden" name="id" value={ask.id} />
                    <ActionButton
                      name="status"
                      value="new"
                      className="btn-quiet px-3 py-2 text-sm"
                      busy="…"
                      done="Back ✓"
                    >
                      Put it back
                    </ActionButton>
                  </form>
                  {/* Said by its number, because that is what an order is
                      called everywhere else in here and on the message
                      that went to the customer. */}
                  {ask.status === "converted" && !ask.order_id && (
                    <form
                      action={linkRequestToOrder}
                      className="flex w-full items-end gap-2 border-t border-black/5 pt-2"
                    >
                      <input type="hidden" name="id" value={ask.id} />
                      <div className="w-28">
                        <label className="label" htmlFor={`became-${ask.id}`}>
                          Which order?
                        </label>
                        <input
                          id={`became-${ask.id}`}
                          name="order_no"
                          inputMode="numeric"
                          placeholder="1052"
                          className="field py-2 text-sm"
                        />
                      </div>
                      <SaveButton look="btn-admin btn-admin-sm">Link it</SaveButton>
                    </form>
                  )}
                </div>
              ) : ask.money_id ? (
                <div className="rounded-xl bg-mint/10 px-3 py-2">
                  <p className="text-sm font-semibold text-mint">
                    Counted{ask.quoted ? ` · ${naira(ask.quoted)} in` : ""}. It
                    is on{" "}
                    <Link href="/admin/money" className="underline">
                      Other money
                    </Link>
                    .
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Typed it wrong? Take the line off Other money and these
                    boxes come back.
                  </p>
                </div>
              ) : (
                <form
                  action={settleRequest}
                  className="flex flex-wrap items-end gap-2 border-t border-black/5 pt-3"
                >
                  <input type="hidden" name="id" value={ask.id} />
                  <div className="w-20">
                    <label className="label" htmlFor={`many-${ask.id}`}>
                      How many
                    </label>
                    <input
                      id={`many-${ask.id}`}
                      name="how_many"
                      inputMode="numeric"
                      defaultValue="1"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="label" htmlFor={`took-${ask.id}`}>
                      Price each
                    </label>
                    <input
                      id={`took-${ask.id}`}
                      name="took"
                      inputMode="numeric"
                      defaultValue={ask.quoted ?? ""}
                      placeholder="20000"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="label" htmlFor={`fee-${ask.id}`}>
                      Delivery
                    </label>
                    <input
                      id={`fee-${ask.id}`}
                      name="fee"
                      inputMode="numeric"
                      placeholder="0"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="label" htmlFor={`spent-${ask.id}`}>
                      Cost, in all
                    </label>
                    <input
                      id={`spent-${ask.id}`}
                      name="spent"
                      inputMode="numeric"
                      placeholder="0"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <ActionButton className="btn-primary px-3 py-2 text-sm" busy="Counting it…" done="Counted ✓">
                    Bought it, count it
                  </ActionButton>
                  <p className="w-full text-xs text-muted">
                    The price is for one of them and is multiplied; the cost
                    is the whole amount you paid out and is not. No product
                    and no order: it goes straight onto Other money and into
                    the profit, and this ask is done. Only know what you made?
                    Put that as the price and leave the rest empty.
                  </p>
                </form>
              )}

              {/* And the other way: a thing worth stocking, because three
                  people have now asked for it. Reading this list for that
                  pattern is the point of it. */}
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
                  <details className="border-t border-black/5 pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-muted">
                      Or is it worth stocking?
                    </summary>
                    <form
                      action={shelveRequest}
                      className="mt-3 flex flex-wrap items-end gap-2"
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
                    <ActionButton className="btn-primary px-3 py-2 text-sm" busy="Adding…" done="Added ✓">
                      Add to the shop
                    </ActionButton>
                      <p className="w-full text-xs text-muted">
                        Only when the same thing keeps being asked for. Their
                        words become the name and this becomes the price: no
                        picture, no description, and an Edit button beside it
                        so you can finish it off.
                      </p>
                    </form>
                  </details>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
