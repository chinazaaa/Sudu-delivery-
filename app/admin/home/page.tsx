import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import Thumb from "@/components/Thumb";
import { listSlides } from "@/lib/slides";
import { getSettings } from "@/lib/settings";
import { deleteSlide, saveSettings, saveSlide } from "../actions";

export const dynamic = "force-dynamic";

export default async function HomeAdmin() {
  const slides = await listSlides(true);
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="Home page"
        detail="The slider at the top, and the line under the name in the header."
      />

      <form action={saveSettings} className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">Under the name</h2>
          <p className="text-sm text-muted">
            The small line in the header, on every page.
          </p>
        </div>
        <input
          name="tagline"
          defaultValue={settings.tagline || "Sangotedo to PAU"}
          className="field"
        />
        <SaveButton>Save</SaveButton>
      </form>

      <h2 className="mb-2 font-bold">Slides</h2>
      <ul className="mb-4 space-y-3">
        {slides.map((slide) => (
          <li key={slide.id} className="card">
            <form action={saveSlide} className="space-y-3">
              <input type="hidden" name="slide_id" value={slide.id} />
              <input type="hidden" name="image_url" value={slide.image_url} />

              <div className="flex gap-3">
                <span className="h-20 w-32 shrink-0 overflow-hidden rounded-xl">
                  <Thumb
                    src={slide.image_url}
                    name={slide.headline}
                    rounded="rounded-none"
                    variant="banner"
                  />
                </span>
                <div className="grow space-y-2">
                  <input
                    name="headline"
                    defaultValue={slide.headline}
                    placeholder="Headline"
                    className="field py-2 font-semibold"
                  />
                  <input
                    name="body"
                    defaultValue={slide.body}
                    placeholder="The line under it"
                    className="field py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  name="link_url"
                  defaultValue={slide.link_url}
                  placeholder="Where the button goes, /r/..."
                  className="field py-2 text-sm"
                />
                <input
                  name="link_text"
                  defaultValue={slide.link_text}
                  placeholder="What it says"
                  className="field py-2 text-sm"
                />
                <input
                  name="sort_order"
                  inputMode="numeric"
                  defaultValue={slide.sort_order}
                  placeholder="Order"
                  className="field py-2 text-sm"
                />
              </div>

              <div>
                <label className="label" htmlFor={`photo-${slide.id}`}>
                  Replace the picture
                </label>
                <input
                  id={`photo-${slide.id}`}
                  name="photo"
                  type="file"
                  accept="image/*"
                  className="field py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" name="active" defaultChecked={slide.active} />
                  Showing
                </label>
                <SaveButton quiet className="px-4 py-2 text-sm">Save</SaveButton>
              </div>
            </form>

            <form action={deleteSlide} className="mt-2">
              <input type="hidden" name="slide_id" value={slide.id} />
              <ActionButton
                className="chip border-black/10 bg-white text-brand"
                done="Deleted ✓"
              >
                Delete this slide
              </ActionButton>
            </form>
          </li>
        ))}
        {slides.length === 0 && (
          <li className="card text-sm text-muted">
            No slides yet, so the home page shows one per restaurant with their
            own banner. Add one below and yours take over.
          </li>
        )}
      </ul>

      <form action={saveSlide} className="card space-y-3">
        <h2 className="font-bold">A new slide</h2>
        <input name="headline" placeholder="Headline" className="field" />
        <input name="body" placeholder="The line under it" className="field" />
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            name="link_url"
            placeholder="Where the button goes"
            className="field py-2 text-sm"
          />
          <input
            name="link_text"
            placeholder="What it says"
            className="field py-2 text-sm"
          />
          <input
            name="sort_order"
            inputMode="numeric"
            placeholder="Order"
            className="field py-2 text-sm"
          />
        </div>
        <div>
          <label className="label" htmlFor="photo">Picture</label>
          <input id="photo" name="photo" type="file" accept="image/*" className="field" />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked />
          Showing
        </label>
        <SaveButton>Add the slide</SaveButton>
      </form>
    </div>
  );
}
