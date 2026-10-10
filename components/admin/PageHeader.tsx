import Link from "next/link";

/**
 * The top of an admin page: where you are, what it is for, and what you can
 * do about it.
 *
 * In the board's voice, which is the display face at forty-six pixels in
 * caps with the sentence under it. Nine pages had hand-rolled this same
 * header because the component was still in the old two-line style, and a
 * header copied nine times is a header that drifts. So the component carries
 * the board and the pages go back to using it.
 */
export default function PageHeader({
  title,
  detail,
  backHref,
  backLabel,
  actions,
  search = true,
}: {
  title: string;
  /** The sentence under the title. A node, because several pages want a
   *  figure or a link inside it. */
  detail?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** The one box. Off only where a page has its own search as the whole
   *  point of it, which is the search page itself. */
  search?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-[22px]">
      {backHref && (
        <Link
          href={backHref}
          className="text-[13.5px] font-semibold text-muted hover:text-brand"
        >
          ← {backLabel ?? "Back"}
        </Link>
      )}
      <div
        className={`flex flex-wrap items-start justify-between gap-3.5 ${
          backHref ? "mt-1" : ""
        }`}
      >
        <div className="min-w-0">
          <h1 className="font-display text-[46px] font-black uppercase leading-[0.95]">
            {title}
          </h1>
          {detail && <p className="mt-1.5 text-[14.5px] text-muted">{detail}</p>}
        </div>
        {(actions || search) && (
          /* Full width on a phone, where three buttons side by side ran off
             the screen and took the whole page sideways with them. */
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {/* The board draws this in the header of every page, and it was
                on none of them: each page searched only itself, so finding
                a phone number meant guessing which page it belonged to
                before you could look it up. Hidden on a phone, where the
                bar at the bottom is the way around and a header full of
                field is a header with no room for the page in it. */}
            {search && (
              <form action="/admin/search" className="hidden sm:block">
                <input
                  name="q"
                  placeholder="Search orders, people, items…"
                  aria-label="Search everything in admin"
                  className="field min-h-[42px] w-[248px] border-[1.5px] border-line bg-paper px-3 py-0 text-[14.5px]"
                />
              </form>
            )}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
