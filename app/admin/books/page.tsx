import PageHeader from "@/components/admin/PageHeader";
import GalleryField from "@/components/admin/GalleryField";
import SaveButton from "@/components/SaveButton";
import { DEFAULT_BOOK_PHOTOS } from "@/lib/home-tiles";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The photos that slide across the books page: add from the phone, remove,
 * reorder. Its own page rather than a box in Settings, which already holds
 * too much.
 */
export default async function BooksAdmin() {
  const settings = await getSettings();
  const photos =
    settings.books_gallery.trim() === ""
      ? DEFAULT_BOOK_PHOTOS
      : settings.books_gallery
          .split("\n")
          .map((one) => one.trim())
          .filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Books"
        detail="The photos that slide across the books page. Add, remove or reorder them, then save."
      />
      <form action={saveSettings} className="card space-y-3">
        <GalleryField name="books_gallery" initial={photos} />
        <SaveButton>Save photos</SaveButton>
      </form>
      <p className="hint mt-3">
        The books page itself, and whether it is switched on, is under Settings, in
        Football shirts and books from the UK.
      </p>
    </div>
  );
}
