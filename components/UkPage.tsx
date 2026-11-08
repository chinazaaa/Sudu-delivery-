import Link from "next/link";
import { notFound } from "next/navigation";

import { AlsoSee } from "@/components/Guide";
import PageHead from "@/components/PageHead";
import UkRequestForm from "@/components/UkRequestForm";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { UK_PATH, type UkKind } from "@/lib/uk-requests";

/**
 * A football shirt or book page: what it is, when it arrives, and the form.
 *
 * Short on purpose. There is no price, no list and no explanation to read:
 * somebody says what they want, the shop sends the price on WhatsApp, and
 * nothing is bought until they say yes. The one thing worth saying up
 * front is when it arrives, and that is a line in admin, not a date in
 * this file.
 */
const COPY: Record<
  UkKind,
  { ticket: string; title: string; on: "shirts_on" | "books_on"; blurb: "shirts_blurb" | "books_blurb" }
> = {
  shirt: {
    ticket: "From the UK",
    title: "Football shirts",
    on: "shirts_on",
    blurb: "shirts_blurb",
  },
  book: {
    ticket: "From the UK",
    title: "Books",
    on: "books_on",
    blurb: "books_blurb",
  },
  // Open to anything, and not a switch of its own: it is there whenever
  // either of the other two is, and shares their arrival line, so there is
  // nothing extra to turn on and no way for the three to disagree.
  other: {
    ticket: "From the UK",
    title: "Anything from the UK",
    on: "shirts_on",
    blurb: "shirts_blurb",
  },
};

export default async function UkPage({
  kind,
  sent,
}: {
  kind: UkKind;
  sent: boolean;
}) {
  const copy = COPY[kind];
  const [settings, hostels] = await Promise.all([safeSettings(), hostelNames()]);

  // Off is a page that does not exist, not a page saying it is shut. The
  // open-ended one stands whenever either of the others does.
  const anyOn = settings.shirts_on === "on" || settings.books_on === "on";
  if (kind === "other" ? !anyOn : settings[copy.on] !== "on") notFound();

  // The arrival line of whichever page is on, for the one that has none of
  // its own.
  const lead =
    kind === "other"
      ? settings.shirts_blurb || settings.books_blurb
      : settings[copy.blurb];

  /*
   * For anybody who would rather not fill in a form.
   *
   * At the top, before the form, because somebody who has seen a form and
   * does not want one should not have to read it to find the other way.
   * The message is written for them and sent by them: nothing here
   * messages anybody. The small link under the form is the other half,
   * which carries whatever they had already typed.
   */
  const direct = waLink(
    settings.whatsapp_number || null,
    `Hi Sudu, I would like ${
      kind === "book" ? "a book" : kind === "other" ? "something" : "a football shirt"
    } from the UK.`
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHead ticket={copy.ticket} title={copy.title} lead={lead || undefined}>
        {/* Directly under the arrival date, so it is seen without a
            scroll. Shirts and books are the two the shop is bringing on
            purpose, and people want far more than that from the UK. */}
        {kind !== "other" && (
          <Link
            href={UK_PATH.other}
            className="max-w-[580px] text-[17px] font-semibold text-brand underline underline-offset-2 sm:text-lg"
          >
            If you want to get something else from the UK
          </Link>
        )}
      </PageHead>

      {!sent && direct && (
        <div className="space-y-2">
          <a
            href={direct}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary block w-full py-3.5 text-center"
          >
            Message us on WhatsApp
          </a>
          <p className="text-center text-sm font-semibold text-muted">Or fill this in</p>
        </div>
      )}

      {sent ? (
        <div className="card space-y-1">
          <p className="font-display text-2xl font-black">Sent</p>
          <p className="text-ink/75">We will message you the price on WhatsApp.</p>
          <a href={UK_PATH[kind]} className="inline-block pt-2 font-semibold text-brand underline">
            Ask for another
          </a>
        </div>
      ) : (
        <UkRequestForm
          kind={kind}
          hostels={hostels}
          whatsapp={settings.whatsapp_number || null}
        />
      )}

      <AlsoSee not={UK_PATH[kind]} />
    </div>
  );
}
