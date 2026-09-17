import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Reorder from "@/components/admin/Reorder";
import Thumb from "@/components/Thumb";
import { readSlides } from "@/lib/slides";
import { AUTO_HEADLINE, AUTO_LINES, getSettings } from "@/lib/settings";
import { deleteSlide, moveSlide, saveSettings, saveSlide } from "../actions";

export const dynamic = "force-dynamic";

export default async function HomeAdmin() {
  const { slides, ready } = await readSlides(true);
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

      <form action={saveSettings} className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">The automatic slider</h2>
          <p className="text-sm text-muted">
            What the home page shows while you have no slides of your own: one
            slide per restaurant, with its banner. These are the words on the
            site right now. Add a slide below and none of this is used.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="auto_headline">
            Headline
          </label>
          <input
            id="auto_headline"
            name="auto_headline"
            defaultValue={settings.auto_headline || AUTO_HEADLINE}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            <span className="font-semibold">{"{restaurant}"}</span> becomes the
            name of whichever restaurant the slide is for.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="auto_lines">
            The line underneath
          </label>
          <textarea
            id="auto_lines"
            name="auto_lines"
            rows={4}
            defaultValue={settings.auto_lines || AUTO_LINES}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            One per line. They take it in turns, so each restaurant gets a
            different one.
          </p>
        </div>
        <SaveButton>Save</SaveButton>
      </form>

      <h2 className="mb-2 font-bold">Slides</h2>
      {!ready ? (
        <p className="card mb-4 border-amber-300 bg-amber-50 text-sm">
          <span className="block font-bold">The slides table is missing.</span>
          The home page is showing its automatic slider, and anything you add
          here will fail to save until the table exists. Run{" "}
          <span className="font-semibold">supabase/update.sql</span> in
          Supabase, then come back.
        </p>
      ) : (
        <p className="mb-2 text-sm text-muted">
          The order here is the order they appear in the slider.
        </p>
      )}
      <ul className="mb-4 space-y-3">
        {slides.map((slide, index) => (
          <li key={slide.id} className="card flex items-start gap-2">
            <Reorder
              action={moveSlide}
              field="slide_id"
              id={slide.id}
              first={index === 0}
              last={index === slides.length - 1}
              label={slide.headline || "this slide"}
            />
            <form action={saveSlide} className="grow space-y-3">
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
                <input type="hidden" name="sort_order" value={slide.sort_order} />
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
              <ConfirmButton
                tone="bare"
                className="chip border-black/10 bg-white text-brand"
                confirm="Yes, delete this slide"
              >
                Delete this slide
              </ConfirmButton>
            </form>
          </li>
        ))}
        {slides.length === 0 && (
          <li className="card text-sm text-muted">
            <span className="block font-semibold text-ink">
              The slider on the home page is being made for you.
            </span>
            There is one slide per restaurant, using its banner photograph,
            headed with its name and a line about the run. That is what you
            are seeing now. Add a slide below and yours replace the lot.
          </li>
        )}
      </ul>

      <form action={saveSlide} className="card space-y-3">
        <h2 className="font-bold">A new slide</h2>
        <input name="headline" required placeholder="Headline" className="field" />
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
