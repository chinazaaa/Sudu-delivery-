import BoxShelf from "@/components/BoxShelf";
import { safeSettings } from "@/lib/settings";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Collections",
  description:
    "Care packages, hostel packs, restocks and study boxes, already put " +
    "together at one price with delivery in it, to PAU.",
  alternates: { canonical: "/collections" },
};

/**
 * The standing shelves.
 *
 * A care package is not an occasion. Neither is a hostel pack or a restock:
 * they are there all term, and nothing about them expires. That is the whole
 * reason there are two of these pages and not one.
 */
export default async function CollectionsPage() {
  const settings = await safeSettings();

  return (
    <div className="space-y-4">
      <BoxShelf
      kind="collection"
      base="/collections"
      title="Boxes already put together"
      blurb="Care packages, hostel packs, restocks. One price with delivery in it, and nothing to decide but when you want it."
      empty="No collections are packed just now."
        other={{ href: "/occasions", said: "See what is on for an occasion" }}
      />
      <HelpLine number={settings.whatsapp_number} about="a box" />
    </div>
  );
}
