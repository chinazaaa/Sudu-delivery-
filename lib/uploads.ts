import { randomUUID } from "crypto";
import { db } from "./supabase";

export const IMAGE_BUCKET = "menu";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photographs go into Supabase Storage rather than being pasted in as links,
 * because the person filling the menu in is standing in a mall with a phone,
 * not hosting images somewhere.
 */
export async function uploadImage(
  file: File | null,
  folder: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;
  if (file.size > MAX_BYTES) return null;

  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const path = `${folder}/${randomUUID()}.${extension}`;

  const { error } = await db()
    .storage.from(IMAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
      /*
       * A year, because the path is a fresh UUID every time.
       *
       * The picture at a given address here can never change: a new
       * photograph is a new upload at a new path, and the old one is either
       * still true or no longer pointed at. There is nothing a short cache
       * protects against, and the default hour costs the shop real money.
       *
       * Every browser and every edge of the CDN was re-fetching all 360MB
       * of the menu's photographs once an hour. That, and nothing else, is
       * what put this project at 228% of its egress allowance: eleven
       * gigabytes served out of three hundred and sixty megabytes of
       * distinct images, which is the whole library sent out thirty-odd
       * times over.
       */
      cacheControl: "31536000",
    });
  if (error) throw new Error(`Could not upload that image: ${error.message}`);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

/** A file input's value, when the form may not carry one. */
export function fileFrom(form: FormData, field: string): File | null {
  const value = form.get(field);
  return value instanceof File ? value : null;
}
