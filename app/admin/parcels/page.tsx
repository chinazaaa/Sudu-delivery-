import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ParcelRoutes from "@/components/admin/ParcelRoutes";
import { db } from "@/lib/supabase";
import { safeSettings } from "@/lib/settings";
import { liveRoutes, parcelsFrom, TERMS_DEFAULT } from "@/lib/parcels";
import { naira } from "@/lib/money";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Carrying a parcel: the routes, what they charge, and what is said before
 * anything is taken.
 *
 * Its own page rather than a section of Settings, because it is its own
 * service: no menu, no run, no ladder, and a set of rules that are the whole
 * of what keeps it out of trouble.
 */
export default async function AdminParcelsPage() {
  const settings = await safeSettings();
  const setup = parcelsFrom(settings);
  const live = liveRoutes(setup.routes);

  const { count: waiting } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .not("parcel_route", "is", null)
    .eq("status", "pending");

  return (
    <div>
      <PageHeader
        title="Parcels"
        detail="Something collected and carried. Its own trip, on a day you agree."
      />

      {!setup.on && (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {settings.parcel_on === "on"
            ? "Turned on, but no route has a weight priced yet, so nobody can send one."
            : "Off, so the page says we are not carrying parcels just now."}
        </p>
      )}

      {(waiting ?? 0) > 0 && (
        <p className="mb-4 rounded-2xl bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">
          {waiting} parcel{waiting === 1 ? "" : "s"} waiting to be paid for.
          They are in Orders like any other.
        </p>
      )}

      <form action={saveSettings} className="card mb-4 space-y-3">
        <h2 className="font-semibold">Carrying parcels</h2>
        <div>
          <label className="label" htmlFor="parcel_on">
            On or off
          </label>
          <select
            id="parcel_on"
            name="parcel_on"
            defaultValue={settings.parcel_on === "on" ? "on" : ""}
            className="field"
          >
            <option value="">Off</option>
            <option value="on">On</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="parcel_max_value">
            The most a parcel may be worth
          </label>
          <input
            id="parcel_max_value"
            name="parcel_max_value"
            type="number"
            min={0}
            defaultValue={setup.maxValue}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Anything dearer is refused at the form. If a parcel is lost or
            damaged in your car it is yours, so this is the line that keeps the
            worst case survivable. Currently {naira(setup.maxValue)}.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="parcel_blurb">
            What the page says it is
          </label>
          <textarea
            id="parcel_blurb"
            name="parcel_blurb"
            defaultValue={settings.parcel_blurb}
            rows={2}
            placeholder="Something collected and brought to campus, or taken from campus to where it needs to be."
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="parcel_terms">
            The rules, one per line
          </label>
          <textarea
            id="parcel_terms"
            name="parcel_terms"
            defaultValue={settings.parcel_terms || TERMS_DEFAULT}
            rows={5}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Shown above the form, so it is agreed before anything is sent
            rather than argued about afterwards.
          </p>
        </div>

        <SaveButton>Save</SaveButton>
      </form>

      <form action={saveSettings} className="card space-y-3">
        <div>
          <h2 className="font-semibold">Routes and what they charge</h2>
          <p className="text-sm text-muted">
            {live.length === 0
              ? "None offered yet."
              : `${live.length} offered.`}{" "}
            Priced by weight as well as by route: a dress and a chest of drawers
            do not take the same room.
          </p>
        </div>
        <ParcelRoutes saved={setup.routes} />
        <SaveButton>Save the routes</SaveButton>
      </form>
    </div>
  );
}
