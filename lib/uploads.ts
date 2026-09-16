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
