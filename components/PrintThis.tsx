"use client";

/**
 * The button that turns the page into a PDF.
 *
 * The browser's own print dialogue, which on every phone and laptop has
 * "Save as PDF" in it and, on a phone, a share sheet straight after. No
 * library, no server rendering a second copy of the document that can
 * drift from the first: what somebody sends their parents is exactly what
 * is on the screen.
 *
 * It takes itself out of the printed copy, along with everything else
 * marked no-print.
 */
export default function PrintThis({ said = "Save as PDF" }: { said?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary no-print border-2 border-ink"
    >
      {said}
    </button>
  );
}
