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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...READERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}/sitemap.xml`,
    // Not a standard robots field, and harmless where it is not understood.
    // A reader that does understand it is pointed straight at the plain-text
    // answer rather than left to infer the shop from a menu page.
    host: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}`,
  };
}
