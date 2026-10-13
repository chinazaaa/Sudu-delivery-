import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Wordmark from "@/components/Wordmark";
import PrintThis from "@/components/PrintThis";
import { receiptFor, type ReceiptLine } from "@/lib/receipt";
import { naira } from "@/lib/money";
import { lagosStamp } from "@/lib/time";
import { safeSettings, shopEmails, instagramLink } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * A receipt, in the shop's own hand.
 *
 * Its own page rather than a thing inside admin, because the whole purpose
 * of it is to be sent: a link a student forwards to whoever paid, and a
 * page that prints to a PDF from any phone. No header, no tab bar, no
 * fifteen footer links, which is what makes it read as a document rather
 * than a web page with a total on it.
 *
 * The design is the shop's: the display face in caps, the mono ticket
 * voice for references, Ink rules and a hard shadow on the card. It should
 * look like it came from the same place the food did.
 */
export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [got, settings] = await Promise.all([receiptFor(id), safeSettings()]);
  // No receipt for an order nobody has paid for, and none for an order that
  // is not there. Both are a 404 rather than an explanation: this address
  // is only ever arrived at from a link.
  if (!got) notFound();

  const email = shopEmails(settings.contact_email);
  const instagram = instagramLink(settings.instagram_handle);

  // Grouped by where it comes from, because "Margherita, from Domino's" is
  // the thing somebody checks, and a run draws on more than one counter.
  const kitchens = [...new Set(got.lines.map((one) => one.restaurant))].map(
    (name) => ({ name, lines: got.lines.filter((one) => one.restaurant === name) })
  );

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="hint">
          Save it as a PDF, or send this page as a link. Both show the same thing.
        </p>
        <PrintThis />
      </div>

      <article className="card p-6 print:border-0 print:shadow-none sm:p-8">
        {/* Who it is from, and what it is. */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-5">
          <div className="space-y-2">
            <Wordmark size={34} />
            <p className="hint max-w-[260px]">
              Restaurant food, groceries and parcels to Pan-Atlantic
              University, Ibeju-Lekki, Lagos.
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[40px] font-black uppercase leading-none">
              Receipt
            </p>
            <p className="ticket mt-1 text-muted">{got.ref}</p>
            <p className="sticker mt-2">Paid</p>
          </div>
        </header>

        {/* Who it is for, and when the food goes. */}
        <section className="grid gap-5 border-b-2 border-ink py-5 sm:grid-cols-3">
          <Fact title="Billed to">
            <p className="font-bold">{got.name}</p>
            <p className="text-muted">{got.phone}</p>
            {got.forName !== "" && (
              <p className="mt-1.5 text-muted">
                For {got.forName}
                {got.forPhone !== "" ? ` · ${got.forPhone}` : ""}
              </p>
            )}
          </Fact>
          <Fact title="Delivered to">
            <p className="font-bold">{got.block || "Pan-Atlantic University"}</p>
            <p className="text-muted">Pan-Atlantic University</p>
          </Fact>
          <Fact title="On">
            <p className="font-bold">{got.day}</p>
            <p className="text-muted">{got.window}</p>
          </Fact>
        </section>

        {/* What they bought. A box says its own name over its contents, and
            the contents are what the order actually holds: swap the pizza
            and this says the pizza they are getting. */}
        <section className="py-5">
          {got.box !== "" && (
            <div className="mb-4">
              <p className="ticket text-muted">The box</p>
              <p className="font-display text-[26px] font-black uppercase leading-none">
                {got.box}
              </p>
            </div>
          )}

          {kitchens.map((kitchen) => (
            <div key={kitchen.name} className="mb-5 last:mb-0">
              <p className="ticket mb-2 border-b-[1.5px] border-line pb-1.5 text-muted">
                {kitchen.name}
              </p>
              <ul className="space-y-2.5">
                {kitchen.lines.map((line, at) => (
                  <Line key={`${at}-${line.name}`} line={line} />
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* What it came to. */}
        <section className="border-t-2 border-ink pt-5">
          <dl className="ml-auto max-w-[320px] space-y-1.5 text-[15px]">
            <Row said="Food">{naira(got.food)}</Row>
            <Row said="Delivery">{naira(got.fee)}</Row>
            {got.discount > 0 && (
              <Row said={got.coupon === "" ? "Discount" : `Discount · ${got.coupon}`}>
                −{naira(got.discount)}
              </Row>
            )}
            <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-2">
              <dt className="font-display text-[22px] font-black uppercase leading-none">
                Paid
              </dt>
              <dd className="font-display text-[26px] font-black leading-none">
                {naira(got.total)}
              </dd>
            </div>
          </dl>

          <p className="ticket mt-3 text-right text-muted">
            {got.paidBy} · {lagosStamp(got.paidOn)}
            {got.reference !== "" ? ` · ${got.reference}` : ""}
          </p>
        </section>

        {got.note.trim() !== "" && (
          <section className="mt-5 rounded-xl bg-shell p-3.5">
            <p className="ticket text-muted">What they asked for</p>
            <p className="mt-1 text-[15px]">{got.note}</p>
          </section>
        )}

        {/* How to reach a person about it. */}
        <footer className="mt-6 border-t-2 border-ink pt-4">
          <p className="font-bold">Something not right?</p>
          <p className="hint mt-1">
            Tell us the same day and a person will answer.
            {settings.whatsapp_number
              ? ` WhatsApp ${settings.whatsapp_number}.`
              : ""}
            {email ? ` Or write to ${email.orders}.` : ""}
          </p>
          <p className="ticket mt-3 text-muted">
            sudu.store
            {instagram ? ` · @${settings.instagram_handle.replace(/^@/, "")}` : ""}
          </p>
        </footer>
      </article>
    </div>
  );
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ticket mb-1 text-muted">{title}</p>
      <div className="text-[15px] leading-snug">{children}</div>
    </div>
  );
}

function Row({ said, children }: { said: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{said}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

/** One thing bought: what it is, what was chosen on it, and what it cost. */
function Line({ line }: { line: ReceiptLine }) {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className="min-w-0">
        <span className="font-semibold">
          {line.qty > 1 ? `${line.qty} × ` : ""}
          {line.name}
        </span>
        {line.choices.length > 0 && (
          <span className="block text-[13.5px] text-muted">
            {line.choices.join(" · ")}
          </span>
        )}
        {line.forName !== "" && (
          <span className="block text-[13.5px] text-muted">For {line.forName}</span>
        )}
        {line.qty > 1 && (
          <span className="block text-[13.5px] text-muted">
            {naira(line.each)} each
          </span>
        )}
      </span>
      <span className="shrink-0 font-semibold">{naira(line.total)}</span>
    </li>
  );
}
