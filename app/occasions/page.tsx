import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The old second shelf.
 *
 * Collections and occasions are one page now, so every link ever sent for
 * this one goes there instead. Permanent, so a search engine moves the
 * ranking across rather than keeping two pages that say the same thing.
 */
export default function OccasionsPage(): never {
  permanentRedirect("/collections");
}
