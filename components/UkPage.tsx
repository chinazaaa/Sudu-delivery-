import { notFound } from "next/navigation";

import { AlsoSee } from "@/components/Guide";
import PageHead from "@/components/PageHead";
import UkRequestForm from "@/components/UkRequestForm";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
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
const COPY: Record<UkKind, { ticket: string; title: string; on: "shirts_on" | "books_on"; blurb: "shirts_blurb" | "books_blurb" }> = {
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

  // Off is a page that does not exist, not a page saying it is shut.
  if (settings[copy.on] !== "on") notFound();

  return (
    <div className="space-y-6 pb-10">
      <PageHead
        ticket={copy.ticket}
        title={copy.title}
        lead={settings[copy.blurb] || undefined}
      />

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
