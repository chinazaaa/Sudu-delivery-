import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

/** Student center pickup: whether it is on, what it costs, and when. */
export default async function PickupAdmin() {
  const settings = await getSettings();
  return (
    <div>
      <PageHeader
        title="Campus pickup"
        detail="Customers send a barcode or a picture of their order, you scan it or show it and bring the food to their hostel. The page is /pickup."
      />
      <form action={saveSettings} className="card space-y-3">
        <div>
          <label className="label" htmlFor="pickup_on">Switched</label>
          <select id="pickup_on" name="pickup_on" defaultValue={settings.pickup_on || "on"} className="field">
            <option value="on">On</option>
            <option value="off">Off, the page is hidden</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pickup_fee">Fee, in naira</label>
          <input id="pickup_fee" name="pickup_fee" inputMode="numeric" defaultValue={settings.pickup_fee || "1500"} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="pickup_days">Days</label>
          <input id="pickup_days" name="pickup_days" defaultValue={settings.pickup_days || "Every day"} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="pickup_hours">Hours</label>
          <input id="pickup_hours" name="pickup_hours" defaultValue={settings.pickup_hours || "10am to 7pm"} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="pickup_banner">The line on the front page</label>
          <input id="pickup_banner" name="pickup_banner" defaultValue={settings.pickup_banner} className="field" />
          <p className="hint mt-1">Shown above Start from here. Empty hides it.</p>
        </div>
        <div>
          <label className="label" htmlFor="pickup_places">Places we collect from</label>
          <textarea
            id="pickup_places"
            name="pickup_places"
            rows={5}
            defaultValue={settings.pickup_places || "Student center\nAmethyst hall\nSchool cafeteria\nRedwood\nSST food truck"}
            className="field"
          />
          <p className="hint mt-1">One place a line. Add a line to add a place. It is the dropdown customers choose from.</p>
        </div>
        <SaveButton>Save</SaveButton>
      </form>
    </div>
  );
}
