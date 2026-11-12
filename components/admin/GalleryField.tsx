"use client";

import { useState } from "react";

/**
 * A list of photos you can add to and take from: pick pictures from the
 * phone and they upload at once; the list is saved with the form's own Save
 * button, as one address per line.
 */
export default function GalleryField({
  name,
  initial,
}: {
  name: string;
  initial: string[];
}) {
  const [photos, setPhotos] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.set("photo", file);
      try {
        const reply = await fetch("/api/admin/upload", { method: "POST", body });
        const data = (await reply.json()) as { url?: string; error?: string };
        if (data.url) added.push(data.url);
        else setError(data.error ?? "One photo did not upload.");
      } catch {
        setError("One photo did not upload.");
      }
    }
    setPhotos((was) => [...was, ...added]);
    setBusy(false);
  };

  const move = (at: number, by: number) =>
    setPhotos((was) => {
      const to = at + by;
      if (to < 0 || to >= was.length) return was;
      const next = [...was];
      [next[at], next[to]] = [next[to], next[at]];
      return next;
    });

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={photos.join("\n")} />
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((src, at) => (
          <li key={`${src}-${at}`} className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="aspect-[3/4] w-full rounded-lg border-2 border-ink object-cover"
            />
            <div className="flex justify-between gap-1 text-xs font-bold">
              <button type="button" onClick={() => move(at, -1)} aria-label="Move earlier">
                ←
              </button>
              <button
                type="button"
                onClick={() => setPhotos((was) => was.filter((_, i) => i !== at))}
                className="text-red-700 underline"
              >
                Remove
              </button>
              <button type="button" onClick={() => move(at, 1)} aria-label="Move later">
                →
              </button>
            </div>
          </li>
        ))}
      </ul>
      <label className="btn-quiet inline-block cursor-pointer px-4 py-2 text-sm">
        {busy ? "Uploading…" : "Add photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            void add(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {error !== "" && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <p className="hint">Photos upload as soon as you pick them. Press Save to put them on the page.</p>
    </div>
  );
}
