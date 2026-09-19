/**
 * Short links, and the reading of them.
 *
 * A link gets pasted into a chat, and thirty-six characters of identifier in
 * the middle of one looks like something has gone wrong. Every order and
 * every group carries a seven character code as well, and a page accepts
 * either: the links already out there in people's messages go on working for
 * ever, because the old identifier is still an answer.
 */

/** Whether this looks like the long identifier rather than a short code. */
export function isLongId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

/** The column a value should be looked up by. */
export function lookupColumn(value: string): "id" | "short" {
  return isLongId(value) ? "id" : "short";
}

/** The shortest link that reaches a thing, with the long one as the fallback
 *  for anything saved before short codes existed. */
export function shortRef(row: { id: string; short?: string | null }): string {
  return row.short?.trim() || row.id;
}
