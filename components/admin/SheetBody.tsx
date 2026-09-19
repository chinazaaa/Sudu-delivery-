"use client";

import { useState } from "react";

/**
 * The working behind a run, folded away once its books are closed.
 *
 * A finished run should read as a record of what it came to, not as a page of
 * controls for work that is done. The controls are all still here, one tap
 * away, because a closed run is sometimes exactly what somebody needs to look
 * inside.
 */
export default function SheetBody({
  settled,
  children,
}: {
  settled: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!settled) return <>{children}</>;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="btn-quiet w-full px-4 py-2.5 text-sm"
      >
        {open ? "Hide the full sheet" : "Show the full sheet"}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
