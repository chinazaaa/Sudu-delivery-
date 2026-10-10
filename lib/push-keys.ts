/**
 * The one bit of key handling a browser has to do itself.
 *
 * `pushManager.subscribe` wants the VAPID public key as raw bytes, and the
 * key is published as URL-safe base64, which is the ordinary alphabet with
 * two characters swapped and the padding left off. Browsers have no built-in
 * that reads that, so it is written out here.
 *
 * In a file of its own, with no imports, because it is needed inside a client
 * component and lib/admin-alerts pulls in web-push and the database.
 */
export function urlBase64ToBytes(value: string): Uint8Array {
  // Padded back up to a multiple of four, because atob refuses anything else.
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const plain = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(plain);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);
  return bytes;
}

/**
 * Whether this browser can do any of it at all.
 *
 * Three separate things have to be present, and on an iPhone none of them is
 * until the site has been added to the Home Screen and opened from there.
 * Asked as one question so the control can say so rather than failing on a
 * tap with nothing on the screen.
 */
export function pushPossible(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Whether the page is running as an installed app rather than in a tab.
 *
 * This is the whole of what iOS cares about: in Safari the push APIs are not
 * there at all, and from the Home Screen they are. Checked both ways because
 * the standalone flag is Apple's own and the display-mode query is everyone
 * else's.
 */
export function installed(): boolean {
  if (typeof window === "undefined") return false;
  const apple = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return apple || window.matchMedia("(display-mode: standalone)").matches;
}

/** An iPhone or an iPad, which is the only place the Home Screen rule bites. */
export function isApple(ua: string): boolean {
  // An iPad in its desktop guise calls itself a Macintosh, and the word
  // Mobile further along is what gives it away. A real Mac has no Home
  // Screen, so telling somebody on one to add the site to it would only
  // send them looking for a menu that is not there.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua));
}
