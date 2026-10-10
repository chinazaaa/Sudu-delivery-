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
}: {
  title: string;
  /** The sentence under the title. A node, because several pages want a
   *  figure or a link inside it. */
  detail?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
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
        {actions && (
          /* Full width on a phone, where three buttons side by side ran off
             the screen and took the whole page sideways with them. */
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
