"use client";

import { useRef, useState } from "react";

/**
 * A photograph off a phone, made small enough to actually arrive.
 *
 * Vercel refuses a request body over about four and a half megabytes before
 * any of our code runs, and an iPhone photograph is routinely five to eight.
 * The browser reports that as "Load failed", which looks like the network
 * and is really the picture, so the menu editor's Save appeared to break at
 * random depending on which photograph somebody had chosen.
 *
 * So it is shrunk here, in the browser, before the form is posted: the long
 * edge down to something a phone screen can use, and JPEG quality down to
 * where nobody can tell. A three thousand pixel photograph of a plate of
 * rice is not a better photograph of a plate of rice, it is the same one,
 * slower.
 *
 * Anything it cannot read, HEIC on an old browser among them, is left
 * exactly as it was: a photograph that might be too big is better than no
 * photograph and a broken form.
 */

/** The longest edge we keep. Twice what the biggest card draws it at. */
const EDGE = 1600;
/** Under this and there is nothing worth doing. */
const ALREADY_SMALL = 600 * 1024;

const kb = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

async function smaller(file: File): Promise<File | null> {
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const paper = canvas.getContext("2d");
    if (!paper) return null;
    paper.drawImage(image, 0, 0, width, height);
    image.close?.();

    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob((made) => done(made), "image/jpeg", 0.82)
    );
    if (!blob) return null;

    // A picture that came out bigger is a picture to leave alone.
    if (blob.size >= file.size) return null;

    const stem = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${stem}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export default function PhotoField({
  name,
  id,
  className = "field",
}: {
  name: string;
  id?: string;
  className?: string;
}) {
  const box = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={box}
        id={id}
        name={name}
        type="file"
        accept="image/*"
        className={className}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file || !file.type.startsWith("image/")) {
            setSaid("");
            return;
          }
          if (file.size <= ALREADY_SMALL) {
            setSaid(`${kb(file.size)}, small enough already.`);
            return;
          }

          setBusy(true);
          setSaid("Making it smaller…");
          const made = await smaller(file);
          setBusy(false);

          if (!made) {
            setSaid(
              `${kb(file.size)}. Could not shrink this one, so it goes up as it is.`
            );
            return;
          }

          // Put it back where the form will find it. A DataTransfer is the
          // only way to write to a file input, and it works everywhere this
          // shop is opened from.
          try {
            const swap = new DataTransfer();
            swap.items.add(made);
            if (box.current) box.current.files = swap.files;
            setSaid(`${kb(file.size)} → ${kb(made.size)}.`);
          } catch {
            setSaid(`${kb(file.size)}, going up as it is.`);
          }
        }}
      />
      {said !== "" && (
        <p className={`mt-1 text-xs ${busy ? "text-brand-dark" : "text-muted"}`}>
          {said}
        </p>
      )}
    </>
  );
}
