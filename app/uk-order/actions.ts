"use server";

import { redirect } from "next/navigation";

import { askFor } from "@/lib/requests";
import { fileFrom, uploadAsk } from "@/lib/uploads";
import { tellAdmin } from "@/lib/admin-alerts";
import {
  composeBook,
  composeOther,
  composeShirt,
  composeWhere,
  UK_PATH,
  type Composed,
  type UkKind,
} from "@/lib/uk-requests";

export type UkState = { error: string };

/**
 * A football shirt or a book, asked for.
 *
 * It goes into the same inbox as every custom order, because that is
 * already where a request is read, priced and answered on WhatsApp, and a
 * second list would be a second place to forget to look. What makes it a
 * shirt or a book is the line it is worded into, which the inbox shows.
 *
 * Returns the error rather than throwing it: a throw goes to the error
 * boundary, which loses everything they typed.
 */
export async function sendUkRequest(
  _prev: UkState,
  form: FormData
): Promise<UkState> {
  const said = (name: string) => String(form.get(name) ?? "");
  const kind: UkKind =
    said("kind") === "book" ? "book" : said("kind") === "other" ? "other" : "shirt";

  const composed: Composed =
    kind === "book"
      ? composeBook({ title: said("title"), author: said("author"), format: said("format") })
      : kind === "other"
        ? composeOther({ what: said("what") })
        : composeShirt({
            club: said("club"),
            style: said("style"),
            look: said("look"),
            fit: said("fit"),
            size: said("size"),
          });
  if (!composed.ok) return { error: composed.error };

  // The campus or somewhere else in Lagos, and the one thing each needs.
  const placed = composeWhere({
    where: said("where"),
    hostel: said("hostel"),
    address: said("address"),
    note: said("note"),
  });
  if (!placed.ok) return { error: placed.error };

  // A file too big or of the wrong kind is said out loud rather than
  // swallowed: somebody who attached the shirt they want and was told
  // nothing would believe we had it.
  const attached = await uploadAsk(fileFrom(form, "photo"), "requests");
  if (attached.error !== "") return { error: attached.error };

  const result = await askFor({
    wanted: composed.wanted,
    budget: "",
    name: said("name"),
    phone: said("phone"),
    hostel: placed.hostel,
    note: placed.note,
    filePath: attached.path,
  });
  if (!result.ok) return { error: result.error };

  // After the row exists and never in a way that can fail it.
  try {
    await tellAdmin({
      title:
        kind === "book"
          ? "Book from the UK"
          : kind === "other"
            ? "Something from the UK"
            : "Football shirt",
      body: `${said("name").trim() || "Someone"}: ${composed.wanted}`,
      url: "/admin/requests",
    });
  } catch {
    /* The request is saved either way. */
  }

  redirect(`${UK_PATH[kind]}?sent=1`);
}
