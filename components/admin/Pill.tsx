"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";

/*
 * A tab that says it has been tapped.
 *
 * Switching one of these is a whole page fetched again, and however fast
 * that is it is never instant. With nothing to show for the tap, the tab
 * sat there looking exactly as it did before and the natural thing to do
 * was tap it again, which is a second page and twice the wait.
 *
 * So the pill goes dim and loses its tap the moment it is pressed, and
 * comes back when the page it asked for arrives. Next tells us when that
 * is; there is nothing to keep in state here and nothing to go stale.
 */
function Inner({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className={pending ? "opacity-55" : ""}>
      {children}
      {pending && (
        <span
          aria-hidden
          className="ml-1.5 inline-block size-2.5 animate-spin rounded-full border border-current border-t-transparent align-[-1px]"
        />
      )}
    </span>
  );
}

export default function Pill({
  href,
  on,
  children,
}: {
  href: string;
  /** Whether this is the tab being read now. */
  on?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`pill-admin ${on ? "pill-admin-on" : ""}`}>
      <Inner>{children}</Inner>
    </Link>
  );
}
