import Link from "next/link";

/**
 * A page with nothing on it yet.
 *
 * An empty page is the first thing a lot of people see, so it should say what
 * belongs here and give them one thing to do, rather than leave a line of
 * grey text floating at the top of a screen of nothing.
 */
export default function Empty({
  icon,
  title,
  children,
  href,
  action,
}: {
  icon: "bag" | "repeat" | "cart";
  title: string;
  children: React.ReactNode;
  href: string;
  action: string;
}) {
  return (
    <div className="card flex flex-col items-center px-5 py-9 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-brand-tint text-brand">
        {icon === "bag" ? <BagIcon /> : icon === "cart" ? <CartIcon /> : <RepeatIcon />}
      </span>

      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{children}</p>

      <Link href={href} className="btn-primary mt-5 px-6">
        {action}
      </Link>
    </div>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
      aria-hidden
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
      aria-hidden
    >
      <path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.5L20.5 7H6" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
      aria-hidden
    >
      <path d="M4 10a7 7 0 0 1 12-4l3 3" />
      <path d="M19 4v5h-5" />
      <path d="M20 14a7 7 0 0 1-12 4l-3-3" />
      <path d="M5 20v-5h5" />
    </svg>
  );
}
