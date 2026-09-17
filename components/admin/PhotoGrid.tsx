"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { matchPhotos } from "@/lib/match";

type Row = { id: string; name: string; imageUrl: string };
type State = "idle" | "working" | "done" | "failed";

/**
 * Photograph a whole menu in one sitting.
 *
 * Pick a picture against an item and it uploads on its own: no save button,
 * no losing twenty choices because one failed. Each one is shrunk in the
 * browser first, because a modern phone takes a four megabyte photograph and
 * the menu only ever shows it at a couple of hundred pixels.
 */
export default function PhotoGrid({ items }: { items: Row[] }) {
  const [shots, setShots] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.id, i.imageUrl]))
  );
  const [state, setState] = useState<Record<string, State>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [spare, setSpare] = useState<File[]>([]);
  const many = useRef<HTMLInputElement>(null);

  async function send(item: Row, file: File) {
    setState((s) => ({ ...s, [item.id]: "working" }));
    setErrors((e) => ({ ...e, [item.id]: "" }));

    // Show it straight away, so the grid fills in as you work.
    const preview = URL.createObjectURL(file);
    setShots((s) => ({ ...s, [item.id]: preview }));

    try {
      const shrunk = await shrink(file);
      const body = new FormData();
      body.set("item_id", item.id);
      body.set("photo", shrunk);

      const response = await fetch("/api/admin/photo", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Upload failed.");

      setShots((s) => ({ ...s, [item.id]: result.url as string }));
      setState((s) => ({ ...s, [item.id]: "done" }));
    } catch (cause) {
      setShots((s) => ({ ...s, [item.id]: item.imageUrl }));
      setState((s) => ({ ...s, [item.id]: "failed" }));
      setErrors((e) => ({
        ...e,
        [item.id]: cause instanceof Error ? cause.message : "Upload failed.",
      }));
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  /**
   * Many at once, matched on the filename. Whatever we cannot place with
   * confidence is listed for a person to put right, rather than guessed at.
   */
  async function sendMany(files: File[]) {
    const found = matchPhotos(
      files.map((f) => f.name),
      items.map((i) => ({ id: i.id, name: i.name }))
    );

    const byName = new Map(files.map((f) => [f.name, f]));
    const byId = new Map(items.map((i) => [i.id, i]));

    setSpare(
      found
        .filter((m) => !m.confident)
        .map((m) => byName.get(m.file))
        .filter((f): f is File => Boolean(f))
    );

    // One at a time: twenty photographs at once on mall wifi is twenty
    // timeouts.
    for (const match of found) {
      const file = byName.get(match.file);
      const item = match.itemId ? byId.get(match.itemId) : undefined;
      if (file && item) await send(item, file);
    }
  }

  const done = items.filter((i) => state[i.id] === "done").length;

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <h2 className="font-extrabold">Upload a folder at once</h2>
        <p className="text-sm text-muted">
          Name each picture after the item, like{" "}
          <span className="font-semibold">BBQ Chicken.jpg</span>, then pick them
          all. Anything we cannot place for certain is listed underneath for you
          to drop on the right item yourself.
        </p>
        <input
          ref={many}
          type="file"
          accept="image/*"
          multiple
          className="field"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void sendMany(files);
          }}
        />
      </div>

      {spare.length > 0 && (
        <div className="card space-y-3 border-amber-300 bg-amber-50">
          <h3 className="font-bold">
            {spare.length} picture{spare.length === 1 ? "" : "s"} we could not
            place
          </h3>
          <p className="text-sm text-muted">
            Look at each one and type the item it belongs to. A picture is
            easier to place by eye than by filename.
          </p>
          {spare.map((file) => (
            <Spare
              key={file.name}
              file={file}
              items={items}
              onPick={(item) => {
                setSpare((rest) => rest.filter((f) => f !== file));
                void send(item, file);
              }}
            />
          ))}
        </div>
      )}

      {done > 0 && (
        <p className="rounded-xl bg-mint/15 px-3 py-2 text-sm font-semibold text-ink">
          {done} photo{done === 1 ? "" : "s"} saved. They are live on the menu now.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <Cell
            key={item.id}
            item={item}
            src={shots[item.id]}
            state={state[item.id] ?? "idle"}
            error={errors[item.id]}
            onPick={(file) => send(item, file)}
          />
        ))}
      </div>
    </div>
  );
}

function Cell({
  item,
  src,
  state,
  error,
  onPick,
}: {
  item: Row;
  src: string;
  state: State;
  error?: string;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-black/[0.03] ${
          state === "done"
            ? "border-mint"
            : state === "failed"
              ? "border-rose-400"
              : "border-black/10"
        }`}
      >
        {src ? (
          // Storage and blob URLs both, so the plain tag rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-3xl text-muted">+</span>
        )}

        {state === "working" && (
          <span className="absolute inset-0 grid place-items-center bg-white/75 text-sm font-semibold">
            Uploading…
          </span>
        )}
        {state === "done" && (
          <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-mint text-sm font-bold text-white">
            ✓
          </span>
        )}
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          // So picking the same file twice still fires.
          event.target.value = "";
        }}
      />

      <p className="text-xs font-semibold leading-tight">{item.name}</p>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const EDGE = 1200;

/**
 * Down to something a phone can upload on mall wifi. If the browser cannot do
 * it, the original goes up instead: a slow upload beats no photograph.
 */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 400_000) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

/**
 * One picture nobody could place, with the item list narrowed as you type.
 * Sixty items in a dropdown is worse than no dropdown, and scrolling one on a
 * phone while holding the picture in your head is worse still.
 */
function Spare({
  file,
  items,
  onPick,
}: {
  file: File;
  items: Row[];
  onPick: (item: Row) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const preview = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? items.filter((item) => {
        const name = item.name.toLowerCase();
        return words.every((word) => name.includes(word));
      })
    : items;

  return (
    <div className="rounded-xl bg-white/70 p-2">
      <div className="flex items-center gap-2">
        <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-black/5">
          {/* A blob URL, so the plain tag rather than next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="size-full object-cover" />
        </span>
        <div className="min-w-0 grow">
          <p className="truncate text-xs text-muted">{file.name}</p>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) {
                event.preventDefault();
                onPick(matches[0]);
              }
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="Type to find the item"
            className="field mt-1 py-1.5 text-sm"
          />
        </div>
      </div>

      {open && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {matches.slice(0, 40).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-black/5"
              >
                <span className="size-8 shrink-0 overflow-hidden rounded bg-black/5">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 grow truncate font-semibold">{item.name}</span>
                {item.imageUrl && (
                  <span className="shrink-0 text-xs text-muted">has one</span>
                )}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted">
              Nothing on this menu matches that.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
