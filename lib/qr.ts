import QRCode from "qrcode";

/**
 * A square somebody can point a phone at.
 *
 * Drawn on the server and sent as part of the page, because it never
 * changes: the App Store address is the same for everybody, and generating
 * it in the browser would mean shipping a whole encoder to do it.
 *
 * It is how a laptop hands something to a phone. Everything else asks
 * somebody to type an address, email it to themselves, or remember to look
 * later, and remembering to look later is the one that never happens.
 */
export async function qrSvg(text: string): Promise<string> {
  if (!text) return "";
  try {
    return await QRCode.toString(text, {
      type: "svg",
      margin: 0,
      width: 132,
      // Black on nothing, so the card's own paper shows through and it sits
      // in a theme rather than on a white tile.
      color: { dark: "#121212", light: "#0000" },
    });
  } catch {
    // A card without a square is still a card that says there is an app.
    return "";
  }
}
