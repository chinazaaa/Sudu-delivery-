import BoxShelf from "@/components/BoxShelf";
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
export default async function CollectionsPage() {
  const settings = await safeSettings();

  return (
    <div className="space-y-10">
      <BoxShelf
        kind="all"
        base="/collections"
        title="Boxes for every moment"
        blurb="Pick a box, we pack it and bring it to the block. Every price includes delivery, and every box can be swapped around."
        empty="No boxes are packed just now."
        ticket="Packed and ready · delivery in every box"
        other={{ href: "/products", said: "Put your own together" }}
      />
      <HelpLine number={settings.whatsapp_number} about="a box" />
    </div>
  );
}
