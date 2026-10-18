import PageHeader from "@/components/admin/PageHeader";
import { db } from "@/lib/supabase";
import { safeSettings } from "@/lib/settings";
import {
  cutOffTime,
  dropLabel,
  nextDrop,
  PROMISE,
  pharmacyBands,
  pharmacyCutOff,
  pharmacyShelves,
  pharmacyShop,
} from "@/lib/pharmacy";
import BandEditor from "@/components/admin/BandEditor";
import SkincareForm from "@/components/admin/SkincareForm";
import Shelves from "@/components/admin/Shelves";
import { clockOf } from "@/lib/same-day";
import { naira } from "@/lib/money";
import ImportProducts from "@/components/admin/ImportProducts";

export const dynamic = "force-dynamic";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * The pharmacy counter: when the car goes, what it costs, and the catalogue.
 *
 * The skincare page in the same shape, because it is the same arrangement.
 * What it adds is the standing of the thing being sold: a shelf of medicine
 * is the one counter where the wording is not decoration, so the page says
 * where the line is and why the words on the shelf are not editable away.
 */
export default async function AdminPharmacyPage() {
  const settings = await safeSettings();
  const shop = await pharmacyShop();

  const counted = shop
    ? await db()
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", shop.id)
    : null;
  const products = counted?.count ?? 0;

  const missing = shop
    ? await db()
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", shop.id)
        .eq("image_url", "")
    : null;

  const borrowed = shop
    ? await db()
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", shop.id)
        .neq("image_url", "")
        .not("image_url", "ilike", "%/storage/v1/object/public/%")
    : null;

  const drop = nextDrop(settings);
  const [hour, minute] = cutOffTime(pharmacyCutOff(settings));
  const bands = pharmacyBands(settings);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pharmacy"
        detail="A counter of its own. One car a week, its own ladder, and a catalogue that comes in from a file."
      />

      {/* Not a setting, because it is not ours to word away. Said here so
          whoever runs the shelf knows what the shelf is promising on their
          behalf. */}
      <div className="card border-2 border-ink bg-volt/20">
        <h2 className="font-bold">What the shelf says, and why</h2>
        <p className="mt-1 text-sm leading-relaxed">
          Every pharmacy page carries the same line: we are not a pharmacy,
          nobody here is a pharmacist, we do not advise on what to take, and we
          do not carry prescription only medicine. It is on the shelf above the
          products and again at the checkout, and it is in the code rather than
          in a box on this page, so it cannot be edited away by accident. The
          terms say it at greater length in clause 9.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Before the shelf goes on, a pharmacist should read the catalogue.
          Filtering a supplier list by name is not a safety check, and anything
          needing a prescription that slips through is on us.
        </p>
      </div>

      <SkincareForm kind="pharmacy">
        <h2 className="font-bold">How it works</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pharmacy_on">
              The counter
            </label>
            <select
              id="pharmacy_on"
              name="pharmacy_on"
              defaultValue={settings.pharmacy_on}
              className="field"
            >
              <option value="">Off, nobody sees it</option>
              <option value="on">On</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="pharmacy_day">
              The day it goes
            </label>
            <select
              id="pharmacy_day"
              name="pharmacy_day"
              defaultValue={settings.pharmacy_day}
              className="field"
            >
              {DAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="pharmacy_cut_off">
              Orders close that morning at
            </label>
            <input
              id="pharmacy_cut_off"
              name="pharmacy_cut_off"
              type="time"
              defaultValue={settings.pharmacy_cut_off || "08:00"}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              After this, the next one somebody can be on is a week later.
              Ordering never stops.
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pharmacy_window">
            When it lands that day
          </label>
          <input
            id="pharmacy_window"
            name="pharmacy_window"
            defaultValue={settings.pharmacy_window}
            placeholder="Between 12pm and 6pm"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="pharmacy_promise">
            Where the products come from
          </label>
          <input
            id="pharmacy_promise"
            name="pharmacy_promise"
            defaultValue={settings.pharmacy_promise}
            placeholder={PROMISE}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Said on the shelf, at the checkout and on the card a link draws.
            Name the kind of shop it was bought in rather than only the city:
            it is the part of this anybody is right to be careful about. Empty
            uses the line above.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="pharmacy_blurb">
            The line under the heading
          </label>
          <input
            id="pharmacy_blurb"
            name="pharmacy_blurb"
            defaultValue={settings.pharmacy_blurb}
            placeholder="One car a week, straight to your block."
            className="field"
          />
        </div>

        <div className="border-t border-black/5 pt-3">
          <p className="label mb-0">What delivery costs</p>
          <p className="mb-2 text-xs text-muted">
            Its own ladder, because it is the car and not the medicine: four
            packets and fifteen do not take the same room. The top band catches
            everything above it.
          </p>
          <BandEditor initial={bands} field="pharmacy_bands" />
        </div>

        <p className="border-t border-black/5 pt-3 text-sm text-muted">
          As it stands: the next one is{" "}
          <span className="font-semibold text-ink">{dropLabel(drop.date)}</span>, orders
          for it close at {clockOf(hour, minute)} that morning, and delivery is{" "}
          {bands[0].fee > 0 ? `from ${naira(bands[0].fee)}` : "not priced yet"}.
        </p>
      </SkincareForm>

      <Shelves shelves={await pharmacyShelves()} kind="pharmacy" />

      <ImportProducts
        shopName={shop?.name ?? "Pharmacy"}
        products={products}
        missingPhotos={missing?.count ?? 0}
        borrowedPhotos={borrowed?.count ?? 0}
        photosHref={shop ? `/admin/menu/${shop.id}/photos` : ""}
        kind="pharmacy"
      />
    </div>
  );
}
