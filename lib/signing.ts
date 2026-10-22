/**
 * The key that signs who somebody is.
 *
 * Customers and promoters carry a signed cookie saying which number they
 * are. That signature was made with ADMIN_PASSWORD, which is the password
 * that opens the shop's board, and one secret was doing two jobs across
 * two different kinds of trust.
 *
 * Nothing was exploitable through it. What it meant in practice was worse
 * in a quieter way: changing the admin password, which is a thing somebody
 * should be able to do on a bad afternoon without thinking about it,
 * silently signed out every customer in the shop. A security measure with
 * a surprise attached is a security measure nobody takes.
 *
 * So there is a key of its own. Falling back to the admin password when it
 * is unset is the whole reason this can ship on a Tuesday: every cookie
 * already out there keeps working, because the key is still the same
 * value, and the split sits dormant until somebody sets TOKEN_SECRET.
 *
 * Setting it is the moment customers and promoters sign in again, once,
 * with the PIN they already have. Worth doing on a quiet morning rather
 * than with a car on the road.
 */
export function signingKey(
  tokenSecret: string | undefined | null,
  adminPassword: string | undefined | null
): string {
  const own = String(tokenSecret ?? "").trim();
  if (own !== "") return own;

  /*
   * Whitespace counts as unset, deliberately.
   *
   * An environment variable set to a space is the shape a mistake takes in
   * a dashboard: somebody pasting into the wrong box, or a trailing
   * newline surviving a copy. Signing every identity in the shop with " "
   * is a worse answer than carrying on with the key that already works.
   */
  const shared = String(adminPassword ?? "").trim();
  if (shared !== "") return shared;

  throw new Error(
    "TOKEN_SECRET or ADMIN_PASSWORD must be set. See .env.example."
  );
}

/** The key, read from the environment. */
export function tokenKey(): string {
  return signingKey(process.env.TOKEN_SECRET, process.env.ADMIN_PASSWORD);
}
