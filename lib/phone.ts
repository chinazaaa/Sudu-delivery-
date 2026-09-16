/**
 * The phone number is the customer's identity (brief §9 — no accounts), so it
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

/** "0803 123 4567" — easier to check against a transfer narration. */
export function formatPhone(phone: string): string {
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}
