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

/** Where a request's attachment lives. Private: nothing here is servable. */
export const ASK_BUCKET = "asks";
const ASK_MAX = 15 * 1024 * 1024;

/**
 * Anything somebody attaches to a request: a photograph, or the document
 * they want printed.
 *
 * Into a private bucket, and what comes back is a path rather than a URL,
 * because there is no URL: the menu bucket is public, which is right for a
 * photograph of a burger and wrong for an unsubmitted thesis. A project
 * sitting at a public address before it is marked is a plagiarism risk we
 * would have created ourselves.
 */
const ASK_TYPES = [
  "image/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-powerpoint",
  "text/plain",
];

export async function uploadAsk(
  file: File | null,
  folder: string
): Promise<{ path: string; error: string }> {
  if (!file || file.size === 0) return { path: "", error: "" };
  if (!ASK_TYPES.some((one) => file.type.startsWith(one))) {
    return { path: "", error: "That file type is not one we can take. Send it on WhatsApp." };
  }
  if (file.size > ASK_MAX) {
    return {
      path: "",
      error: "That file is over 15MB, which is more than this form can take. Send it on WhatsApp instead.",
    };
  }

  const extension = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 5);
  const path = `${folder}/${randomUUID()}.${extension}`;
  const { error } = await db()
    .storage.from(ASK_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) return { path: "", error: "Could not attach that. Send it on WhatsApp instead." };
  return { path, error: "" };
}

/**
 * A link to one of those, good for an hour.
 *
 * Long enough to open it and short enough that a link pasted somewhere by
 * accident stops working on its own.
 */
export async function askFileLink(path: string): Promise<string> {
  if (path === "") return "";
  const { data } = await db().storage.from(ASK_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}
