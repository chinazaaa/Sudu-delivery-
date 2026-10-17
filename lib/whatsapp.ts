/**
 * A wa.me link, from a number as somebody typed it.
 *
 * Here on its own because a form has to build one in the browser, out of
 * whatever has been typed into it so far, and the settings module reads
 * the database: importing it for one line of string work would drag the
 * database into the page.
 *
 * The message is written for them and sent by them. Nothing anywhere in
 * this shop messages anybody on somebody else's behalf; this only opens
 * the chat with the words already in the box.
 */
export function waLink(
  number: string | null | undefined,
  message: string
): string | null {
  const digits = String(number ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  // A Nigerian number written the way everybody writes it, 0801…, is +234
  // with the nought taken off. Anything already international is left.
  const international = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
