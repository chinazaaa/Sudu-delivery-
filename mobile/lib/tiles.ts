/**
 * The five colours a kitchen tile rotates through.
 *
 * Ours, never the restaurant's own. A tile in KFC's red with KFC's name on
 * it is a shop claiming a relationship it does not have, and we are a
 * courier rather than a franchise. The same five, in the same order, as the
 * website.
 *
 * By position rather than by name, so a row is five colours in order rather
 * than three yellows in a line.
 */
import { T } from "./theme";

export const TILES = [
  { bg: T.volt, text: T.ink },
  { bg: T.brand, text: T.paper },
  { bg: T.ink, text: T.shell },
  { bg: T.tint, text: T.ink },
  { bg: T.mint, text: T.paper },
] as const;

export const tileAt = (at: number) => TILES[at % TILES.length];
