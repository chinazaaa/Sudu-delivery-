"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The receipt as a sheet of paper, the same on a phone as on a desk.
 *
 * It used to reflow to whatever the screen was, so on a phone it was a
 * squeezed column with the "delivered to" block wrapping oddly, and a
 * screenshot of it looked nothing like the PDF. Here it is laid out once, at
 * a fixed paper width in A4 proportions, and the whole sheet is scaled down
 * to fit the screen. A screenshot is then the document, and the PDF is the
 * same document.
 *
 * Scaled with a transform rather than `zoom`, which some phone browsers
 * apply to the box and not to the type inside it.
 *
 * On paper none of this applies: the print rules in globals.css put it back
 * to the printer's own page.
 */
const PAPER = 560;

export default function ReceiptSheet({ children }: { children: React.ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0, left: 0 });

  useEffect(() => {
    const outer = holder.current;
    const inner = paper.current;
    if (!outer || !inner) return;
    const measure = () => {
      const scale = Math.min(1, outer.clientWidth / PAPER);
      setFit({
        scale,
        height: inner.offsetHeight * scale,
        left: Math.max(0, (outer.clientWidth - PAPER * scale) / 2),
      });
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(outer);
    watch.observe(inner);
    return () => watch.disconnect();
  }, []);

  return (
    <div
      ref={holder}
      className="receipt-holder"
      style={{ height: fit.height || undefined }}
    >
      <div
        ref={paper}
        className="receipt-paper"
        style={{
          width: PAPER,
          transform: `scale(${fit.scale})`,
          transformOrigin: "top left",
          position: "relative",
          left: fit.left,
          WebkitTextSizeAdjust: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
