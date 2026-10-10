import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { customerRows } from "@/lib/admin-data";
import { getSettings, googleLinks } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import {
  firstName,
  templateFor,
  TEMPLATE_LABEL,
  type TemplateKind,
} from "@/lib/messages";
import { formatPhone } from "@/lib/phone";
// The cuts and the types come from a plain module, not from the composer:
// a server page that dots into a client module is handed a reference to
// something that only exists in the browser, and the render throws.
import { VIEWS, type Pattern, type Picked } from "@/lib/customer-views";
import { Broadcast, Picking } from "@/components/admin/CustomerBulk";

export const dynamic = "force-dynamic";

/**
 * Writing one message to several people, on a phone.
 *
 * On a desk this is a card beside the customer book, because the list is
 * what tells you whether the wording suits the people on it. A phone has no
 * beside: the card sat under nine cards of customers, so writing the message
 * meant scrolling away from everybody it was going to. So the board gives
 * the composer a screen, reached from "Message all 9" and from the bar at
 * the bottom of the book, and this is that screen.
 *
 * Who it is for travels in the address. That is the whole reason there is a
 * route here rather than a panel that opens: a screen whose people live in
 * the address can be linked to, reloaded, and opened again tomorrow, and it
 * is also the only way the book can hand nine people over without a store
 * sitting between the two pages waiting to be out of date.
 *
 * Nothing on this screen sends anything, and there is no server action
 * behind it. WhatsApp opens a single chat at a time, so the honest screen
 * reveals one link per person, in order, and ticks each off as it is opened.
 * A button claiming to have sent nine messages would be a button that sent
 * none.
 */
export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{
    who?: string;
    view?: string;
    by?: string;
    q?: string;
    start?: string;
  }>;
}) {
  const query = await searchParams;

  // The people, in the order the book listed them, so the screen reads down
  // in the same order the list was ticked in.
  const wanted = (query.who ?? "")
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one !== "");
  const place = new Map(wanted.map((phone, at) => [phone, at]));

  const [rows, settings, url] = await Promise.all([
    customerRows(),
    getSettings(),
    siteUrl(),
  ]);
  const google = googleLinks(settings);

  const shown = rows
    .filter((row) => place.has(row.phone))
    .sort((one, two) => (place.get(one.phone) ?? 0) - (place.get(two.phone) ?? 0));

  // The way back is the list as it was left, cut and search and all.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: query.q ?? "",
    by: query.by ?? "",
    view: query.view ?? "",
  })) {
    if (value !== "") params.set(key, value);
  }
  const tail = params.toString();
  const backHref = tail === "" ? "/admin/customers" : `/admin/customers?${tail}`;

  if (shown.length === 0) {
    return (
      <div>
        <PageHeader
          backHref={backHref}
          backLabel="Customers"
          title="Message a group"
          detail="Nobody is carried in this address, so there is nobody to write to."
        />
        <div className="card p-5">
          <p className="hint">
            {wanted.length === 0
              ? "This screen is opened from the customer book: tick the people it is for, or pick a cut and tap Message all."
              : "Nobody in the book has those numbers any more. They may have been deleted since this link was made."}
          </p>
          <Link href={backHref} className="btn-admin-go mt-3">
            Back to the book
          </Link>
        </div>
      </div>
    );
  }

  /*
   * The same people the book hands the composer, as little of them as a
   * message needs. The greeting is worked out here because the book's own
   * answer for this person lives on the server.
   */
  const people: Picked[] = shown.map((row) => ({
    phone: row.phone,
    name: row.name || formatPhone(row.phone),
    greet: firstName(row.name, row.callsThem),
    block: row.hostel,
    pin: row.pin,
    spend: row.spend,
    orders: row.orders,
  }));

  /*
   * The wording the shop already has, in Settings, rather than a second set
   * of messages nobody knows exists. templateFor strips any token it cannot
   * fill, so the name and the PIN go in as plain words and come back out as
   * tokens for the composer to fill per person.
   */
  const pattern = (kind: TemplateKind): Pattern => ({
    kind,
    label: TEMPLATE_LABEL[kind],
    body: templateFor({
      kind,
      name: "SUDUNAME",
      settings,
      pin: "SUDUPIN",
      siteUrl: url,
    })
      .replaceAll("SUDUNAME", "{name}")
      .replaceAll("SUDUPIN", "{pin}"),
  });
  const patterns: Pattern[] = [
    pattern("pin"),
    pattern("review"),
    ...(google.review !== "" ? [pattern("google")] : []),
  ];

  // Where the button that opened this screen named a template, the owner
  // lands on the wording rather than on an empty box.
  const opening =
    patterns.find((one) => one.kind === (query.start ?? ""))?.body ?? "";

  return (
    <Picking
      people={people}
      patterns={patterns}
      start={people.map((one) => one.phone)}
      opening={opening}
    >
      <Broadcast
        viewLabel={VIEWS.find((one) => one.value === (query.view ?? ""))?.label ?? ""}
        backHref={backHref}
        hasOwnNumber={Boolean(settings.whatsapp_number)}
      />
    </Picking>
  );
}
