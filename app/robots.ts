import type { MetadataRoute } from "next";

/** Nobody but us needs the admin, the promoter portal, or one person's order. */
const PRIVATE = [
  "/admin",
  "/admin/",
  "/promoter",
  "/o/",
  "/checkout",
  "/cart",
  // A promoter's own link is not a page, it is a doorway that sets a cookie
  // and redirects. Crawling it indexes nothing and only muddies who brought
  // whom, since a crawler is nobody's referral.
  "/s/",
  // One night's names, numbers and blocks, opened by a link somebody is
  // driving with. There is nothing here for a search engine and a great
  // deal here for anybody else.
  "/run/",
];

/**
 * The readers that answer questions about shops.
 *
 * They were already allowed, because the rule for everybody allows
 * everything but the private pages. They are named anyway: a crawler that
 * finds its own name is never left deciding what a wildcard meant about it,
 * and somebody reading this file can see at a glance that being read by an
 * assistant is wanted rather than tolerated.
 */
const READERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

/**
 * The one crawler told to go away, and why.
 *
 * On 27 October 2026 meta-externalads fetched three hundred and forty two
 * thousand pages in half a day, walking every page on the shop about ten
 * thousand five hundred times each. Google managed seven hundred and twenty
 * five in the same window. It took a month's worth of the host's allowance
 * overnight and read nothing it had not already read ten thousand times.
 *
 * It is the crawler Meta points at the landing pages behind its adverts, and
 * it honours this file, which is the civilised way to settle it. The firewall
 * rule alongside this is the uncivilised way, kept because a sign on a door
 * only works on somebody who reads it.
 *
 * Deliberately not facebookexternalhit. That one draws the card when somebody
 * pastes a link into WhatsApp, and this shop lives in WhatsApp: turning it
 * away would cost far more than the bandwidth ever did.
 */
const TOO_MUCH = ["meta-externalads"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...TOO_MUCH.map((userAgent) => ({ userAgent, disallow: "/" })),
      ...READERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}/sitemap.xml`,
    // Not a standard robots field, and harmless where it is not understood.
    // A reader that does understand it is pointed straight at the plain-text
    // answer rather than left to infer the shop from a menu page.
    host: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}`,
  };
}
