import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Whether a webhook really came from the provider that claims to send it.
 *
 * Resend signs with Svix, which is a scheme rather than a service you have
 * to call: the id, the timestamp and the exact bytes of the body are joined
 * with full stops, run through HMAC-SHA256 with the secret, and the result
 * is sent in a header. Doing it here rather than with their package keeps a
 * dependency out of a route that only needs thirty lines of standard
 * library.
 *
 * The body has to be the raw text as it arrived. Parsing it to JSON and
 * stringifying it back changes the spacing and the key order, and signs
 * something the sender never sent.
 */
export function svixSigned(args: {
  secret: string;
  id: string;
  timestamp: string;
  /** The exact bytes of the request body, unparsed. */
  body: string;
  /** The svix-signature header, which may carry several space-separated
   *  signatures while a secret is being rotated. */
  signature: string;
  /** How far out of date a request may be, in seconds. Five minutes is what
   *  the scheme suggests, and it is what stops somebody replaying a request
   *  they captured an hour ago. */
  tolerance?: number;
  now?: number;
}): boolean {
  const { secret, id, timestamp, body, signature } = args;
  if (!secret || !id || !timestamp || !body || !signature) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const now = args.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - sentAt) > (args.tolerance ?? 300)) return false;

  // The secret is base64 after its prefix. Using the prefixed string as the
  // key is the commonest way to get this wrong, and it fails silently in
  // the sense that nothing ever verifies.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;

  const mine = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();

  // Any one of them matching is enough: two are sent while a secret is
  // being rotated, and both are the provider's.
  return signature
    .split(" ")
    .filter((one) => one.startsWith("v1,"))
    .some((one) => {
      const theirs = Buffer.from(one.slice(3), "base64");
      // Lengths must match before a constant-time compare will look at
      // them, and a wrong length is a wrong signature anyway.
      return theirs.length === mine.length && timingSafeEqual(theirs, mine);
    });
}
