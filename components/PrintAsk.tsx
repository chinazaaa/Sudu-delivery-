"use client";

import { useRef, useState } from "react";
import AskForm from "@/components/AskForm";
import PrintCatalogue from "@/components/PrintCatalogue";
import type { PrintGroup } from "@/lib/printing";

/**
 * The printing page's asking half: a form, and a catalogue that fills it.
 *
 * They have to be one component because tapping a thing two hundred rows
 * down has to put its name in the box at the top. Without that the
 * catalogue is a brochure: somebody reads "Roll Up Banner", scrolls back
 * up, and types "roll up banner" again.
 */
export default function PrintAsk({
  groups,
  photos,
  hostels,
  whatsapp,
  opening,
  label,
  chips,
  preset,
  here,
  attach,
}: {
  groups: PrintGroup[];
  photos: Record<string, string>;
  hostels: string[];
  whatsapp: string;
  opening: string;
  label: string;
  chips: string[];
  preset: string;
  attach?: { label: string; accept: string; hint: string };
  /** This page's own address, so a quote links back to the exact item. */
  here: string;
}) {
  const [picked, setPicked] = useState(preset);
  const form = useRef<HTMLDivElement | null>(null);

  return (
    <div className="space-y-8">
      <section className="space-y-3" ref={form}>
        <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
          Tell us what you need
        </h2>
        <AskForm
          hostels={hostels}
          whatsapp={whatsapp || null}
          preset={picked}
          chips={chips}
          opening={opening}
          label={label}
          lead="Tell us what you need and we come back with a price. Nothing happens until you say yes."
          send="Request a quote"
          fileLabel={attach?.label}
          fileAccept={attach?.accept}
          fileHint={attach?.hint}
        />
      </section>

      <PrintCatalogue
        groups={groups}
        photos={photos}
        whatsapp={whatsapp}
        here={here}
        onPick={(name) => {
          setPicked(`${name}: `);
          form.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </div>
  );
}
