/**
 * Where to send somebody who needs a person.
 *
 * wa.me wants international digits: no plus, no spaces, and no leading
 * zero. A Nigerian number is written 0903 217 5147 and is typed into admin
 * that way, so every link built from it has to rewrite it first. Three
 * screens in this app were stripping the punctuation and nothing else,
 * which produced wa.me/09032175147: a number WhatsApp cannot place, so the
 * tap opened a dead end. The website has always done the swap, in
 * lib/messages.ts, and this is the same rule for the app so the two cannot
 * drift.
 *
 * The country code is only added to a number that begins with a zero.
 * Anything already in international form is left exactly as it is, so a
 * shop that types 234… into admin, or moves abroad, still works.
 */
export function whatsappTo(phone: string, message = ""): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits === "") return "";

  const international = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
  return message === ""
    ? `https://wa.me/${international}`
    : `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
