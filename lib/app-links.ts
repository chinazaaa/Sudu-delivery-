/**
 * Where each store lives.
 *
 * Two apps now, addressed two different ways: Apple by a numeric id, Play by
 * the package name. Both written once here so that a "get the app" anywhere
 * on the site cannot drift from the one in the footer.
 */
export const appleLink = (id: string): string => `https://apps.apple.com/app/id${id}`;

export const playLink = (pkg: string): string =>
  `https://play.google.com/store/apps/details?id=${pkg}`;

/** The one address that works on any phone, and on a flyer. */
export const BOTH_STORES = "/app";
