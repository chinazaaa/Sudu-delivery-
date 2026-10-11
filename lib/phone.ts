/**
 * The phone number is the customer's identity (brief §9, no accounts), so it
 * has to normalise to the same string however it is typed. 0803..., +234803...
 * and 234803... are one person.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local: string;

  if (digits.startsWith("234")) local = "0" + digits.slice(3);
  else if (digits.startsWith("0")) local = digits;
  else if (digits.length === 10) local = "0" + digits;
  else return null;

  return /^0[789]\d{9}$/.test(local) ? local : null;
}

/** "0803 123 4567", easier to check against a transfer narration. */
export function formatPhone(phone: string): string {
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}

/**
 * A number to message somebody on, which is not the same question as the
 * number they order with.
 *
 * The ordering number is the shop's identity for a customer and is always a
 * Nigerian mobile, so normalisePhone above is right to refuse everything
 * else. A WhatsApp number is only an address, and students have numbers
 * from everywhere: a UK number that WhatsApp is actually on is a perfectly
 * good answer, and the first version of this field turned one away.
 *
 * Stored as international digits with no plus, which is the form wa.me
 * wants and the form whatsappTo leaves alone.
 */
export function messagingNumber(raw: string): string | null {
  const said = String(raw ?? "").trim();
  if (said === "") return null;

  // Nigerian, however it was typed: 0803…, +234803… and 234803… are one
  // number, and the existing rule already knows all three.
  const nigerian = normalisePhone(said);
  if (nigerian !== null) return "234" + nigerian.slice(1);

  const digits = said.replace(/[^\d+]/g, "").replace(/^\+/, "");
  // A leading zero on a number that is not Nigerian is a trunk code with no
  // country to pair it with: "07440 419145" could be half the world. Only
  // an explicit country code is accepted.
  //
  // Note that a UK mobile typed without its +44 is shaped exactly like a
  // Nigerian one and is claimed by the rule above, which cannot be helped:
  // the two are the same eleven digits. Nigerian is the right guess for
  // this shop, and the form prints the number it stored underneath, so a
  // wrong guess is visible rather than silent.
  if (digits.startsWith("0")) return null;

  // E.164: a country code and a number, never longer than fifteen digits.
  // Eight is below any real mobile and catches a half-typed one.
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

/**
 * A stored number, written out for somebody to read.
 *
 * Nigerian ones go back to the local form, which is how everybody here
 * says them. Anything else keeps its country code behind a plus, because
 * "447440419145" is not a number anybody can check at a glance.
 */
export function showNumber(stored: string): string {
  const digits = String(stored ?? "").replace(/\D/g, "");
  if (digits === "") return "";
  if (digits.startsWith("234") && digits.length === 13) {
    return formatPhone("0" + digits.slice(3));
  }
  if (/^0[789]\d{9}$/.test(digits)) return formatPhone(digits);
  return "+" + digits;
}
