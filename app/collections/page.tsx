import BoxShelf from "@/components/BoxShelf";
import { occasionBySlug } from "@/lib/boxes";
import CurateBox from "@/components/CurateBox";
import { safeSettings } from "@/lib/settings";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Collections",
  description:
    "Care packages, hostel packs, restocks, birthdays and match days, " +
    "already put together at one price with delivery in it, to PAU.",
  alternates: { canonical: "/collections" },
};

/**
 * Every shelf, on one page.
 *
 * There were two of these: the collections, which stand there all term, and
 * the occasions, which have a date on them. The difference is real and it is
 * still there in admin, but it was never a reason for two public pages.
 * Nobody puts two addresses on a flyer, and "is a birthday a collection or
 * an occasion" is a question only we were ever asking: anybody looking for a
 * birthday box types the word birthday.
 *
 * So one shelf, one address, and /occasions sends anybody who has the old
 * link here.
 */
export default async function CollectionsPage({
  searchParams,
}: {
  /** The shelf somebody was sent here from, where its day has been. */
  searchParams: Promise<{ gone?: string }>;
}) {
  const settings = await safeSettings();

  /*
   * Where they were actually going.
   *
   * A shelf whose day has passed sends anybody still holding its link up
   * here, which is right: they wanted a box and there are plenty. Doing it
   * silently was not. Somebody taps "Halloween boxes" in a message from
   * last week and lands on a page about every box in the shop with no idea
   * why, which reads as a broken link rather than as an answer.
   *
   * Looked up by its address rather than printed from the link, so the
   * sentence on the page is a name out of the database and never whatever
   * somebody typed into the query string.
   */
  const from = (await searchParams).gone?.trim() ?? "";
  const over = from === "" ? null : await occasionBySlug(from).catch(() => null);

  return (
    <div className="space-y-10">
      {over && (
        <p className="rounded-xl border-2 border-ink bg-volt px-4 py-3 font-semibold">
          {over.name} is over for this year, so that shelf has come down.
          Everything else we pack is below.
        </p>
      )}
      <BoxShelf
        kind="all"
        base="/collections"
        title="Boxes for every moment"
        blurb="Pick a box, we pack it and bring it to the block. Every price includes delivery, and every box can be swapped around."
        empty="No boxes are packed just now."
        ticket="Packed and ready · delivery in every box"
        other={{ href: "/products", said: "Put your own together" }}
      />
      {/* For somebody who has read every shelf and not found it. The shelf
          pages carry the same card under their own boxes. */}
      <CurateBox shelf="" hint="" whatsapp={settings.whatsapp_number} />
      <HelpLine number={settings.whatsapp_number} about="a box" />
    </div>
  );
}
