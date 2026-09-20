import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { db } from "@/lib/supabase";
import { safeSettings } from "@/lib/settings";
import { cutOffTime, dropLabel, nextDrop, skincareShop } from "@/lib/skincare";
import { clockOf } from "@/lib/same-day";
import { naira } from "@/lib/money";
import { saveSettings } from "@/app/admin/actions";
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
 * The skincare shelf: when the car goes, what it costs, and the catalogue.
 *
 * Its own page rather than a section of Settings, because it is its own shop:
 * two thousand products, one delivery a week, and an import that is the only
 * sane way to put a catalogue that size in.
 */
export default async function AdminSkincarePage() {
  const settings = await safeSettings();
  const shop = await skincareShop();

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

  const drop = nextDrop(settings);
  const [hour, minute] = cutOffTime(settings.skincare_cut_off);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Skincare"
        detail="The same shop on a different day. One car a week, one flat fee, and a catalogue that comes in from a file."
      />

      <form action={saveSettings} className="card space-y-3">
        <h2 className="font-bold">How it works</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="skincare_on">
              The shelf
            </label>
            <select
              id="skincare_on"
              name="skincare_on"
              defaultValue={settings.skincare_on}
              className="field"
            >
              <option value="">Off, nobody sees it</option>
              <option value="on">On</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="skincare_fee">
              Delivery on a skincare order
            </label>
            <input
              id="skincare_fee"
              name="skincare_fee"
              inputMode="numeric"
              defaultValue={settings.skincare_fee}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              One flat fee, whatever is in the basket. 0 means free.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="skincare_day">
              The day it goes
            </label>
            <select
              id="skincare_day"
              name="skincare_day"
              defaultValue={settings.skincare_day}
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
            <label className="label" htmlFor="skincare_cut_off">
              Orders close that morning at
            </label>
            <input
              id="skincare_cut_off"
              name="skincare_cut_off"
              type="time"
              defaultValue={settings.skincare_cut_off || "08:00"}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              After this, the next one somebody can be on is a week later.
              Ordering never stops.
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="skincare_window">
            When it lands that day
          </label>
          <input
            id="skincare_window"
            name="skincare_window"
            defaultValue={settings.skincare_window}
            placeholder="Between 12pm and 6pm"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="skincare_blurb">
            The line under the heading
          </label>
          <input
            id="skincare_blurb"
            name="skincare_blurb"
            defaultValue={settings.skincare_blurb}
            placeholder="One car a week, straight to your block."
            className="field"
          />
        </div>

        <button type="submit" className="btn-primary px-5">
          Save
        </button>

        <p className="border-t border-black/5 pt-3 text-sm text-muted">
          As it stands: the next one is{" "}
          <span className="font-semibold text-ink">{dropLabel(drop.date)}</span>, orders
          for it close at {clockOf(hour, minute)} that morning, and delivery is{" "}
          {settings.skincare_fee > 0 ? naira(settings.skincare_fee) : "free"}.
        </p>
      </form>

      <ImportProducts
        shopName={shop?.name ?? "Skincare"}
        products={products}
        missingPhotos={missing?.count ?? 0}
        photosHref={shop ? `/admin/menu/${shop.id}/photos` : ""}
      />
    </div>
  );
}
