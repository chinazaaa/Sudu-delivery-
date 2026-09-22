import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ParcelRoutes from "@/components/admin/ParcelRoutes";
import { db } from "@/lib/supabase";
import { safeSettings } from "@/lib/settings";
import Link from "next/link";
import { liveRoutes, parcelsFrom, TERMS_DEFAULT } from "@/lib/parcels";
import { parcelJobs } from "@/lib/parcel-jobs";
import { lagosToday, runDateLabel } from "@/lib/time";
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

  const jobs = await parcelJobs();
  const today = lagosToday();
  // Three piles, because they are three different jobs: one needs a date
  // agreed, one needs driving, one is history.
  const needDate = jobs.filter((one) => one.goesOn === "");
  const coming = jobs
    .filter((one) => one.goesOn !== "" && one.goesOn >= today)
    .sort((a, b) => a.goesOn.localeCompare(b.goesOn));
  const done = jobs.filter((one) => one.goesOn !== "" && one.goesOn < today);

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

      {/* The work, before the settings. A parcel is not in Runs, so without
          this there was nothing anywhere saying "you agreed to carry this on
          Friday", and the only thing stopping one being forgotten was
          remembering it. */}
      {jobs.length > 0 && (
        <section className="card mb-4 space-y-3">
          <h2 className="font-semibold">The parcels</h2>

          {needDate.length > 0 && (
            <Pile
              title="Waiting on a date from you"
              tone="warn"
              jobs={needDate}
              today={today}
            />
          )}
          {coming.length > 0 && <Pile title="Coming up" jobs={coming} today={today} />}
          {done.length > 0 && (
            <Pile title="Been and gone" jobs={done.slice(0, 10)} today={today} />
          )}
        </section>
      )}

      {/* Keyed on what it is showing. React resets a form once its action
          finishes, and an uncontrolled field goes back to the default it was
          drawn with, so "On" saved and then read as "Off" until the page was
          refreshed. A key that changes when the saved values change rebuilds
          the fields around the new ones. */}
      <form
        key={`setup-${settings.parcel_on}-${setup.maxValue}-${settings.parcel_blurb}-${settings.parcel_terms}`}
        action={saveSettings}
        className="card mb-4 space-y-3"
      >
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

      <form
        key={`routes-${settings.parcel_routes}`}
        action={saveSettings}
        className="card space-y-3"
      >
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

/** One pile of parcels, with the day and what is still missing on each. */
function Pile({
  title,
  jobs,
  today,
  tone,
}: {
  title: string;
  jobs: Awaited<ReturnType<typeof parcelJobs>>;
  today: string;
  tone?: "warn";
}) {
  return (
    <div>
      <p
        className={`text-sm font-bold ${
          tone === "warn" ? "text-brand-dark" : "text-muted"
        }`}
      >
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {jobs.map((job) => (
          <li key={job.orderId}>
            <Link
              href={`/admin/orders/${job.orderId}`}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm hover:border-ink/30"
            >
              <span className="min-w-0">
                <span className="block font-semibold">
                  {job.goesOn === ""
                    ? job.wantedOn
                      ? `They asked for ${runDateLabel(job.wantedOn)}`
                      : "No day asked for"
                    : job.goesOn === today
                      ? "Today"
                      : runDateLabel(job.goesOn)}
                </span>
                <span className="block text-muted">
                  {job.name} · {job.route}
                  {job.item ? ` · ${job.item}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={`block font-bold ${
                    job.status === "pending" ? "text-brand" : "text-mint"
                  }`}
                >
                  {job.status === "pending" ? "Unpaid" : job.status}
                </span>
                {/* What is still missing, which on the day is the question. */}
                <span className="block text-xs text-muted">
                  {job.photos.collected === 0
                    ? "No collection photo"
                    : job.photos.handed === 0
                      ? "No handover photo"
                      : "Photographed both ends"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
