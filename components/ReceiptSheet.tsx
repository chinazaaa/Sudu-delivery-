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
 * On paper none of this applies: the print rules in globals.css put it back
 * to the printer's own page.
 */
const PAPER = 560;

export default function ReceiptSheet({ children }: { children: React.ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / PAPER));
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <div ref={holder} className="receipt-holder">
      <div className="receipt-paper" style={{ width: PAPER, zoom: scale }}>
        {children}
      </div>
    </div>
  );
}
